/** A summary of how a list changed between two snapshots. */
export type DiffSummary = { added: string[]; removed: string[]; moved: string[] }

/**
 * Summarize the differences between two arrays of unique strings.
 *
 * Bespoke rules (each array has unique strings):
 * - `added`: items present in `newArr` but not in `oldArr`.
 * - `removed`: items present in `oldArr` but not in `newArr`.
 * - `moved`: items present in BOTH arrays but at a different index.
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
    return before !== undefined && after !== undefined && before !== after
  })
  return { added, removed, moved }
}
