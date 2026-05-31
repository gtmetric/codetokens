import type { Lang } from '../../src/lang.ts'
import type { Transform } from '../../src/transform/transform.type.ts'
import { baseline } from '../../src/transform/transforms/baseline.ts'
import { stripComments } from '../../src/transform/transforms/strip-comments.ts'
import { stripTypes } from '../../src/transform/transforms/strip-types.ts'
import { minifyWhitespace } from '../../src/transform/transforms/minify-whitespace.ts'
import { combinedBest } from '../../src/transform/transforms/combined-best.ts'

export const FORMS = ['original', 'strip-comments', 'strip-types', 'minify-whitespace', 'combined-best'] as const
export type Form = (typeof FORMS)[number]

const FORM_TRANSFORM = {
  original: baseline,
  'strip-comments': stripComments,
  'strip-types': stripTypes,
  'minify-whitespace': minifyWhitespace,
  'combined-best': combinedBest,
} satisfies Record<Form, Transform>

export function makeForm(code: string, lang: Lang, form: Form): string {
  return FORM_TRANSFORM[form].apply(code, lang)
}
