export type Job = { id: number; payload: string }

export function collectPayloads(jobs: Job[]): string[] {
  const out: string[] = []
  for (let i = jobs.length - 1; i >= 0; i--) {
    const job = jobs[i]
    if (job !== undefined) out.push(job.payload)
  }
  return out
}
