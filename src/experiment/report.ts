import type { Cell } from './runner.ts'

export type ReportRow = {
  transform: string
  tokenizer: string
  meanPctReduction: number
  medianPctReduction: number
  minPctReduction: number
  maxPctReduction: number
  equivalenceRate: number
  method: string
  samples: number
}

export type Report = { rows: ReportRow[]; markdown: string }

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0)
}

export function buildReport(cells: Cell[]): Report {
  // baseline tokens keyed by file|tokenizer
  const baseline = new Map<string, number>()
  for (const c of cells) {
    if (c.transform === 'baseline' && c.tokens != null) baseline.set(`${c.file}|${c.tokenizer}`, c.tokens)
  }

  type Acc = { pct: number[]; verified: number; total: number; method: string }
  const groups = new Map<string, Acc>()
  for (const c of cells) {
    if (c.tokens == null) continue
    const base = baseline.get(`${c.file}|${c.tokenizer}`)
    if (base == null || base === 0) continue
    const key = `${c.transform}|${c.tokenizer}`
    const acc = groups.get(key) ?? { pct: [], verified: 0, total: 0, method: c.equivalence.method }
    acc.pct.push(((base - c.tokens) / base) * 100)
    acc.total += 1
    if (c.equivalence.verified) acc.verified += 1
    groups.set(key, acc)
  }

  const rows: ReportRow[] = [...groups.entries()].map(([key, acc]) => {
    const [transform = '', tokenizer = ''] = key.split('|')
    return {
      transform,
      tokenizer,
      meanPctReduction: mean(acc.pct),
      medianPctReduction: median(acc.pct),
      minPctReduction: Math.min(...acc.pct),
      maxPctReduction: Math.max(...acc.pct),
      equivalenceRate: acc.total === 0 ? 0 : acc.verified / acc.total,
      method: acc.method,
      samples: acc.total,
    }
  })
  rows.sort((a, b) => b.meanPctReduction - a.meanPctReduction || a.transform.localeCompare(b.transform))

  return { rows, markdown: renderMarkdown(rows) }
}

function fmt(n: number): string {
  return `${n.toFixed(1)}%`
}

function renderMarkdown(rows: ReportRow[]): string {
  const lines: string[] = []
  lines.push('# Token-Efficiency Report', '')
  lines.push(
    'Positive % = fewer tokens than `baseline`. `equiv` = fraction of files whose semantic equivalence was machine-verified (`manual` transforms are never auto-verified).',
    '',
  )
  lines.push('| Transform | Tokenizer | Mean | Median | Min | Max | Equiv | Method | n |')
  lines.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    lines.push(
      `| ${r.transform} | ${r.tokenizer} | ${fmt(r.meanPctReduction)} | ${fmt(r.medianPctReduction)} | ${fmt(r.minPctReduction)} | ${fmt(r.maxPctReduction)} | ${(r.equivalenceRate * 100).toFixed(0)}% | ${r.method} | ${r.samples} |`,
    )
  }
  lines.push('', '## Cross-tokenizer agreement', '')
  const byTransform = new Map<string, ReportRow[]>()
  for (const r of rows) byTransform.set(r.transform, [...(byTransform.get(r.transform) ?? []), r])
  for (const [transform, rs] of byTransform) {
    const signs = new Set(rs.map((r) => Math.sign(Math.round(r.meanPctReduction * 10))))
    const agree = signs.size <= 1
    lines.push(
      `- **${transform}**: ${agree ? 'consistent direction across tokenizers' : '⚠️ DISAGREEMENT across tokenizers (brittle)'}`,
    )
  }
  return lines.join('\n') + '\n'
}
