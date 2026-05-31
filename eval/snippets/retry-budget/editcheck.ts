import { test, expect } from 'bun:test'
import { planRetries } from './subject.ts'

test('regression: doubles the delay each attempt while under the cap', () => {
  expect(planRetries(3, 100)).toEqual([100, 200, 400])
})
test('regression: non-positive attempt count yields no delays', () => {
  expect(planRetries(0, 100)).toEqual([])
})
test('new: delays exceeding 5000ms are capped at 5000 plus 50ms', () => {
  expect(planRetries(5, 1000)).toEqual([1000, 2000, 4000, 5050, 5050])
})
test('new: a first delay already over the cap becomes 5050', () => {
  expect(planRetries(2, 6000)).toEqual([5050, 5050])
})
