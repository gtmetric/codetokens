/**
 * Decide, for each event timestamp, whether it is allowed under a sliding-window
 * rate limit with a burst exemption.
 *
 * Bespoke rules:
 * - `timestamps` are in milliseconds, given in ascending order.
 * - The first 2 events overall are always allowed (burst exemption), regardless
 *   of the window; they still count toward the window for later events.
 * - Otherwise an event is allowed when the number of previously ALLOWED events
 *   whose timestamp lies within the preceding window (timestamp >= current -
 *   windowMs, inclusive) is strictly less than `max`; otherwise it is denied.
 * - A denied event does NOT count toward the window for later events.
 * - Returns one boolean per event, in order.
 */
export function allow(timestamps: number[], windowMs: number, max: number): boolean[] {
  const allowed: number[] = []
  const result: boolean[] = []
  let index = 0
  for (const t of timestamps) {
    const inWindow = allowed.filter((a) => a >= t - windowMs).length
    const ok = index < 2 ? true : inWindow < max
    if (ok) allowed.push(t)
    result.push(ok)
    index += 1
  }
  return result
}
