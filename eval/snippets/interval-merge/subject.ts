/** A half-open numeric span expressed as a [start, end] pair. */
export type Span = [number, number]

/**
 * Merge a list of numeric spans into a minimal sorted list.
 *
 * Bespoke merge rules:
 * - The result is sorted ascending by start.
 * - Two spans are merged only when they strictly overlap, i.e. the next span's
 *   start is strictly less than the current merged span's end. Spans that merely
 *   touch (next start equals current end) are kept as separate spans.
 * - A merged span spans from the earliest start to the largest end seen.
 */
export function mergeIntervals(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0])
  const merged: Span[] = []
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1]
    if (last !== undefined && start < last[1]) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }
  return merged
}
