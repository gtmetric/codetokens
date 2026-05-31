import { test, expect } from 'bun:test'
import { refill } from './subject.ts'

test('regression: adds rate * elapsed seconds to the balance', () => {
  expect(refill(0, 1000, 10, 100)).toBe(10)
})
test('regression: the balance is clamped to the cap', () => {
  expect(refill(95, 1000, 10, 100)).toBe(100)
})
test('new: a negative starting balance is floored at 0 after refill', () => {
  expect(refill(-50, 1000, 10, 100)).toBe(0)
})
test('new: a negative balance with no refill is floored at 0', () => {
  expect(refill(-5, 0, 10, 100)).toBe(0)
})
