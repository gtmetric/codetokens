import { test, expect } from 'bun:test'
import { buildSlug } from './subject.ts'

test('regression: lowercases, joins with hyphens, and caps at maxWords', () => {
  expect(buildSlug('Hello World Foo', 2)).toBe('hello-world')
})
test('regression: strips punctuation from each word', () => {
  expect(buildSlug('Clean-Up! Your Code', 5)).toBe('cleanup-your-code')
})
test('new: stop-words are dropped before the word cap applies', () => {
  expect(buildSlug('The Quick Brown Fox', 2)).toBe('quick-brown')
})
test('new: multiple stop-words are removed', () => {
  expect(buildSlug('King of the Hill', 5)).toBe('king-hill')
})
