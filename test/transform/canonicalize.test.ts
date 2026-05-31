import { test, expect } from 'bun:test'
import { canonicalize } from '../../src/transform/canonicalize.ts'

test('formatting/comment differences vanish under canon', () => {
  const a = 'const   x=1 // hi\nfunction f(){return x}'
  const b = '/* doc */\nconst x = 1\nfunction f() {\n  return x\n}'
  expect(canonicalize(a, 'js')).toBe(canonicalize(b, 'js'))
})

test('type annotations are erased (TS and JS forms canon-equal)', () => {
  const ts = 'export const add = (a: number, b: number): number => a + b'
  const js = 'export const add = (a, b) => a + b'
  expect(canonicalize(ts, 'ts')).toBe(canonicalize(js, 'js'))
})

test('consistent local renaming is canon-equal', () => {
  const a = 'function f(){ const userId = 1; return userId + 2 }'
  const b = 'function f(){ const q = 1; return q + 2 }'
  expect(canonicalize(a, 'js')).toBe(canonicalize(b, 'js'))
})

test('genuinely different programs are NOT canon-equal', () => {
  const a = 'function f(){ return 1 }'
  const b = 'function f(){ return 2 }'
  expect(canonicalize(a, 'js')).not.toBe(canonicalize(b, 'js'))
})

test('tsx with types canon-equals its type-stripped jsx equivalent (JSX fix)', () => {
  const tsx = 'const C = (props: { n: number }) => <div>{props.n}</div>'
  const jsx = 'const C = (props) => <div>{props.n}</div>'
  expect(() => canonicalize(tsx, 'tsx')).not.toThrow()
  expect(canonicalize(tsx, 'tsx')).toBe(canonicalize(jsx, 'jsx'))
})
