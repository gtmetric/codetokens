import { test, expect } from 'bun:test'
import { allow } from './subject.ts'

test('regression: all allowed when comfortably under max', () => {
  expect(allow([0, 100, 200], 1000, 5)).toEqual([true, true, true])
})
test('regression: events beyond the third are denied once the window is full', () => {
  expect(allow([0, 100, 200, 300], 1000, 2)).toEqual([true, true, false, false])
})
test('new: the second event is exempted even when the window would deny it', () => {
  expect(allow([0, 50, 5000], 1000, 1)).toEqual([true, true, true])
})
test('new: exempted burst events still count toward the window for the third event', () => {
  expect(allow([0, 10, 20], 1000, 1)).toEqual([true, true, false])
})
