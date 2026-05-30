// test/tokenizer/anthropic.test.ts
import { test, expect } from 'bun:test'
import { createAnthropicTokenizer } from '../../src/tokenizer/anthropic.tokenizer.ts'

test('names itself by model and returns input_tokens from the counter', async () => {
  let received = ''
  const tok = createAnthropicTokenizer({
    model: 'claude-sonnet-4-6',
    count: async (text) => { received = text; return 11 },
  })
  expect(tok.name).toBe('anthropic:claude-sonnet-4-6')
  expect(await tok.countTokens('const x = 1')).toBe(11)
  expect(received).toBe('const x = 1')
})

test('retries on transient failure then succeeds', async () => {
  let attempts = 0
  const tok = createAnthropicTokenizer({
    model: 'm',
    maxRetries: 3,
    backoffMs: 0,
    count: async () => {
      attempts++
      if (attempts < 2) throw new Error('rate_limit')
      return 5
    },
  })
  expect(await tok.countTokens('x')).toBe(5)
  expect(attempts).toBe(2)
})
