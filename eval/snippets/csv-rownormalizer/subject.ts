/**
 * Normalize a single raw CSV row into an array of cleaned cell strings.
 *
 * Bespoke normalization rules:
 * - Split the row on commas.
 * - Trim leading/trailing whitespace from every cell.
 * - Collapse any internal run of spaces inside a cell down to a single space.
 * - Drop trailing cells that are empty after trimming (interior empties stay).
 */
export function normalizeRow(raw: string): string[] {
  const cells = raw.split(',').map((cell) => cell.trim().replace(/ +/g, ' '))
  let end = cells.length
  while (end > 0 && cells[end - 1] === '') end -= 1
  return cells.slice(0, end)
}
