import type { Cell } from './runner.ts'

export type ReportRow = {
  transform: string
  tokenizer: string
  method: string
  verifiedSamples: number
  unverifiedSamples: number
  verifiedMean: number | null
  verifiedMedian: number | null
  verifiedMin: number | null
  verifiedMax: number | null
  unverifiedMean: number | null
}

export type Report = { rows: ReportRow[]; markdown: string }

function mean(xs: number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0)
}

function minOf(xs: number[]): number | null {
  return xs.length === 0 ? null : Math.min(...xs)
}

function maxOf(xs: number[]): number | null {
  return xs.length === 0 ? null : Math.max(...xs)
}

export function buildReport(cells: Cell[]): Report {
  // baseline tokens keyed by file|tokenizer
  const baseline = new Map<string, number>()
  for (const c of cells) {
    if (c.transform === 'baseline' && c.tokens != null) baseline.set(`${c.file}|${c.tokenizer}`, c.tokens)
  }

  type Acc = { verified: number[]; unverified: number[]; method: string }
  const groups = new Map<string, Acc>()
  for (const c of cells) {
    if (c.tokens == null) continue
    const base = baseline.get(`${c.file}|${c.tokenizer}`)
    if (base == null || base === 0) continue
    const key = `${c.transform}|${c.tokenizer}`
    const acc = groups.get(key) ?? { verified: [], unverified: [], method: c.equivalence.method }
    const pct = ((base - c.tokens) / base) * 100
    if (c.equivalence.verified) acc.verified.push(pct)
    else acc.unverified.push(pct)
    groups.set(key, acc)
  }

  const rows: ReportRow[] = [...groups.entries()].map(([key, acc]) => {
    const [transform = '', tokenizer = ''] = key.split('|')
    return {
      transform,
      tokenizer,
      method: acc.method,
      verifiedSamples: acc.verified.length,
      unverifiedSamples: acc.unverified.length,
      verifiedMean: mean(acc.verified),
      verifiedMedian: median(acc.verified),
      verifiedMin: minOf(acc.verified),
      verifiedMax: maxOf(acc.verified),
      unverifiedMean: mean(acc.unverified),
    }
  })
  // Headline ranked by verifiedMean desc; null verifiedMean sorts LAST.
  rows.sort((a, b) => {
    if (a.verifiedMean == null && b.verifiedMean == null) return a.transform.localeCompare(b.transform)
    if (a.verifiedMean == null) return 1
    if (b.verifiedMean == null) return -1
    return b.verifiedMean - a.verifiedMean || a.transform.localeCompare(b.transform)
  })

  return { rows, markdown: renderMarkdown(rows) }
}

function fmt(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(1)}%`
}

function renderMarkdown(rows: ReportRow[]): string {
  const lines: string[] = []
  lines.push('# Token-Efficiency Report', '')
  lines.push(
    'Positive % = fewer tokens than `baseline`. The headline ranks only **verified** cells (machine-verified semantics-preserving). **Unverified** estimates (`manual` transforms and any cell whose output failed verification) are reported separately and are NOT lossless-guaranteed.',
    '',
  )

  // Section 1 — Verified lossless savings (ranked)
  lines.push('## Verified lossless savings (ranked)', '')
  lines.push('These rows are machine-verified semantics-preserving on the verified samples.', '')
  lines.push('| Transform | Tokenizer | Mean | Median | Min | Max | Verified n | Total n | Method |')
  lines.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    if (r.verifiedSamples === 0) continue
    const totalN = r.verifiedSamples + r.unverifiedSamples
    lines.push(
      `| ${r.transform} | ${r.tokenizer} | ${fmt(r.verifiedMean)} | ${fmt(r.verifiedMedian)} | ${fmt(r.verifiedMin)} | ${fmt(r.verifiedMax)} | ${r.verifiedSamples} | ${totalN} | ${r.method} |`,
    )
  }

  // Section 2 — Unverified estimates
  lines.push('', '## Unverified estimates — NOT lossless-guaranteed', '')
  lines.push(
    '⚠️ These figures include `manual` transforms (never machine-verified) and any cells whose transformed output FAILED verification (possibly semantically broken). They must NOT be treated as safe savings.',
    '',
  )
  lines.push('| Transform | Tokenizer | Method | Est. mean | Unverified n |')
  lines.push('|---|---|---|---|---|')
  for (const r of rows) {
    if (r.unverifiedSamples === 0) continue
    lines.push(`| ${r.transform} | ${r.tokenizer} | ${r.method} | ${fmt(r.unverifiedMean)} | ${r.unverifiedSamples} |`)
  }

  // Section 3 — Cross-tokenizer agreement
  lines.push('', '## Cross-tokenizer agreement', '')
  const byTransform = new Map<string, ReportRow[]>()
  for (const r of rows) byTransform.set(r.transform, [...(byTransform.get(r.transform) ?? []), r])
  for (const [transform, rs] of byTransform) {
    const signs = new Set(
      rs.map((r) => {
        const value = r.verifiedMean ?? r.unverifiedMean ?? 0
        return Math.sign(Math.round(value * 10))
      }),
    )
    const agree = signs.size <= 1
    lines.push(
      `- **${transform}**: ${agree ? 'consistent direction across tokenizers' : '⚠️ DISAGREEMENT across tokenizers (brittle)'}`,
    )
  }
  return lines.join('\n') + '\n'
}
