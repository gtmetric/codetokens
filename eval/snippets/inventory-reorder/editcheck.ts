import { test, expect } from 'bun:test'
import { planReorders } from './subject.ts'

test('regression: a normal reorder rounds up to a case pack', () => {
  expect(planReorders([{ sku: 'A', stock: 5, dailySales: 2, leadDays: 3 }])).toEqual([{ sku: 'A', qty: 60 }])
})
test('regression: well-stocked and zero-sales items are omitted', () => {
  expect(
    planReorders([
      { sku: 'B', stock: 100, dailySales: 2, leadDays: 3 },
      { sku: 'C', stock: 0, dailySales: 0, leadDays: 3 },
    ]),
  ).toEqual([])
})
test('new: a large order is capped at 500 units', () => {
  expect(planReorders([{ sku: 'D', stock: 0, dailySales: 50, leadDays: 5 }])).toEqual([{ sku: 'D', qty: 500 }])
})
test('new: a needed reorder that rounds below a case is bumped to 10', () => {
  expect(planReorders([{ sku: 'E', stock: 35, dailySales: 1, leadDays: 25 }])).toEqual([{ sku: 'E', qty: 10 }])
})
