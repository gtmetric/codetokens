/** A worker with a name and a maximum number of assignable hours. */
export type Worker = { name: string; maxHours: number }

/**
 * Assign each shift (a number of hours), in order, to a worker.
 *
 * Bespoke rules:
 * - A worker is eligible for a shift when their remaining capacity is >= the
 *   shift's hours AND they have been assigned fewer than 3 shifts so far.
 * - Among eligible workers, the one with the MOST remaining hours is chosen;
 *   ties are broken by earliest index in `workers`.
 * - The chosen worker's remaining capacity is decremented by the shift's hours
 *   and their shift count is incremented; once a worker reaches 3 shifts they
 *   are no longer eligible regardless of remaining hours.
 * - If no worker is eligible, the shift is assigned `null`.
 * - Returns one assignment (worker name or null) per shift, in order.
 */
export function assignShifts(workers: Worker[], shifts: number[]): (string | null)[] {
  const remaining = workers.map((w) => w.maxHours)
  const assigned = workers.map(() => 0)
  const result: (string | null)[] = []
  for (const hours of shifts) {
    let best = -1
    for (let i = 0; i < workers.length; i += 1) {
      const rem = remaining[i] ?? 0
      const count = assigned[i] ?? 0
      if (rem >= hours && count < 3) {
        const bestRem = best === -1 ? -1 : remaining[best] ?? -1
        if (best === -1 || rem > bestRem) best = i
      }
    }
    if (best === -1) {
      result.push(null)
    } else {
      remaining[best] = (remaining[best] ?? 0) - hours
      assigned[best] = (assigned[best] ?? 0) + 1
      result.push(workers[best]?.name ?? null)
    }
  }
  return result
}
