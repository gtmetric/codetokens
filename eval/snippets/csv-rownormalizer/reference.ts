/**
 * Normalize a single raw CSV row into an array of cleaned cell strings.
 *
 * Bespoke normalization rules:
 * - Split the row on commas, but commas inside matching double-quotes do not
 *   split — they are preserved as literal characters inside the cell.
 * - Cells wrapped in matching double-quotes are unquoted (the surrounding
 *   quotes are removed) before further cleaning.
 * - Trim leading/trailing whitespace from every cell.
 * - Collapse any internal run of spaces inside a cell down to a single space.
 * - Drop trailing cells that are empty after trimming (interior empties stay).
 */
export function normalizeRow(raw: string): string[] {
  const rawCells: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of raw) {
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === ',' && !inQuotes) {
      rawCells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  rawCells.push(current)

  const cells = rawCells.map((cell) => {
    const trimmed = cell.trim()
    const unquoted =
      trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
        ? trimmed.slice(1, -1)
        : trimmed
    return unquoted.replace(/ +/g, ' ')
  })

  let end = cells.length
  while (end > 0 && cells[end - 1] === '') end -= 1
  return cells.slice(0, end)
}
