import { test, expect } from 'bun:test'
import { deepestKey } from './subject.ts'

test('regression: returns the dotted path to the single deepest key', () => {
  expect(deepestKey({ a: { b: { c: 1 } } })).toBe('a.b.c')
})
test('regression: an empty object yields the empty string', () => {
  expect(deepestKey({})).toBe('')
})
test('new: on a depth tie, the alphabetically first path wins', () => {
  // both z.b and a.c are at depth 2; first-encountered is z.b, alpha-first is a.c
  expect(deepestKey({ z: { b: 1 }, a: { c: 1 } })).toBe('a.c')
})
test('new: alphabetical tie-break ignores object insertion order', () => {
  expect(deepestKey({ banana: { x: 1 }, apple: { y: 1 } })).toBe('apple.y')
})
