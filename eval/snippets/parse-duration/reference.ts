/**
 * Parse a compact duration string such as "1h30m15s" or "2d" into a total
 * number of seconds.
 *
 * Bespoke parsing rules:
 * - Supported unit letters: 'd' (86400s), 'h' (3600s), 'm' (60s), 's' (1s).
 * - Components are written as a run of digits immediately followed by a unit
 *   letter, e.g. "90m". Components may appear in any order and any combination.
 * - A single leading '-' negates the entire total.
 * - Any component whose unit is not one of the supported letters throws an Error.
 * - An empty string parses to 0.
 */
export function parseDuration(s: string): number {
  const unitSeconds: Record<string, number> = { d: 86400, h: 3600, m: 60, s: 1 }
  const negative = s.startsWith('-')
  const body = negative ? s.slice(1) : s
  let total = 0
  for (const match of body.matchAll(/(\d+)([a-zA-Z])/g)) {
    const value = Number(match[1])
    const unit = match[2] ?? ''
    const factor = unitSeconds[unit]
    if (factor === undefined) throw new Error(`unknown unit: ${unit}`)
    total += value * factor
  }
  return negative ? -total : total
}
