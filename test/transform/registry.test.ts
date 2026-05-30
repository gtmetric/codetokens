// test/transform/registry.test.ts
import { test, expect } from 'bun:test'
import { allTransforms } from '../../src/transform/index.ts'
import { combinedBest } from '../../src/transform/transforms/combined-best.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const SRC = `// doc\nexport function area(width: number, height: number): number {\n  const product = width * height\n  return product\n}\n`

test('registry includes baseline first and all 9 transforms with unique names', () => {
  expect(allTransforms[0]?.name).toBe('baseline')
  expect(allTransforms.length).toBe(9)
  expect(new Set(allTransforms.map((t) => t.name)).size).toBe(9)
})

test('round-trip transforms declare invert; others may omit', () => {
  for (const t of allTransforms) {
    if (t.equivalence === 'round-trip') expect(typeof t.invert).toBe('function')
  }
})

test('combined-best stacks lossless transforms and stays canon-verified', () => {
  const out = combinedBest.apply(SRC, 'ts')
  expect(out.length).toBeLessThan(SRC.length)
  expect(verifyEquivalence(combinedBest, SRC, out, 'ts').verified).toBe(true)
})
