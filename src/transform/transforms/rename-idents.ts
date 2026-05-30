import type { Transform } from '../transform.type.ts'
import type { Lang } from '../../lang.ts'
import { parseCode, generateCode, traverse, type File } from '../babel.ts'

const RESERVED = new Set([
  'do', 'if', 'in', 'for', 'let', 'new', 'try', 'var', 'case', 'else', 'enum', 'eval', 'null',
  'this', 'true', 'void', 'with', 'await', 'break', 'catch', 'class', 'const', 'false', 'super',
  'throw', 'while', 'yield', 'as', 'is', 'of',
])

const DICT = [
  'data', 'value', 'item', 'list', 'name', 'count', 'index', 'result', 'input', 'output',
  'node', 'key', 'val', 'acc', 'cur', 'next', 'prev', 'temp', 'flag', 'size', 'idx', 'obj',
  'arr', 'str', 'num', 'fn', 'cb', 'res', 'req', 'ctx', 'opt', 'cfg',
]

function shortName(i: number): string {
  const alpha = 'abcdefghijklmnopqrstuvwxyz'
  let n = i
  let s = ''
  do {
    s = alpha[n % 26] + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return RESERVED.has(s) ? `${s}_` : s
}

function dictName(i: number): string {
  const base = DICT[i % DICT.length] ?? 'v'
  const suffix = Math.floor(i / DICT.length)
  const name = suffix === 0 ? base : `${base}${suffix}`
  return RESERVED.has(name) ? `${name}_` : name
}

/** Rename only non-module-scope (local) bindings, so exports/public API are untouched. */
function renameLocals(ast: File, naming: (i: number) => string): void {
  let counter = 0
  const seen = new Set<unknown>()
  const localScopes: { rename(from: string, to: string): void; bindings: Record<string, unknown> }[] = []
  traverse(ast, {
    enter(path) {
      const scope = path.scope
      if (seen.has(scope)) return
      seen.add(scope)
      if (path.isProgram()) return // skip module scope → preserves exported names
      localScopes.push(scope)
    },
  })
  for (const scope of localScopes) {
    for (const name of Object.keys(scope.bindings)) {
      scope.rename(name, naming(counter++))
    }
  }
}

function makeRenameTransform(name: string, description: string, naming: (i: number) => string): Transform {
  return {
    name,
    description,
    equivalence: 'canonical',
    apply(code: string, lang: Lang) {
      const ast = parseCode(code, lang)
      renameLocals(ast, naming)
      return generateCode(ast, { comments: false })
    },
  }
}

export const renameIdentsShort = makeRenameTransform(
  'rename-idents-short',
  'Rename local bindings to short names (a, b, …, aa); tests whether short names beat BPE-fragmented camelCase.',
  shortName,
)

export const renameIdentsDict = makeRenameTransform(
  'rename-idents-dict',
  'Rename local bindings to common single-token dictionary words; tests dictionary vs camelCase tokenization.',
  dictName,
)
