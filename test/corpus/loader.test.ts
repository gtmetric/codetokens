// test/corpus/loader.test.ts
import { test, expect } from 'bun:test'
import { loadCorpus } from '../../src/corpus/loader.ts'

test('loads corpus files with lang + code from manifest', () => {
  const files = loadCorpus('corpus')
  expect(files.length).toBeGreaterThanOrEqual(4)
  for (const f of files) {
    expect(f.code.length).toBeGreaterThan(0)
    expect(['ts', 'tsx', 'js', 'jsx']).toContain(f.lang)
    expect(f.source).toMatch(/^https?:\/\//)
  }
})

test('corpus spans more than one language', () => {
  const langs = new Set(loadCorpus('corpus').map((f) => f.lang))
  expect(langs.size).toBeGreaterThan(1)
})
