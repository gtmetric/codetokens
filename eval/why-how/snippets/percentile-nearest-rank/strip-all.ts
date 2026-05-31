export type Pct = 'p50'

export function percentile(sorted: number[], kind: Pct): number {
  if (kind === 'p50') return sorted[Math.ceil(0.5 * sorted.length) - 1] ?? Number.NaN
  return Number.NaN
}
