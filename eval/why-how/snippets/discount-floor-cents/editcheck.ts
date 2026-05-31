import { test, expect } from 'bun:test'
import { discountedCents } from './subject.ts'

test('regression: member tier floors fractional cents', () => {
  expect(discountedCents(1005, 'member')).toBe(904)
})
test('new: bulk tier charges 67% of price', () => {
  expect(discountedCents(1000, 'bulk')).toBe(670)
})
test('new: bulk tier also floors, never rounds up', () => {
  expect(discountedCents(850, 'bulk')).toBe(569)
})
