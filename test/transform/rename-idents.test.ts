// test/transform/rename-idents.test.ts
import { test, expect } from 'bun:test'
import { renameIdentsShort, renameIdentsDict } from '../../src/transform/transforms/rename-idents.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'
import { parses } from '../../src/transform/babel.ts'

const SRC = `export function compute(initialValue) {\n  const accumulatedTotal = initialValue + 1\n  function helperRoutine(localCounter) { return localCounter * accumulatedTotal }\n  return helperRoutine(accumulatedTotal)\n}\n`

// Module-scope binding `data` is an early DICT word; naive dict-rename would re-emit `data`
// inside the function and shadow/collide. Several locals stress the same scope.
const COLLIDE_SRC = `const data = [1, 2, 3]\nexport function process(first) {\n  const second = first + 1\n  const third = second + 2\n  const fourth = third + 3\n  return data.map((x) => x + first + second + third + fourth)\n}\n`

test('rename-short renames locals, preserves exported name, stays verified', () => {
  const out = renameIdentsShort.apply(SRC, 'js')
  expect(out).toContain('compute') // export preserved (module-scope binding untouched)
  expect(out).not.toContain('accumulatedTotal') // local renamed
  expect(verifyEquivalence(renameIdentsShort, SRC, out, 'js').verified).toBe(true)
})

test('rename-dict renames locals to dictionary words, stays verified', () => {
  const out = renameIdentsDict.apply(SRC, 'js')
  expect(out).not.toContain('localCounter')
  expect(verifyEquivalence(renameIdentsDict, SRC, out, 'js').verified).toBe(true)
})

test('rename-dict is collision-safe against module-scope dict-word bindings', () => {
  const out = renameIdentsDict.apply(COLLIDE_SRC, 'js')
  expect(parses(out, 'js')).toBe(true)
  expect(verifyEquivalence(renameIdentsDict, COLLIDE_SRC, out, 'js').verified).toBe(true)
})
