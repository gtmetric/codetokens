import { test, expect } from 'bun:test'
import { buildEvalReport } from './report.ts'
import type { TrialResult } from './trial.ts'
import type { Generated } from './manifest.ts'

const generated: Generated = {
  snippets: [
    {
      name: 's1', lang: 'ts', exportName: 'f', request: 'x', complexity: 'simple',
      forms: {
        original: { code: '', tokens: { 'tiktoken:o200k_base': 100 } },
        'minify-whitespace': { code: '', tokens: { 'tiktoken:o200k_base': 60 } },
      },
    },
  ],
}
// original: 2/2 pass; minify: 1/2 pass
const trials: TrialResult[] = [
  { snippet: 's1', form: 'original', sample: 0, passed: true },
  { snippet: 's1', form: 'original', sample: 1, passed: true },
  { snippet: 's1', form: 'minify-whitespace', sample: 0, passed: true },
  { snippet: 's1', form: 'minify-whitespace', sample: 1, passed: false },
]

test('computes success rate, token savings, and deltas vs original', () => {
  const { rows } = buildEvalReport(trials, generated, 'tiktoken:o200k_base')
  const orig = rows.find((r) => r.form === 'original')
  const min = rows.find((r) => r.form === 'minify-whitespace')
  expect(orig?.successRate).toBeCloseTo(1.0, 5)
  expect(min?.successRate).toBeCloseTo(0.5, 5)
  expect(min?.tokenSavingsPct).toBeCloseTo(40, 5) // (100-60)/100
  expect(min?.deltaSuccessVsOriginal).toBeCloseTo(-0.5, 5)
})

test('markdown contains the headline table', () => {
  const md = buildEvalReport(trials, generated, 'tiktoken:o200k_base').markdown
  expect(md).toContain('# Compact-Form Edit-Accuracy Report')
  expect(md).toContain('minify-whitespace')
})

// --- complexity × form breakdown tests ---

const generatedMulti: Generated = {
  snippets: [
    {
      name: 'simple-snip', lang: 'ts', exportName: 'f', request: 'x', complexity: 'simple',
      forms: {
        original: { code: '', tokens: { 'tiktoken:o200k_base': 80 } },
        'minify-whitespace': { code: '', tokens: { 'tiktoken:o200k_base': 50 } },
      },
    },
    {
      name: 'complex-snip', lang: 'ts', exportName: 'g', request: 'y', complexity: 'complex',
      forms: {
        original: { code: '', tokens: { 'tiktoken:o200k_base': 200 } },
        'minify-whitespace': { code: '', tokens: { 'tiktoken:o200k_base': 140 } },
      },
    },
  ],
}

// simple: original 2/2, minify 2/2 (100%)
// complex: original 2/2, minify 1/2 (50%)
const trialsMulti: TrialResult[] = [
  { snippet: 'simple-snip', form: 'original', sample: 0, passed: true },
  { snippet: 'simple-snip', form: 'original', sample: 1, passed: true },
  { snippet: 'simple-snip', form: 'minify-whitespace', sample: 0, passed: true },
  { snippet: 'simple-snip', form: 'minify-whitespace', sample: 1, passed: true },
  { snippet: 'complex-snip', form: 'original', sample: 0, passed: true },
  { snippet: 'complex-snip', form: 'original', sample: 1, passed: true },
  { snippet: 'complex-snip', form: 'minify-whitespace', sample: 0, passed: true },
  { snippet: 'complex-snip', form: 'minify-whitespace', sample: 1, passed: false },
]

test('byComplexity aggregation is correct', () => {
  const { byComplexity } = buildEvalReport(trialsMulti, generatedMulti, 'tiktoken:o200k_base')

  // simple × original: 2/2 = 100%
  const simpleOrig = byComplexity.find((r) => r.complexity === 'simple' && r.form === 'original')
  expect(simpleOrig?.trials).toBe(2)
  expect(simpleOrig?.passed).toBe(2)
  expect(simpleOrig?.successRate).toBeCloseTo(1.0, 5)

  // simple × minify: 2/2 = 100%
  const simpleMinify = byComplexity.find((r) => r.complexity === 'simple' && r.form === 'minify-whitespace')
  expect(simpleMinify?.trials).toBe(2)
  expect(simpleMinify?.passed).toBe(2)
  expect(simpleMinify?.successRate).toBeCloseTo(1.0, 5)

  // complex × minify: 1/2 = 50% — fragility rises with complexity
  const complexMinify = byComplexity.find((r) => r.complexity === 'complex' && r.form === 'minify-whitespace')
  expect(complexMinify?.trials).toBe(2)
  expect(complexMinify?.passed).toBe(1)
  expect(complexMinify?.successRate).toBeCloseTo(0.5, 5)

  // simple × minify should have higher success than complex × minify
  expect((simpleMinify?.successRate ?? 0)).toBeGreaterThan(complexMinify?.successRate ?? 1)
})

test('markdown contains complexity × form section header', () => {
  const md = buildEvalReport(trialsMulti, generatedMulti, 'tiktoken:o200k_base').markdown
  expect(md).toContain('## Edit success by complexity × form')
  expect(md).toContain('simple')
  expect(md).toContain('complex')
})

test('byComplexity only contains tiers that have trials', () => {
  const { byComplexity } = buildEvalReport(trialsMulti, generatedMulti, 'tiktoken:o200k_base')
  // no 'moderate' or 'very-complex' snippets in generatedMulti
  const hasModerate = byComplexity.some((r) => r.complexity === 'moderate')
  const hasVeryComplex = byComplexity.some((r) => r.complexity === 'very-complex')
  expect(hasModerate).toBe(false)
  expect(hasVeryComplex).toBe(false)
})
