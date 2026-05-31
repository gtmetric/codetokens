import { test, expect } from 'bun:test'
import { percentile } from './subject.ts'

test('regression: p50 uses nearest-rank (not interpolation)', () => {
  expect(percentile([10, 20, 30, 40], 'p50')).toBe(20)
})
test('new: p90 is supported', () => {
  expect(percentile([10, 20, 30, 40, 50], 'p90')).toBe(50)
})
test('new: p90 uses nearest-rank, not linear interpolation', () => {
  expect(percentile([10, 20, 30, 40], 'p90')).toBe(40)
})
