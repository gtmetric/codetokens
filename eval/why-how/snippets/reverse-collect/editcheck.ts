import { test, expect } from 'bun:test'
import { collectPayloads } from './subject.ts'

test('regression: output reversed relative to input', () => {
  expect(
    collectPayloads([
      { id: 1, payload: 'a' },
      { id: 2, payload: 'b' },
      { id: 3, payload: 'c' },
    ]),
  ).toEqual(['c', 'b', 'a'])
})
test('new: empty payloads skipped, order still reversed', () => {
  expect(
    collectPayloads([
      { id: 1, payload: 'a' },
      { id: 2, payload: '' },
      { id: 3, payload: 'c' },
    ]),
  ).toEqual(['c', 'a'])
})
test('new: reverse preserved across a longer list with a skip', () => {
  expect(
    collectPayloads([
      { id: 1, payload: 'x' },
      { id: 2, payload: 'y' },
      { id: 3, payload: '' },
      { id: 4, payload: 'z' },
    ]),
  ).toEqual(['z', 'y', 'x'])
})
