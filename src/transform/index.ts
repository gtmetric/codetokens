import type { Transform } from './transform.type.ts'
import { baseline } from './transforms/baseline.ts'
import { stripComments } from './transforms/strip-comments.ts'
import { minifyWhitespace } from './transforms/minify-whitespace.ts'
import { stripTypes } from './transforms/strip-types.ts'
import { renameIdentsShort, renameIdentsDict } from './transforms/rename-idents.ts'
import { arrowFunctions } from './transforms/arrow-functions.ts'
import { keywordSigils } from './transforms/keyword-sigils.ts'
import { combinedBest } from './transforms/combined-best.ts'

export const allTransforms: Transform[] = [
  baseline,
  stripComments,
  minifyWhitespace,
  stripTypes,
  renameIdentsShort,
  renameIdentsDict,
  arrowFunctions,
  keywordSigils,
  combinedBest,
]
