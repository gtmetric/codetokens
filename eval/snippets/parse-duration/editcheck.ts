import { test, expect } from 'bun:test'
import { parseDuration } from './subject.ts'

test('regression: combined units sum to seconds', () => {
  expect(parseDuration('1h30m15s')).toBe(5415)
})
test('regression: days and empty string', () => {
  expect(parseDuration('2d')).toBe(172800)
  expect(parseDuration('')).toBe(0)
})
test('new: a leading dash negates the whole total', () => {
  expect(parseDuration('-5m')).toBe(-300)
})
test('new: an unknown unit letter throws', () => {
  expect(() => parseDuration('5m3x')).toThrow()
})
