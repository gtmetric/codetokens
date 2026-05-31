import { test, expect } from 'bun:test'
import { mergeIntervals } from './subject.ts'

test('regression: strictly overlapping spans merge', () => {
  expect(mergeIntervals([[1, 3], [2, 5]])).toEqual([[1, 5]])
})
test('regression: disjoint spans are kept separate and sorted', () => {
  expect(mergeIntervals([[5, 6], [1, 2]])).toEqual([[1, 2], [5, 6]])
})
test('new: touching spans (end === next start) are merged', () => {
  expect(mergeIntervals([[1, 3], [3, 5]])).toEqual([[1, 5]])
})
test('new: a chain of touching spans collapses to one', () => {
  expect(mergeIntervals([[0, 1], [1, 2], [2, 3]])).toEqual([[0, 3]])
})
