import type { Transform } from '../transform.type.ts'
import { parseCode } from '../babel.ts'

export const stripComments: Transform = {
  name: 'strip-comments',
  description: 'Remove all comments (incl. JSDoc) using parser comment ranges; original formatting otherwise preserved.',
  equivalence: 'canonical',
  apply(code, lang) {
    const ast = parseCode(code, lang)
    const comments = [...(ast.comments ?? [])]
      .filter((c): c is typeof c & { start: number; end: number } => c.start != null && c.end != null)
      .sort((a, b) => b.start - a.start)
    let out = code
    for (const c of comments) out = out.slice(0, c.start) + out.slice(c.end)
    return out
  },
}
