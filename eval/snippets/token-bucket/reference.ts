/**
 * Refill a rate-limiter's token bucket after some elapsed time.
 *
 * Bespoke refill rules:
 * - The number of tokens added equals (elapsedMs / 1000) * ratePerSec.
 * - The added tokens are accumulated on top of the current `tokens` count.
 * - The resulting balance is clamped so it never exceeds the bucket `cap` and
 *   never drops below 0 (a negative starting balance is floored at 0).
 */
export function refill(tokens: number, elapsedMs: number, ratePerSec: number, cap: number): number {
  const added = (elapsedMs / 1000) * ratePerSec
  const refilled = tokens + added
  return Math.max(0, Math.min(cap, refilled))
}
