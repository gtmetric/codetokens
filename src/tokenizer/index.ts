import type { Config } from '../config.ts'
import type { Tokenizer } from './tokenizer.type.ts'
import { createCache, withCache } from './cache.ts'
import { createTiktokenTokenizer } from './tiktoken.tokenizer.ts'
import { createAnthropicTokenizer } from './anthropic.tokenizer.ts'

export function createTokenizers(config: Config): Tokenizer[] {
  const cache = createCache(config.cachePath)
  const tokenizers: Tokenizer[] = [
    withCache(createTiktokenTokenizer('o200k_base'), cache),
    withCache(createTiktokenTokenizer('cl100k_base'), cache),
  ]
  if (config.anthropicApiKey !== undefined) {
    tokenizers.push(
      withCache(
        createAnthropicTokenizer({ apiKey: config.anthropicApiKey, model: config.anthropicModel }),
        cache,
      ),
    )
  } else {
    console.warn('[token-exp] ANTHROPIC_API_KEY not set — skipping Claude tokenizer (tiktoken only).')
  }
  return tokenizers
}
