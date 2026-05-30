import { parse, type ParserPlugin } from '@babel/parser'
import traverse from '@babel/traverse'
import generate, { type GeneratorOptions } from '@babel/generator'
import * as t from '@babel/types'
import type { File, Node } from '@babel/types'
import type { Lang } from '../lang.ts'

export { traverse, t }
export type { File, Node }

function pluginsFor(lang: Lang): ParserPlugin[] {
  const plugins: ParserPlugin[] = []
  if (lang === 'ts' || lang === 'tsx') plugins.push('typescript')
  if (lang === 'tsx' || lang === 'jsx') plugins.push('jsx')
  return plugins
}

export function parseCode(code: string, lang: Lang): File {
  return parse(code, { sourceType: 'module', plugins: pluginsFor(lang) })
}

export function generateCode(ast: Node, opts: GeneratorOptions = {}): string {
  return generate(ast, { comments: false, ...opts }).code
}

export function parses(code: string, lang: Lang): boolean {
  try {
    parseCode(code, lang)
    return true
  } catch {
    return false
  }
}
