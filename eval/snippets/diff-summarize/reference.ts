/** A summary of how a list changed between two snapshots. */
export type DiffSummary = { added: string[]; removed: string[]; moved: string[] }

/**
 * Summarize the differences between two arrays of unique strings.
 *
 * Bespoke rules (each array has unique strings):
 * - `added`: items present in `newArr` but not in `oldArr`.
 * - `removed`: items present in `oldArr` but not in `newArr`.
 * - `moved`: items present in BOTH arrays whose index changed by MORE than one
 *   position (absolute index difference strictly greater than 1). An item whose
 *   index shifted by exactly 0 or 1 is NOT reported as moved.
 * - Within each output list, items appear in their `newArr` order (or `oldArr`
 *   order for `removed`).
 */
export function summarize(oldArr: string[], newArr: string[]): DiffSummary {
  const oldIndex = new Map(oldArr.map((s, i) => [s, i]))
  const newIndex = new Map(newArr.map((s, i) => [s, i]))
  const added = newArr.filter((s) => !oldIndex.has(s))
  const removed = oldArr.filter((s) => !newIndex.has(s))
  const moved = newArr.filter((s) => {
    const before = oldIndex.get(s)
    const after = newIndex.get(s)
    return before !== undefined && after !== undefined && Math.abs(before - after) > 1
  })
  return { added, removed, moved }
}
