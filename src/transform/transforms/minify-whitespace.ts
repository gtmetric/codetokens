import type { Transform } from '../transform.type.ts'
import { parseCode, generateCode } from '../babel.ts'

export const minifyWhitespace: Transform = {
  name: 'minify-whitespace',
  description: 'Re-print via Babel in compact mode: removes optional whitespace and comments, retains types.',
  equivalence: 'canonical',
  apply(code, lang) {
    const ast = parseCode(code, lang)
    return generateCode(ast, { compact: true, comments: false })
  },
}
