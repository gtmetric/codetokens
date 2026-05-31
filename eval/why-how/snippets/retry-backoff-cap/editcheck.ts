import { test, expect } from 'bun:test'
import { backoffMs } from './subject.ts'

test('new: base delay is now 250ms and doubles', () => {
  expect(backoffMs(0)).toBe(250)
  expect(backoffMs(3)).toBe(2000)
})
test('new: delay is still capped at 30000ms for high attempts', () => {
  expect(backoffMs(7)).toBe(30000)
  expect(backoffMs(10)).toBe(30000)
})
