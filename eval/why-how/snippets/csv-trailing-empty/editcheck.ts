import { test, expect } from 'bun:test'
import { parseRow } from './subject.ts'

test('new: surrounding whitespace is trimmed', () => {
  expect(parseRow(' a , b ')).toEqual(['a', 'b'])
})
test('new: a trailing empty field is preserved after trimming', () => {
  expect(parseRow(' a , b ,')).toEqual(['a', 'b', ''])
})
test('regression: interior and trailing blanks keep their positions', () => {
  expect(parseRow('x, ,')).toEqual(['x', '', ''])
})
