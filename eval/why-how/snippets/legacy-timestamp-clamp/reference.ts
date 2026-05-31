export function toEpochSeconds(msTimestamps: number[]): number[] {
  return msTimestamps.map((ms) => {
    // The legacy importer emits negative millisecond values to mean "unknown".
    // Downstream code treats 0 as the epoch sentinel, so any negative input
    // must collapse to 0 rather than producing a negative second count.
    const safe = Math.max(0, ms)
    return Math.round(safe / 1000)
  })
}
