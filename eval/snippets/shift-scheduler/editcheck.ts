import { test, expect } from 'bun:test'
import { assignShifts } from './subject.ts'

test('regression: shifts go to the worker with the most remaining hours', () => {
  expect(assignShifts([{ name: 'Ann', maxHours: 10 }, { name: 'Bob', maxHours: 8 }], [3, 3])).toEqual(['Ann', 'Bob'])
})
test('regression: a shift with no worker able to cover it is null', () => {
  expect(assignShifts([{ name: 'Ann', maxHours: 5 }], [3, 3])).toEqual(['Ann', null])
})
test('new: a worker is capped at 3 shifts even with capacity to spare', () => {
  expect(assignShifts([{ name: 'Ann', maxHours: 100 }], [1, 1, 1, 1])).toEqual(['Ann', 'Ann', 'Ann', null])
})
test('new: the cap redistributes the 4th shift to another worker', () => {
  expect(
    assignShifts([{ name: 'Ann', maxHours: 100 }, { name: 'Bob', maxHours: 50 }], [10, 10, 10, 10]),
  ).toEqual(['Ann', 'Ann', 'Ann', 'Bob'])
})
