// test/experiment/report.test.ts
import { test, expect } from 'bun:test'
import { buildReport } from '../../src/experiment/report.ts'
import type { Cell } from '../../src/experiment/runner.ts'

const ok = { verified: true, method: 'canonical' as const }
const bad = { verified: false, method: 'canonical' as const, detail: 'canonical forms differ' }
const manual = { verified: false, method: 'manual' as const, detail: 'parse-ok; not machine-verified' }

const cells: Cell[] = [
  { file: 'a.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
  { file: 'a.js', lang: 'js', transform: 'minify', tokenizer: 'T', tokens: 80, chars: 300, equivalence: ok },
  { file: 'b.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 200, chars: 800, equivalence: ok },
  { file: 'b.js', lang: 'js', transform: 'minify', tokenizer: 'T', tokens: 150, chars: 600, equivalence: ok },
]

test('computes verified mean % reduction vs baseline per transform/tokenizer', () => {
  const report = buildReport(cells)
  const row = report.rows.find((r) => r.transform === 'minify' && r.tokenizer === 'T')
  // file a: (100-80)/100 = 20%, file b: (200-150)/200 = 25% → verified mean 22.5%
  expect(row?.verifiedMean).toBeCloseTo(22.5, 1)
  expect(row?.verifiedSamples).toBe(2)
  expect(row?.unverifiedSamples).toBe(0)
  expect(row?.unverifiedMean).toBeNull()
})

test('headline aggregate EXCLUDES unverified cells', () => {
  // Same tokenizer T: one verified cell at 50%, one unverified cell at 90%.
  const mixed: Cell[] = [
    { file: 'a.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
    { file: 'a.js', lang: 'js', transform: 'mix', tokenizer: 'T', tokens: 50, chars: 200, equivalence: ok }, // 50% verified
    { file: 'b.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
    { file: 'b.js', lang: 'js', transform: 'mix', tokenizer: 'T', tokens: 10, chars: 40, equivalence: bad }, // 90% UNVERIFIED
  ]
  const report = buildReport(mixed)
  const row = report.rows.find((r) => r.transform === 'mix' && r.tokenizer === 'T')
  expect(row?.verifiedMean).toBe(50) // NOT 70
  expect(row?.unverifiedMean).toBe(90)
  expect(row?.verifiedSamples).toBe(1)
  expect(row?.unverifiedSamples).toBe(1)
})

test('manual-only transform has null verifiedMean and appears only in unverified section', () => {
  const manualOnly: Cell[] = [
    { file: 'a.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
    { file: 'a.js', lang: 'js', transform: 'arrow', tokenizer: 'T', tokens: 60, chars: 240, equivalence: manual },
    { file: 'b.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
    { file: 'b.js', lang: 'js', transform: 'arrow', tokenizer: 'T', tokens: 80, chars: 320, equivalence: manual },
  ]
  const report = buildReport(manualOnly)
  const row = report.rows.find((r) => r.transform === 'arrow' && r.tokenizer === 'T')
  expect(row?.verifiedMean).toBeNull()
  expect(row?.verifiedSamples).toBe(0)
  expect(row?.unverifiedSamples).toBe(2)
  expect(row?.unverifiedMean).toBeCloseTo(30, 1) // (40+20)/2

  const md = report.markdown
  // Verified section must not list 'arrow'; unverified section must.
  const [, afterUnverified = ''] = md.split('## Unverified estimates')
  const [beforeUnverified = ''] = md.split('## Unverified estimates')
  expect(beforeUnverified).not.toContain('arrow')
  expect(afterUnverified).toContain('arrow')
})

test('null verifiedMean sorts last in headline rows', () => {
  const mixed: Cell[] = [
    { file: 'a.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
    { file: 'a.js', lang: 'js', transform: 'arrow', tokenizer: 'T', tokens: 60, chars: 240, equivalence: manual },
    { file: 'a.js', lang: 'js', transform: 'minify', tokenizer: 'T', tokens: 80, chars: 320, equivalence: ok },
  ]
  const rows = buildReport(mixed).rows
  const lastRow = rows[rows.length - 1]
  expect(lastRow?.transform).toBe('arrow')
  expect(lastRow?.verifiedMean).toBeNull()
})

test('markdown renders the three required sections', () => {
  const md = buildReport(cells).markdown
  expect(md).toContain('# Token-Efficiency Report')
  expect(md).toContain('## Verified lossless savings (ranked)')
  expect(md).toContain('## Unverified estimates — NOT lossless-guaranteed')
  expect(md).toContain('## Cross-tokenizer agreement')
  expect(md).toContain('minify')
})

test('baseline verified reduction is zero', () => {
  const report = buildReport(cells)
  const row = report.rows.find((r) => r.transform === 'baseline' && r.tokenizer === 'T')
  expect(row?.verifiedMean).toBeCloseTo(0, 5)
})
