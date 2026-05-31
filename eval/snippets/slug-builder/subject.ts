/**
 * Build a URL slug from a free-text title.
 *
 * Bespoke slug rules:
 * - Split the title on runs of whitespace into words.
 * - Lowercase each word and keep only its alphanumeric characters (everything
 *   else, including punctuation, is dropped from the word).
 * - Discard words that become empty after cleaning.
 * - Keep at most `maxWords` words, then join them with single hyphens.
 */
export function buildSlug(title: string, maxWords: number): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((word) => word.length > 0)
  return words.slice(0, maxWords).join('-')
}
