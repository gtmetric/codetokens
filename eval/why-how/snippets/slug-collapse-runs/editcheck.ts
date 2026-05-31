import { test, expect } from 'bun:test'
import { slugify } from './subject.ts'

test('new: leading and trailing hyphens are trimmed', () => {
  expect(slugify('  hello  ')).toBe('hello')
  expect(slugify('  Hi--there  ')).toBe('hi-there')
})
test('new: interior separator runs still collapse to a single hyphen', () => {
  expect(slugify('a   b')).toBe('a-b')
})
test('regression: mixed separators collapse, never doubled', () => {
  expect(slugify('x__y')).toBe('x-y')
  expect(slugify('Hello   World')).toBe('hello-world')
})
