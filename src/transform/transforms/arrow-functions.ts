import type { Transform } from '../transform.type.ts'
import { parseCode, generateCode, traverse, t } from '../babel.ts'

/**
 * Convert top-level `function name(...)` declarations into
 * `const name = (...) => body` arrow assignments.
 *
 * Marked `manual` because the rewrite changes runtime semantics
 * (`this`/`arguments` binding and hoisting), so the equivalence
 * checker deliberately does not machine-verify it.
 */
export const arrowFunctions: Transform = {
  name: 'arrow-functions',
  description:
    'Convert function declarations to const arrow assignments. MANUAL: changes this/arguments/hoisting, so not machine-verified.',
  equivalence: 'manual',
  apply(code, lang) {
    const ast = parseCode(code, lang)
    traverse(ast, {
      FunctionDeclaration(path) {
        const { id, params, body, async: isAsync } = path.node
        if (id == null) return
        const arrow = t.arrowFunctionExpression(params, body, isAsync)
        if (path.parentPath?.isExportDefaultDeclaration() === true) {
          // `export default function` can't hold a VariableDeclaration; emit a bare arrow expression.
          path.replaceWith(arrow)
          return
        }
        const decl = t.variableDeclaration('const', [t.variableDeclarator(id, arrow)])
        path.replaceWith(decl)
      },
    })
    return generateCode(ast, { comments: false })
  },
}
