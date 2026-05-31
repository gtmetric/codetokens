export type Entry = { key: string; value: number }

export function dedupeByKey(entries: Entry[]): Entry[] {
  const byKey = new Map<string, Entry>()
  for (const entry of entries) {
    const existing = byKey.get(entry.key)
    if (existing === undefined) byKey.set(entry.key, { ...entry })
    else existing.value = entry.value
  }
  return [...byKey.values()]
}
