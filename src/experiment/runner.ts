import type { CorpusFile } from '../corpus/loader.ts'
import type { Transform } from '../transform/transform.type.ts'
import type { Tokenizer } from '../tokenizer/tokenizer.type.ts'
import { verifyEquivalence, type EquivalenceResult } from '../transform/equivalence.ts'

export type Cell = {
  file: string
  lang: string
  transform: string
  tokenizer: string
  tokens: number | null
  chars: number | null
  equivalence: EquivalenceResult
  error?: string
}

export async function runExperiment(
  corpus: CorpusFile[],
  transforms: Transform[],
  tokenizers: Tokenizer[],
): Promise<Cell[]> {
  const cells: Cell[] = []
  for (const file of corpus) {
    for (const transform of transforms) {
      let output: string | undefined
      let applyError: string | undefined
      try {
        output = transform.apply(file.code, file.lang)
      } catch (err) {
        applyError = String(err)
      }
      const equivalence: EquivalenceResult =
        output === undefined
          ? { verified: false, method: transform.equivalence, detail: 'apply threw' }
          : verifyEquivalence(transform, file.code, output, file.lang)

      for (const tokenizer of tokenizers) {
        let tokens: number | null = null
        let tokError: string | undefined
        if (output !== undefined) {
          try {
            tokens = await tokenizer.countTokens(output)
          } catch (err) {
            tokError = String(err)
          }
        }
        const errorMessage = applyError ?? tokError
        const errorField: { error?: string } = errorMessage !== undefined ? { error: errorMessage } : {}
        cells.push({
          file: file.path,
          lang: file.lang,
          transform: transform.name,
          tokenizer: tokenizer.name,
          tokens,
          chars: output === undefined ? null : output.length,
          equivalence,
          ...errorField,
        })
      }
    }
  }
  return cells
}
