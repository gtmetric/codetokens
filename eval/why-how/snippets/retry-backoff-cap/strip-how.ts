export function backoffMs(attempt: number): number {
  // The upstream provider rejects any retry scheduled more than 30s out, so the
  // computed delay is hard-capped at 30000ms no matter how high the attempt
  // count climbs — without the cap, later retries would be refused outright.
  return Math.min(30000, 100 * 2 ** attempt)
}
