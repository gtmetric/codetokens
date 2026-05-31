import { test, expect } from 'bun:test'
import { computeTax, type Bracket } from './subject.ts'

const brackets: Bracket[] = [
  { upTo: 10000, rate: 0.1 },
  { upTo: 30000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
]

test('regression: two-bracket progressive tax under the surtax threshold', () => {
  expect(computeTax(20000, brackets)).toBe(2000)
})
test('regression: single low bracket under the surtax threshold', () => {
  expect(computeTax(8000, brackets)).toBe(300)
})
test('new: 3% surtax applies to income above 100000', () => {
  expect(computeTax(120000, brackets)).toBe(31100)
})
test('new: final tax is capped at 40% of pre-deduction income', () => {
  const steep: Bracket[] = [
    { upTo: 10000, rate: 0.1 },
    { upTo: Infinity, rate: 0.5 },
  ]
  expect(computeTax(200000, steep)).toBe(80000)
})
