// test/transform/strip-types.test.ts
import { test, expect } from 'bun:test'
import { stripTypes } from '../../src/transform/transforms/strip-types.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const TS = `export function greet(name: string): string {\n  const n: number = 1\n  return name + n\n}\n`

test('strip-types removes annotations, keeps runtime code, stays verified', () => {
  const out = stripTypes.apply(TS, 'ts')
  expect(out).not.toContain(': string')
  expect(out).not.toContain(': number')
  expect(out).toContain('return name + n')
  expect(verifyEquivalence(stripTypes, TS, out, 'ts').verified).toBe(true)
})

test('strip-types leaves plain JS unchanged in behavior', () => {
  const js = 'export const x = 1'
  const out = stripTypes.apply(js, 'js')
  expect(verifyEquivalence(stripTypes, js, out, 'js').verified).toBe(true)
})
