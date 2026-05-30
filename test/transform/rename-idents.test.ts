// test/transform/rename-idents.test.ts
import { test, expect } from 'bun:test'
import { renameIdentsShort, renameIdentsDict } from '../../src/transform/transforms/rename-idents.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const SRC = `export function compute(initialValue) {\n  const accumulatedTotal = initialValue + 1\n  function helperRoutine(localCounter) { return localCounter * accumulatedTotal }\n  return helperRoutine(accumulatedTotal)\n}\n`

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
