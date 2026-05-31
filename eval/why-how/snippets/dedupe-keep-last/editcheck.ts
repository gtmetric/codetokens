import { test, expect } from 'bun:test'
import { dedupeByKey } from './subject.ts'

test('regression: duplicate key keeps the LAST value, first-seen order', () => {
  expect(
    dedupeByKey([
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
      { key: 'a', value: 9 },
    ]),
  ).toEqual([
    { key: 'a', value: 9 },
    { key: 'b', value: 2 },
  ])
})
test('new: entries whose final value is 0 are dropped', () => {
  expect(
    dedupeByKey([
      { key: 'a', value: 1 },
      { key: 'b', value: 0 },
    ]),
  ).toEqual([{ key: 'a', value: 1 }])
})
test('new: last-write-wins still applies before the zero filter', () => {
  expect(
    dedupeByKey([
      { key: 'a', value: 0 },
      { key: 'a', value: 7 },
      { key: 'b', value: 5 },
      { key: 'b', value: 0 },
    ]),
  ).toEqual([{ key: 'a', value: 7 }])
})
