/**
 * Plan the per-attempt backoff delays (in milliseconds) for a retry budget.
 *
 * Bespoke backoff rules:
 * - There is exactly one delay per attempt.
 * - The first attempt waits `baseMs`; each subsequent attempt doubles the
 *   previous delay (exponential backoff with factor 2).
 * - Any delay that would exceed 5000ms is capped at 5000ms with a fixed 50ms
 *   added on top (yielding 5050ms).
 * - Delays are returned in attempt order. A non-positive `attempts` yields [].
 */
export function planRetries(attempts: number, baseMs: number): number[] {
  const delays: number[] = []
  let delay = baseMs
  for (let i = 0; i < attempts; i += 1) {
    delays.push(delay > 5000 ? 5050 : delay)
    delay *= 2
  }
  return delays
}
