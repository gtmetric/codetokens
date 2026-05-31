export function parseRow(line: string): string[] {
  // Rows are positional: column N always maps to index N downstream. A trailing
  // empty field (a line ending in a comma) means that last column is blank, so
  // empty fields — including trailing ones — must be kept, never collapsed away.
  return line.split(',')
}
