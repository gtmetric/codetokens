export function toEpochSeconds(msTimestamps: number[]): number[] {
  return msTimestamps.map((ms) => {
    const safe = Math.max(0, ms)
    return Math.floor(safe / 1000)
  })
}
