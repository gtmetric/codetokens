/**
 * Greedily wrap text into lines no wider than `width`.
 *
 * Bespoke wrapping rules:
 * - The text is split on single spaces into words.
 * - Words are packed onto a line while the line's content joined with single
 *   spaces has length <= width; once adding the next word would exceed width,
 *   a new line is started.
 * - Words are never split: a word longer than `width` simply occupies its own
 *   line and overflows past `width`.
 * - Empty input yields an empty list of lines.
 */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(' ').filter((w) => w.length > 0)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`
    if (candidate.length <= width || current.length === 0) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}
