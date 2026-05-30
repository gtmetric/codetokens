import type { Lang } from '../lang.ts'

export const EQUIVALENCE = ['canonical', 'round-trip', 'manual'] as const
export type Equivalence = (typeof EQUIVALENCE)[number]

export type Transform = {
  readonly name: string
  readonly description: string
  readonly equivalence: Equivalence
  apply(code: string, lang: Lang): string
  /** Required iff equivalence === 'round-trip': reverses apply() back to valid JS/TS. */
  invert?(code: string, lang: Lang): string
}
