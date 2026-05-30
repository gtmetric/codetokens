import { test, expect } from 'bun:test'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'
import type { Transform } from '../../src/transform/transform.type.ts'

const canonical: Transform = { name: 'c', description: '', equivalence: 'canonical', apply: (s) => s }
const roundTrip: Transform = {
  name: 'r', description: '', equivalence: 'round-trip',
  apply: (s) => s.replaceAll('const', '◇'),
  invert: (s) => s.replaceAll('◇', 'const'),
}
const manual: Transform = { name: 'm', description: '', equivalence: 'manual', apply: (s) => s }

test('canonical: equal canon forms verify', () => {
  const r = verifyEquivalence(canonical, 'const x = 1 // a', 'const x = 1', 'js')
  expect(r.verified).toBe(true)
  expect(r.method).toBe('canonical')
})

test('canonical: broken transform fails verification', () => {
  const r = verifyEquivalence(canonical, 'const x = 1', 'const x = 2', 'js')
  expect(r.verified).toBe(false)
})

test('canonical: non-parsing output fails', () => {
  const r = verifyEquivalence(canonical, 'const x = 1', 'const x = ', 'js')
  expect(r.verified).toBe(false)
})

test('round-trip: invert reproduces original', () => {
  const r = verifyEquivalence(roundTrip, 'const x = 1', '◇ x = 1', 'js')
  expect(r.verified).toBe(true)
  expect(r.method).toBe('round-trip')
})

test('manual: never machine-verified, flagged', () => {
  const r = verifyEquivalence(manual, 'const x = 1', 'const x = 1', 'js')
  expect(r.verified).toBe(false)
  expect(r.method).toBe('manual')
})
