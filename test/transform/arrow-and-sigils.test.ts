// test/transform/arrow-and-sigils.test.ts
import { test, expect } from 'bun:test'
import { arrowFunctions } from '../../src/transform/transforms/arrow-functions.ts'
import { keywordSigils, SIGILS } from '../../src/transform/transforms/keyword-sigils.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

test('arrow-functions converts a top-level declaration and is marked manual', () => {
  const out = arrowFunctions.apply('function add(a, b) { return a + b }', 'js')
  expect(out).toContain('=>')
  // manual ⇒ never machine-verified
  const r = verifyEquivalence(arrowFunctions, 'function add(a,b){return a+b}', out, 'js')
  expect(r.method).toBe('manual')
  expect(r.verified).toBe(false)
})

test('arrow-functions handles export default function without throwing', () => {
  const src = 'export default function pMap(a, b) { return a + b }'
  let out = ''
  expect(() => {
    out = arrowFunctions.apply(src, 'js')
  }).not.toThrow()
  expect(out).toContain('=>')
  expect(out).toContain('export default')
})

test('keyword-sigils replaces keywords with sigils and round-trips', () => {
  const src = 'export const f = function () { return 1 }'
  const out = keywordSigils.apply(src, 'js')
  expect(out).toContain(SIGILS.function)
  expect(out).toContain(SIGILS.return)
  expect(out).not.toMatch(/\bfunction\b/)
  const r = verifyEquivalence(keywordSigils, src, out, 'js')
  expect(r.verified).toBe(true)
})

test('keyword-sigils does not touch keyword-like substrings in strings/identifiers', () => {
  const src = 'const functions = "return here"'
  const out = keywordSigils.apply(src, 'js')
  expect(out).toContain('functions')
  expect(out).toContain('"return here"')
})
