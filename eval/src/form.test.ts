import { test, expect } from 'bun:test'
import { FORMS, makeForm } from './form.ts'

const SRC = `/** doc */\nexport function add(a: number, b: number): number {\n  const sum = a + b // inline\n  return sum\n}\n`

test('FORMS lists the 5 forms with original first', () => {
  expect(FORMS[0]).toBe('original')
  expect(FORMS.length).toBe(5)
})

test('every form preserves the export and stays parseable', async () => {
  const { parses } = await import('../../src/transform/babel.ts')
  for (const form of FORMS) {
    const out = makeForm(SRC, 'ts', form)
    expect(out).toContain('add') // export name preserved
    // Use 'ts' when TS annotations are present (including compacted `:number` from minify).
    // The babel TS plugin is a strict superset of JS, so 'ts' works for stripped forms too.
    const hasTypeAnnotation = /\w:/.test(out)
    expect(parses(out, hasTypeAnnotation ? 'ts' : 'js')).toBe(true)
  }
})

test('strip-types removes annotations; minify shrinks length', () => {
  expect(makeForm(SRC, 'ts', 'strip-types')).not.toContain(': number')
  expect(makeForm(SRC, 'ts', 'minify-whitespace').length).toBeLessThan(SRC.length)
})
