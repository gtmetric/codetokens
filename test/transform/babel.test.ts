// test/transform/babel.test.ts
import { test, expect } from 'bun:test'
import { parseCode, generateCode, traverse, t } from '../../src/transform/babel.ts'

test('parseCode parses TS and generateCode round-trips structure', () => {
  const ast = parseCode('const x: number = 1', 'ts')
  const out = generateCode(ast)
  expect(out).toContain('const x')
  expect(out).toContain('1')
})

test('parseCode handles tsx', () => {
  const ast = parseCode('const el = <div className="a">{x}</div>', 'tsx')
  expect(ast.type).toBe('File')
})

test('traverse and t are usable', () => {
  const ast = parseCode('const a = 1; const b = 2', 'js')
  let count = 0
  traverse(ast, { VariableDeclarator() { count++ } })
  expect(count).toBe(2)
  expect(t.isFile(ast)).toBe(true)
})
