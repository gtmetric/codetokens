import { transformSync } from '@babel/core'
import type { Scope } from '@babel/traverse'
import type { Lang } from '../lang.ts'
import { parseCode, generateCode, traverse, type File } from './babel.ts'

/** Strip TS types + comments, producing plain JS (or JSX) text. */
function stripTypesAndComments(code: string, lang: Lang): string {
  const isTSX = lang === 'tsx' || lang === 'jsx'
  const result = transformSync(code, {
    filename: `file.${lang}`,
    babelrc: false,
    configFile: false,
    comments: false,
    retainLines: false,
    presets: [
      [
        '@babel/preset-typescript',
        { allExtensions: true, isTSX, allowDeclareFields: true, onlyRemoveTypeImports: false },
      ],
    ],
  })
  if (result?.code == null) throw new Error('canonicalize: type-strip produced no output')
  return result.code
}

/**
 * Rename every bound identifier to a deterministic, position-based name.
 *
 * Only bindings in `scope.bindings` are renamed, so property names, object/string
 * keys, class methods, and external import names are left intact. Statement labels
 * are intentionally NOT canonicalized — at worst that yields a conservative
 * "not verified" (a false negative), never a false equivalence.
 */
function alphaRename(ast: File): void {
  let counter = 0
  const seen = new Set<Scope>()
  const ordered: Scope[] = []
  traverse(ast, {
    enter(path) {
      const scope = path.scope
      if (seen.has(scope)) return
      seen.add(scope)
      ordered.push(scope)
    },
  })
  for (const scope of ordered) {
    for (const name of Object.keys(scope.bindings)) {
      scope.rename(name, `_$c${counter++}`)
    }
  }
}

/**
 * Reduce two runtime-equivalent programs to an identical canonical string.
 *
 * Strips TS type annotations + comments, re-parses, then alpha-renames every
 * bound identifier to a deterministic position-based name so that programs
 * differing only in formatting, comments, types, or local identifier names
 * collapse to the same output, while genuinely different programs do not.
 *
 * @param lang the *original* language of `code`. JSX survives type stripping,
 *   so tsx/jsx inputs must be re-parsed with the JSX plugin (not plain js),
 *   otherwise canonicalize would throw on every .tsx/.jsx file.
 */
export function canonicalize(code: string, lang: Lang): string {
  const stripped = stripTypesAndComments(code, lang)
  // preset-typescript erases types but leaves JSX intact, so re-parse JSX-bearing
  // languages with the JSX plugin rather than the plain 'js' parser.
  const reparseLang: Lang = lang === 'tsx' || lang === 'jsx' ? 'jsx' : 'js'
  const ast = parseCode(stripped, reparseLang)
  alphaRename(ast)
  return generateCode(ast, { comments: false, compact: false, concise: false })
}
