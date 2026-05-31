import { test, expect } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { runTests } from '../src/score.ts'
import { canonicalize } from '../../src/transform/canonicalize.ts'

const SNIPPETS_DIR = join(import.meta.dir, 'snippets')

const MetaSchema = z.object({ exportName: z.string().min(1) })

type WhyHowSnippet = {
  name: string
  exportName: string
  stripHow: string
  stripAll: string
  reference: string
  testPath: string
}

function loadWhyHowSnippets(): WhyHowSnippet[] {
  return readdirSync(SNIPPETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(SNIPPETS_DIR, d.name)
      const meta = MetaSchema.parse(JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')))
      return {
        name: d.name,
        exportName: meta.exportName,
        stripHow: readFileSync(join(dir, 'strip-how.ts'), 'utf8'),
        stripAll: readFileSync(join(dir, 'strip-all.ts'), 'utf8'),
        reference: readFileSync(join(dir, 'reference.ts'), 'utf8'),
        testPath: join(dir, 'editcheck.ts'),
      }
    })
}

const snippets = loadWhyHowSnippets()

test('exactly 10 why-how snippets exist', () => {
  expect(snippets.length).toBe(10)
})

for (const s of snippets) {
  test(`[${s.name}] reference passes the editcheck`, async () => {
    const r = await runTests(s.testPath, s.reference)
    expect(r.passed).toBe(true)
  })

  test(`[${s.name}] strip-all (un-edited) FAILS the editcheck`, async () => {
    const r = await runTests(s.testPath, s.stripAll)
    expect(r.passed).toBe(false)
  })

  test(`[${s.name}] strip-how and strip-all differ ONLY in comments`, () => {
    expect(canonicalize(s.stripHow, 'ts')).toBe(canonicalize(s.stripAll, 'ts'))
  })

  test(`[${s.name}] export name appears in both forms and the reference`, () => {
    expect(s.stripHow).toContain(s.exportName)
    expect(s.stripAll).toContain(s.exportName)
    expect(s.reference).toContain(s.exportName)
  })
}
