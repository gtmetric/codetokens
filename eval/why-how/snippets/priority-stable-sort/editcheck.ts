import { test, expect } from 'bun:test'
import { orderTasks } from './subject.ts'

const ids = (tasks: { id: number }[]): number[] => tasks.map((t) => t.id)

test('new: highest priority comes first', () => {
  const out = orderTasks([
    { id: 1, priority: 5 },
    { id: 3, priority: 9 },
    { id: 2, priority: 1 },
  ])
  expect(ids(out)).toEqual([3, 1, 2])
})
test('new: equal priorities keep submission order (stable)', () => {
  const out = orderTasks([
    { id: 1, priority: 5 },
    { id: 2, priority: 5 },
    { id: 3, priority: 9 },
    { id: 4, priority: 5 },
  ])
  expect(ids(out)).toEqual([3, 1, 2, 4])
})
