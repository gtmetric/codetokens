import { test, expect } from 'bun:test'
import { toEpochSeconds } from './subject.ts'

test('new: rounds to nearest second', () => {
  expect(toEpochSeconds([2600])).toEqual([3])
  expect(toEpochSeconds([2400])).toEqual([2])
})
test('regression: exact seconds unchanged', () => {
  expect(toEpochSeconds([1000, 5000])).toEqual([1, 5])
})
test('new: negative timestamps still collapse to 0', () => {
  expect(toEpochSeconds([-5000])).toEqual([0])
  expect(toEpochSeconds([-1500])).toEqual([0])
})
