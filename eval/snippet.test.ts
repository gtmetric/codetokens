import { test, expect } from 'bun:test'
import { loadSnippets } from './src/snippet.ts'
import { runTests } from './src/score.ts'

const snippets = loadSnippets()

test('at least one snippet exists', () => {
  expect(snippets.length).toBeGreaterThan(0)
})

for (const s of snippets) {
  test(`[${s.name}] reference passes its own tests`, async () => {
    const r = await runTests(s.testPath, s.reference)
    expect(r.passed).toBe(true)
  })
  test(`[${s.name}] original (pre-change) FAILS the tests`, async () => {
    const r = await runTests(s.testPath, s.subject)
    expect(r.passed).toBe(false)
  })
  test(`[${s.name}] subject declares the stable export`, () => {
    expect(s.subject).toContain(s.meta.exportName)
    expect(s.reference).toContain(s.meta.exportName)
  })
}
