import { test, expect } from 'bun:test'
import { buildEvalReport } from './report.ts'
import type { TrialResult } from './trial.ts'
import type { Generated } from './manifest.ts'

const generated: Generated = {
  snippets: [
    {
      name: 's1', lang: 'ts', exportName: 'f', request: 'x',
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
