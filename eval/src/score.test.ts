import { test, expect } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runTests } from './score.ts'

function makeTestFile(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'score-fixture-'))
  const path = join(dir, 'fixture.test.ts')
  writeFileSync(
    path,
    `import { test, expect } from 'bun:test'\nimport { f } from './subject.ts'\ntest('doubles', () => { expect(f(3)).toBe(6) })\n`,
  )
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

test('correct candidate passes', async () => {
  const { path, cleanup } = makeTestFile()
  const r = await runTests(path, 'export function f(n: number): number { return n * 2 }')
  cleanup()
  expect(r.passed).toBe(true)
})

test('wrong candidate fails', async () => {
  const { path, cleanup } = makeTestFile()
  const r = await runTests(path, 'export function f(n: number): number { return n + 2 }')
  cleanup()
  expect(r.passed).toBe(false)
})

test('empty candidate fails with reason', async () => {
  const { path, cleanup } = makeTestFile()
  const r = await runTests(path, '   ')
  cleanup()
  expect(r.passed).toBe(false)
  expect(r.detail).toContain('no code')
})
