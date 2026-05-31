import { test, expect } from 'bun:test'
import { vatCents } from './subject.ts'

test('regression: standard rate still rounds half down', () => {
  expect(vatCents(10, 'standard')).toBe(1)
  expect(vatCents(200, 'standard')).toBe(30)
})
test('new: reduced rate exists at 5%', () => {
  expect(vatCents(200, 'reduced')).toBe(10)
})
test('new: reduced rate also rounds half down (not Math.round)', () => {
  expect(vatCents(850, 'reduced')).toBe(42)
  expect(vatCents(10, 'reduced')).toBe(0)
})
