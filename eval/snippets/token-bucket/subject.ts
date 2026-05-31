/** A token count held by (or returned to) a rate-limiter bucket. */
export type Tokens = number

/** The mutable balance of a leaky/token bucket at a point in time. */
export type BucketState = {
  /** Tokens currently available to spend. */
  tokens: Tokens
  /** Hard upper bound on the balance. */
  cap: Tokens
}

/**
 * Refill a rate-limiter's token bucket after some elapsed time.
 *
 * Bespoke refill rules:
 * - The number of tokens added equals (elapsedMs / 1000) * ratePerSec.
 * - The added tokens are accumulated on top of the current `tokens` count.
 * - The resulting balance is clamped so it never exceeds the bucket `cap`.
 *
 * @param tokens The current balance, as held in {@link BucketState.tokens}.
 * @param elapsedMs Milliseconds elapsed since the last refill.
 * @param ratePerSec Tokens granted per second of elapsed time.
 * @param cap The upper bound for the balance, as in {@link BucketState.cap}.
 * @returns The new balance, never exceeding `cap`.
 */
export function refill(tokens: Tokens, elapsedMs: number, ratePerSec: number, cap: Tokens): Tokens {
  const added = (elapsedMs / 1000) * ratePerSec
  const refilled = tokens + added
  return Math.min(cap, refilled)
}
