// test/experiment/runner.test.ts
import { test, expect } from 'bun:test'
import { runExperiment, type Cell } from '../../src/experiment/runner.ts'
import type { Transform } from '../../src/transform/transform.type.ts'
import type { Tokenizer } from '../../src/tokenizer/tokenizer.type.ts'
import type { CorpusFile } from '../../src/corpus/loader.ts'

const corpus: CorpusFile[] = [
  { path: 'a.js', lang: 'js', code: 'const longName = 1 // c', source: 'http://x', license: 'MIT' },
]
const transforms: Transform[] = [
  { name: 'baseline', description: '', equivalence: 'canonical', apply: (s) => s },
  { name: 'strip-comments', description: '', equivalence: 'canonical', apply: () => 'const longName = 1' },
]
const charTok: Tokenizer = { name: 'chars', countTokens: (t) => Promise.resolve(t.length) }

test('produces a cell per file×transform×tokenizer with tokens, chars, equivalence', async () => {
  const cells = await runExperiment(corpus, transforms, [charTok])
  expect(cells.length).toBe(2)
  const stripped = cells.find((c: Cell) => c.transform === 'strip-comments')
  expect(stripped?.tokens).toBe('const longName = 1'.length)
  expect(stripped?.equivalence.verified).toBe(true)
})

test('a throwing transform yields an error cell, not a crash', async () => {
  const boom: Transform = { name: 'boom', description: '', equivalence: 'canonical', apply: () => { throw new Error('nope') } }
  const cells = await runExperiment(corpus, [boom], [charTok])
  expect(cells[0]?.error).toContain('nope')
  expect(cells[0]?.tokens).toBeNull()
})
