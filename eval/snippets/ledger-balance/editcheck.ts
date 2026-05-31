import { test, expect } from 'bun:test'
import { runningBalance } from './subject.ts'

test('regression: credits add and debits subtract', () => {
  expect(runningBalance([{ type: 'credit', amount: 100 }, { type: 'debit', amount: 30 }])).toEqual([100, 70])
})
test('regression: overdraft fee of 25 on a negative balance', () => {
  expect(runningBalance([{ type: 'credit', amount: 100 }, { type: 'debit', amount: 200 }])).toEqual([100, -125])
})
test('new: a credit crossing from below 1000 to >= 1000 earns 1% interest', () => {
  expect(runningBalance([{ type: 'credit', amount: 1200 }])).toEqual([1212])
})
test('new: bonus applies only on the crossing entry, not when already >= 1000', () => {
  expect(runningBalance([{ type: 'credit', amount: 500 }, { type: 'credit', amount: 600 }])).toEqual([500, 1111])
})
test('new: no repeat bonus on a credit that arrives when already >= 1000', () => {
  expect(runningBalance([{ type: 'credit', amount: 1200 }, { type: 'credit', amount: 100 }])).toEqual([1212, 1312])
})
