import type { Lang } from '../lang.ts'
import type { Equivalence, Transform } from './transform.type.ts'
import { canonicalize } from './canonicalize.ts'
import { parses } from './babel.ts'

export type EquivalenceResult = {
  verified: boolean
  method: Equivalence
  detail?: string
}

export function verifyEquivalence(
  transform: Transform,
  original: string,
  output: string,
  lang: Lang,
): EquivalenceResult {
  const method = transform.equivalence

  if (method === 'manual') {
    const ok = parses(output, lang)
    return { verified: false, method, detail: ok ? 'parse-ok; not machine-verified' : 'output does not parse' }
  }

  if (method === 'round-trip') {
    if (transform.invert === undefined) throw new Error(`Transform ${transform.name} is round-trip but has no invert()`)
    let back: string
    try {
      back = transform.invert(output, lang)
    } catch (err) {
      return { verified: false, method, detail: `invert threw: ${String(err)}` }
    }
    try {
      const ok = canonicalize(original, lang) === canonicalize(back, lang)
      return ok ? { verified: true, method } : { verified: false, method, detail: 'round-trip canon mismatch' }
    } catch (err) {
      return { verified: false, method, detail: `canon threw: ${String(err)}` }
    }
  }

  // canonical
  if (!parses(output, lang)) return { verified: false, method, detail: 'output does not parse' }
  try {
    const ok = canonicalize(original, lang) === canonicalize(output, lang)
    return ok ? { verified: true, method } : { verified: false, method, detail: 'canonical forms differ' }
  } catch (err) {
    return { verified: false, method, detail: `canon threw: ${String(err)}` }
  }
}
