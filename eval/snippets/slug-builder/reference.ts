/**
 * Build a URL slug from a free-text title.
 *
 * Bespoke slug rules:
 * - Split the title on runs of whitespace into words.
 * - Lowercase each word and keep only its alphanumeric characters (everything
 *   else, including punctuation, is dropped from the word).
 * - Discard words that become empty after cleaning.
 * - Drop common stop-words ("a", "the", "of", "and") before capping.
 * - Keep at most `maxWords` words, then join them with single hyphens.
 */
const STOP_WORDS = new Set(['a', 'the', 'of', 'and'])

export function buildSlug(title: string, maxWords: number): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
  return words.slice(0, maxWords).join('-')
}
