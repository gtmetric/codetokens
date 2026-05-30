import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Tokenizer } from './tokenizer.type.ts'

const CountResponseSchema = z.object({ input_tokens: z.number() })

type CountFn = (text: string) => Promise<number>

export type AnthropicTokenizerOptions = {
  model: string
  /** Injectable counter for testing; defaults to the real SDK call. */
  count?: CountFn
  apiKey?: string
  maxRetries?: number
  backoffMs?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createAnthropicTokenizer(opts: AnthropicTokenizerOptions): Tokenizer {
  const maxRetries = opts.maxRetries ?? 3
  const backoffMs = opts.backoffMs ?? 500

  const realCount: CountFn = async (text) => {
    const client = new Anthropic(opts.apiKey === undefined ? {} : { apiKey: opts.apiKey })
    const res = await client.messages.countTokens({
      model: opts.model,
      messages: [{ role: 'user', content: text }],
    })
    return CountResponseSchema.parse(res).input_tokens
  }
  const count = opts.count ?? realCount

  return {
    name: `anthropic:${opts.model}`,
    async countTokens(text) {
      let lastErr: unknown
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await count(text)
        } catch (err) {
          lastErr = err
          if (attempt < maxRetries - 1) await sleep(backoffMs * (attempt + 1))
        }
      }
      throw new Error(`Anthropic token count failed after ${maxRetries} attempts: ${String(lastErr)}`)
    },
  }
}
