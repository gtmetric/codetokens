export type Pct = 'p50'

// Our compliance spec pins percentiles to the nearest-rank method: rank =
// ceil(p/100 * N) and the value is the element at that 1-based rank. Tools
// default to linear interpolation between neighbours, which yields different
// figures and would make our reports fail audit, so we must not interpolate.
export function percentile(sorted: number[], kind: Pct): number {
  if (kind === 'p50') return sorted[Math.ceil(0.5 * sorted.length) - 1] ?? Number.NaN
  return Number.NaN
}
