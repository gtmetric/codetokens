import { test, expect } from 'bun:test'
import { wrapText } from './subject.ts'

test('regression: greedy packing within width', () => {
  expect(wrapText('the quick brown fox', 9)).toEqual(['the quick', 'brown fox'])
})
test('regression: each short word lands on its own line when none combine', () => {
  expect(wrapText('a bb ccc', 3)).toEqual(['a', 'bb', 'ccc'])
})
test('new: a single over-width word hard-splits with trailing dashes', () => {
  expect(wrapText('elephant', 5)).toEqual(['elep-', 'hant'])
})
test('new: split flushes the current line and chains multiple pieces', () => {
  expect(wrapText('ab cdefghij', 4)).toEqual(['ab', 'cde-', 'fgh-', 'ij'])
})
