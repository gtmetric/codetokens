// test/tokenizer/index.test.ts
import { test, expect } from 'bun:test'
import { createTokenizers } from '../../src/tokenizer/index.ts'

test('without api key: only tiktoken tokenizers', () => {
  const toks = createTokenizers({ anthropicModel: 'm', cachePath: ':memory:' })
  expect(toks.map((t) => t.name)).toEqual(['tiktoken:o200k_base', 'tiktoken:cl100k_base'])
})

test('with api key: adds the anthropic tokenizer', () => {
  const toks = createTokenizers({ anthropicApiKey: 'sk-test', anthropicModel: 'claude-sonnet-4-6', cachePath: ':memory:' })
  expect(toks.map((t) => t.name)).toContain('anthropic:claude-sonnet-4-6')
  expect(toks.length).toBe(3)
})
