export function backoffMs(attempt: number): number {
  return Math.min(30000, 100 * 2 ** attempt)
}
