// test/tokenizer/tiktoken.test.ts
import { test, expect } from 'bun:test'
import { createTiktokenTokenizer } from '../../src/tokenizer/tiktoken.tokenizer.ts'

test('counts tokens deterministically and names itself', async () => {
  const tok = createTiktokenTokenizer('o200k_base')
  expect(tok.name).toBe('tiktoken:o200k_base')
  const a = await tok.countTokens('const x = 1')
  const b = await tok.countTokens('const x = 1')
  expect(a).toBe(b)
  expect(a).toBeGreaterThan(0)
})

test('longer code costs more tokens', async () => {
  const tok = createTiktokenTokenizer('cl100k_base')
  const short = await tok.countTokens('a')
  const long = await tok.countTokens('a'.repeat(50) + ' = function foo() { return 1 }')
  expect(long).toBeGreaterThan(short)
})
