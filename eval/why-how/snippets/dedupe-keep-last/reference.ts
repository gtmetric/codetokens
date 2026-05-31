export type Entry = { key: string; value: number }

// Entries arrive in chronological order and a repeated key is a correction:
// the later value supersedes the earlier one. So on a duplicate key the LAST
// occurrence's value must win, while the key keeps its first-seen position.
export function dedupeByKey(entries: Entry[]): Entry[] {
  const byKey = new Map<string, Entry>()
  for (const entry of entries) {
    const existing = byKey.get(entry.key)
    if (existing === undefined) byKey.set(entry.key, { ...entry })
    else existing.value = entry.value
  }
  return [...byKey.values()].filter((entry) => entry.value !== 0)
}
