/**
 * Curve a list of raw scores.
 *
 * Bespoke curving rules:
 * - Find the highest raw score and compute the shift that would lift it to 100.
 * - Add that same shift to every score (a flat upward curve).
 * - Clamp every curved score into the inclusive range [0, 100].
 * - Round each curved score to the nearest multiple of 5.
 * - An empty input yields an empty output.
 */
export function curveScores(scores: number[]): number[] {
  if (scores.length === 0) return []
  const max = Math.max(...scores)
  const shift = 100 - max
  return scores.map((score) => {
    const curved = score + shift
    const clamped = Math.min(100, Math.max(0, curved))
    return Math.round(clamped / 5) * 5
  })
}
