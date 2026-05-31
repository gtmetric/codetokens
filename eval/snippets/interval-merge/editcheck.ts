import { test, expect } from 'bun:test'
import { mergeIntervals } from './subject.ts'

test('regression: strictly overlapping spans merge', () => {
  expect(mergeIntervals([[1, 3], [2, 5]])).toEqual([[1, 5]])
})
test('regression: clearly far-apart spans stay separate and sorted', () => {
  expect(mergeIntervals([[5, 8], [1, 2]])).toEqual([[1, 2], [5, 8]])
})
test('new: spans with a gap of exactly 2 merge (canonical inclusive merge would not)', () => {
  expect(mergeIntervals([[1, 3], [5, 9]])).toEqual([[1, 9]])
})
test('new: a chain of gap-2 spans collapses to one', () => {
  expect(mergeIntervals([[1, 2], [4, 5], [7, 8]])).toEqual([[1, 8]])
})
