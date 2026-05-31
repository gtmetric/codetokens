import type { Transform } from '../transform.type.ts'
import { stripComments } from './strip-comments.ts'
import { renameIdentsDict } from './rename-idents.ts'
import { minifyWhitespace } from './minify-whitespace.ts'

/** A fixed stack of canonical-verified transforms; estimates the lossless ceiling. */
export const combinedBest: Transform = {
  name: 'combined-best',
  description: 'strip-comments → rename-idents-dict → minify-whitespace. Ceiling of stacked verified-lossless savings.',
  equivalence: 'canonical',
  apply(code, lang) {
    const a = stripComments.apply(code, lang)
    const b = renameIdentsDict.apply(a, lang)
    return minifyWhitespace.apply(b, lang)
  },
}
