// eval/src/prompt.test.ts
import { test, expect } from 'bun:test'
import { buildSubjectPrompt } from './prompt.ts'
import { extractCode } from './extract.ts'

test('prompt embeds code, request, export, and asks for full module', () => {
  const p = buildSubjectPrompt('export const x = 1', 'make it 2', 'x')
  expect(p).toContain('export const x = 1')
  expect(p).toContain('make it 2')
  expect(p).toContain('x')
  expect(p.toLowerCase()).toContain('complete')
})

test('extractCode pulls the largest fenced block', () => {
  const resp = 'Sure!\n```ts\nexport const x = 2\n```\nDone.'
  expect(extractCode(resp)).toBe('export const x = 2')
})

test('extractCode falls back to whole response when unfenced', () => {
  expect(extractCode('export const x = 2')).toBe('export const x = 2')
})
