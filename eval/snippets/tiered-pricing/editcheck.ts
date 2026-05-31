import { test, expect } from 'bun:test'
import { priceOrder } from './subject.ts'

test('regression: plain line total, no discounts', () => {
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 2 }])).toBe(200)
})
test('regression: per-line 10% discount at quantity >= 5', () => {
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 5 }])).toBe(450)
})
test('regression: 200-cent loyalty credit when subtotal exceeds 10000', () => {
  expect(priceOrder([{ sku: 'a', price: 2000, quantity: 6 }])).toBe(10600)
})
test('new: 5% surcharge when a line quantity exceeds 10', () => {
  // line 1100 → round(990) → q>10 → round(990*1.05)=1040
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 11 }])).toBe(1040)
})
test('new: no surcharge when all quantities are 10 or less', () => {
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 10 }])).toBe(900)
})
