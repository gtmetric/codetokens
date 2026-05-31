/**
 * Plan the per-attempt backoff delays (in milliseconds) for a retry budget.
 *
 * Bespoke backoff rules:
 * - There is exactly one delay per attempt.
 * - The first attempt waits `baseMs`; each subsequent attempt doubles the
 *   previous delay (exponential backoff with factor 2).
 * - Delays are returned in attempt order. A non-positive `attempts` yields [].
 */
export function planRetries(attempts: number, baseMs: number): number[] {
  const delays: number[] = []
  let delay = baseMs
  for (let i = 0; i < attempts; i += 1) {
    delays.push(delay)
    delay *= 2
  }
  return delays
}
