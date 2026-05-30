// test/transform/transforms-a.test.ts
import { test, expect } from 'bun:test'
import { baseline } from '../../src/transform/transforms/baseline.ts'
import { stripComments } from '../../src/transform/transforms/strip-comments.ts'
import { minifyWhitespace } from '../../src/transform/transforms/minify-whitespace.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const SRC = `// header\nfunction add(a, b) {\n  /* sum */\n  return a + b\n}\n`

test('baseline is identity and canon-verified', () => {
  expect(baseline.apply(SRC, 'js')).toBe(SRC)
  expect(verifyEquivalence(baseline, SRC, baseline.apply(SRC, 'js'), 'js').verified).toBe(true)
})

test('strip-comments removes comments, preserves code, stays verified', () => {
  const out = stripComments.apply(SRC, 'js')
  expect(out).not.toContain('header')
  expect(out).not.toContain('sum')
  expect(out).toContain('return a + b')
  expect(verifyEquivalence(stripComments, SRC, out, 'js').verified).toBe(true)
})

test('strip-comments preserves comment-like text inside strings', () => {
  const s = 'const url = "http://x"; // c'
  const out = stripComments.apply(s, 'js')
  expect(out).toContain('"http://x"')
  expect(out).not.toContain('// c')
})

test('minify-whitespace shrinks chars and stays verified', () => {
  const out = minifyWhitespace.apply(SRC, 'js')
  expect(out.length).toBeLessThan(SRC.length)
  expect(verifyEquivalence(minifyWhitespace, SRC, out, 'js').verified).toBe(true)
})
