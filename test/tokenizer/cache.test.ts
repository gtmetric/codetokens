// test/tokenizer/cache.test.ts
import { test, expect } from 'bun:test'
import { createCache, withCache } from '../../src/tokenizer/cache.ts'
import type { Tokenizer } from '../../src/tokenizer/tokenizer.type.ts'

test('cache stores and retrieves counts (in-memory db)', () => {
  const cache = createCache(':memory:')
  expect(cache.get('k')).toBeUndefined()
  cache.set('k', 42)
  expect(cache.get('k')).toBe(42)
})

test('withCache calls underlying tokenizer only once per unique text', async () => {
  const cache = createCache(':memory:')
  let calls = 0
  const base: Tokenizer = {
    name: 'fake',
    countTokens: async () => { calls++; return 7 },
  }
  const cached = withCache(base, cache)
  expect(await cached.countTokens('hello')).toBe(7)
  expect(await cached.countTokens('hello')).toBe(7)
  expect(calls).toBe(1)
  await cached.countTokens('world')
  expect(calls).toBe(2)
})
