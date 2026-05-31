// test/experiment/report.test.ts
import { test, expect } from 'bun:test'
import { buildReport } from '../../src/experiment/report.ts'
import type { Cell } from '../../src/experiment/runner.ts'

const ok = { verified: true, method: 'canonical' as const }
const cells: Cell[] = [
  { file: 'a.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 100, chars: 400, equivalence: ok },
  { file: 'a.js', lang: 'js', transform: 'minify', tokenizer: 'T', tokens: 80, chars: 300, equivalence: ok },
  { file: 'b.js', lang: 'js', transform: 'baseline', tokenizer: 'T', tokens: 200, chars: 800, equivalence: ok },
  { file: 'b.js', lang: 'js', transform: 'minify', tokenizer: 'T', tokens: 150, chars: 600, equivalence: ok },
]

test('computes mean % reduction vs baseline per transform/tokenizer', () => {
  const report = buildReport(cells)
  const row = report.rows.find((r) => r.transform === 'minify' && r.tokenizer === 'T')
  // file a: (100-80)/100 = 20%, file b: (200-150)/200 = 25% → mean 22.5%
  expect(row?.meanPctReduction).toBeCloseTo(22.5, 1)
  expect(row?.equivalenceRate).toBe(1)
})

test('markdown renders a ranked table and a findings section', () => {
  const md = buildReport(cells).markdown
  expect(md).toContain('# Token-Efficiency Report')
  expect(md).toContain('minify')
  expect(md).toContain('%')
})

test('baseline reduction is zero', () => {
  const report = buildReport(cells)
  const row = report.rows.find((r) => r.transform === 'baseline' && r.tokenizer === 'T')
  expect(row?.meanPctReduction).toBeCloseTo(0, 5)
})
