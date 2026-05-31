import { test, expect } from 'bun:test'
import { normalizeRow } from './subject.ts'

test('regression: trims surrounding whitespace from each cell', () => {
  expect(normalizeRow('a, b ,c')).toEqual(['a', 'b', 'c'])
})
test('regression: collapses internal space runs to one space', () => {
  expect(normalizeRow('a,  b   c ,d')).toEqual(['a', 'b c', 'd'])
})
test('regression: drops trailing empty cells but keeps interior empties', () => {
  expect(normalizeRow('a,b,,')).toEqual(['a', 'b'])
  expect(normalizeRow('a,,b,')).toEqual(['a', '', 'b'])
})
test('new: unquotes a quoted cell and preserves commas inside the quotes', () => {
  expect(normalizeRow('"hello, world",b')).toEqual(['hello, world', 'b'])
})
test('new: a single fully-quoted cell has its surrounding quotes removed', () => {
  expect(normalizeRow('"quoted"')).toEqual(['quoted'])
})
