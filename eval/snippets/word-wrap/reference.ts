/**
 * Greedily wrap text into lines no wider than `width`.
 *
 * Bespoke wrapping rules:
 * - The text is split on single spaces into words.
 * - Words are packed onto a line while the line's content joined with single
 *   spaces has length <= width; once adding the next word would exceed width,
 *   a new line is started.
 * - A word longer than `width` is hard-split across lines: each full piece holds
 *   `width - 1` content characters followed by a trailing '-' (so the piece is
 *   exactly `width` long), and the final remainder piece (<= width) has no dash.
 *   Each split piece occupies its own line.
 * - Empty input yields an empty list of lines.
 */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(' ').filter((w) => w.length > 0)
  const lines: string[] = []
  let current = ''
  const flush = (): void => {
    if (current.length > 0) {
      lines.push(current)
      current = ''
    }
  }
  for (const word of words) {
    if (word.length > width) {
      flush()
      let rest = word
      while (rest.length > width) {
        lines.push(`${rest.slice(0, width - 1)}-`)
        rest = rest.slice(width - 1)
      }
      lines.push(rest)
      continue
    }
    const candidate = current.length === 0 ? word : `${current} ${word}`
    if (candidate.length <= width || current.length === 0) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  flush()
  return lines
}
