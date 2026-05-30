import { getEncoding } from 'js-tiktoken'
import type { Tokenizer } from './tokenizer.type.ts'

export type TiktokenEncoding = 'o200k_base' | 'cl100k_base'

export function createTiktokenTokenizer(encoding: TiktokenEncoding): Tokenizer {
  const enc = getEncoding(encoding)
  return {
    name: `tiktoken:${encoding}`,
    countTokens: (text) => Promise.resolve(enc.encode(text).length),
  }
}
