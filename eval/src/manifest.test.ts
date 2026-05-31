// eval/src/manifest.test.ts
import { test, expect } from 'bun:test'
import { GeneratedSchema } from './manifest.ts'

test('GeneratedSchema accepts a well-formed manifest', () => {
  const ok = {
    snippets: [
      {
        name: 's',
        lang: 'ts',
        exportName: 'f',
        complexity: 'simple',
        request: 'do x',
        forms: { original: { code: 'export const f = 1', tokens: { 'tiktoken:o200k_base': 5 } } },
      },
    ],
  }
  expect(() => GeneratedSchema.parse(ok)).not.toThrow()
})

test('GeneratedSchema rejects a manifest missing tokens', () => {
  const bad = { snippets: [{ name: 's', lang: 'ts', exportName: 'f', request: 'x', forms: { original: { code: 'y' } } }] }
  expect(() => GeneratedSchema.parse(bad)).toThrow()
})
