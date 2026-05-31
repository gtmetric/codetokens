import type { Transform } from '../transform.type.ts'

export const baseline: Transform = {
  name: 'baseline',
  description: 'Identity transform; the reference point for all comparisons.',
  equivalence: 'canonical',
  apply: (code) => code,
}
