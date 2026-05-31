import { test, expect } from 'bun:test'
import { summarize } from './subject.ts'

test('regression: pure addition reports added only', () => {
  expect(summarize(['a', 'b', 'c'], ['a', 'b', 'c', 'd'])).toEqual({ added: ['d'], removed: [], moved: [] })
})
test('regression: far swaps of endpoints are reported as moved', () => {
  expect(summarize(['a', 'b', 'c', 'd'], ['d', 'b', 'c', 'a'])).toEqual({ added: [], removed: [], moved: ['d', 'a'] })
})
test('new: adjacent swap (shift of 1) is not reported as moved', () => {
  expect(summarize(['a', 'b', 'c'], ['b', 'a', 'c'])).toEqual({ added: [], removed: [], moved: [] })
})
test('new: only items shifted by more than one position count as moved', () => {
  expect(summarize(['a', 'b', 'c', 'd', 'e'], ['c', 'a', 'b', 'd', 'e'])).toEqual({
    added: [],
    removed: [],
    moved: ['c'],
  })
})
