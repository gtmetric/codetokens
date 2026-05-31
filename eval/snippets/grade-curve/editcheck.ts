import { test, expect } from 'bun:test'
import { curveScores } from './subject.ts'

test('regression: flat upward shift lifts the max to 100', () => {
  expect(curveScores([40, 80])).toEqual([60, 100])
})
test('regression: curved scores below zero are clamped to 0', () => {
  expect(curveScores([-30, 70])).toEqual([0, 100])
})
test('new: each curved score is rounded to the nearest multiple of 5', () => {
  expect(curveScores([78, 88, 91])).toEqual([85, 95, 100])
})
test('new: rounding goes to the nearest 5, not always down', () => {
  // max 84 → shift 16 → [73, 84+16=100] → round → [75, 100]
  expect(curveScores([57, 84])).toEqual([75, 100])
})
