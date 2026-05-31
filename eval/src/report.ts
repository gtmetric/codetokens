import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { FORMS, type Form } from './form.ts'
import { GeneratedSchema, type Generated } from './manifest.ts'
import { TrialResultsSchema, type TrialResult } from './trial.ts'

export type ReportRow = {
  form: Form
  trials: number
  passed: number
  successRate: number
  meanTokens: number
  tokenSavingsPct: number
  deltaSuccessVsOriginal: number
}
export type EvalReport = { rows: ReportRow[]; markdown: string }

function meanFormTokens(generated: Generated, form: Form, tokenizer: string): number {
  const vals = generated.snippets
    .map((s) => s.forms[form]?.tokens[tokenizer])
    .filter((n): n is number => typeof n === 'number')
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length
}

export function buildEvalReport(trials: TrialResult[], generated: Generated, tokenizer: string): EvalReport {
  const origTokens = meanFormTokens(generated, 'original', tokenizer)
  const origRate = rateFor(trials, 'original')

  const rows: ReportRow[] = FORMS.map((form) => {
    const ts = trials.filter((t) => t.form === form)
    const passed = ts.filter((t) => t.passed).length
    const successRate = ts.length === 0 ? 0 : passed / ts.length
    const meanTokens = meanFormTokens(generated, form, tokenizer)
    return {
      form,
      trials: ts.length,
      passed,
      successRate,
      meanTokens,
      tokenSavingsPct: origTokens === 0 ? 0 : ((origTokens - meanTokens) / origTokens) * 100,
      deltaSuccessVsOriginal: successRate - origRate,
    }
  }).filter((r) => r.trials > 0)

  rows.sort((a, b) => b.tokenSavingsPct - a.tokenSavingsPct)
  return { rows, markdown: renderMarkdown(rows, trials, tokenizer) }
}

function rateFor(trials: TrialResult[], form: Form): number {
  const ts = trials.filter((t) => t.form === form)
  return ts.length === 0 ? 0 : ts.filter((t) => t.passed).length / ts.length
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function renderMarkdown(rows: ReportRow[], trials: TrialResult[], tokenizer: string): string {
  const lines: string[] = []
  lines.push('# Compact-Form Edit-Accuracy Report', '')
  lines.push(
    `Each cell: a fresh Sonnet subagent edited a snippet shown in one form, scored by running its hidden tests. Token cost = mean input tokens (\`${tokenizer}\`). "Δ success" is vs the \`original\` form.`,
    '',
  )
  lines.push('| Form | Edit success | Trials | Mean tokens | Token savings | Δ success vs original |')
  lines.push('|---|---|---|---|---|---|')
  for (const r of rows) {
    lines.push(
      `| ${r.form} | ${pct(r.successRate)} | ${r.passed}/${r.trials} | ${r.meanTokens.toFixed(0)} | ${r.tokenSavingsPct.toFixed(1)}% | ${(r.deltaSuccessVsOriginal * 100).toFixed(0)} pp |`,
    )
  }

  // Calibration: per-snippet success on the ORIGINAL form.
  lines.push('', '## Calibration (original-form success per snippet)', '')
  lines.push('A snippet whose `original`-form success is low is mis-calibrated (too hard/ambiguous) and its row should be discounted.', '')
  const snippets = [...new Set(trials.map((t) => t.snippet))].sort()
  for (const s of snippets) {
    const ts = trials.filter((t) => t.snippet === s && t.form === 'original')
    const passed = ts.filter((t) => t.passed).length
    const flag = ts.length > 0 && passed / ts.length < 2 / 3 ? ' ⚠️ mis-calibrated' : ''
    lines.push(`- **${s}**: ${passed}/${ts.length}${flag}`)
  }
  return lines.join('\n') + '\n'
}

// CLI
if (import.meta.main) {
  const generated = GeneratedSchema.parse(JSON.parse(readFileSync('eval/generated.json', 'utf8')))
  const trials = TrialResultsSchema.parse(JSON.parse(readFileSync('results/eval-results.json', 'utf8')))
  const { markdown } = buildEvalReport(trials, generated, 'tiktoken:o200k_base')
  mkdirSync('results', { recursive: true })
  writeFileSync('results/eval-report.md', markdown)
  console.log('[eval] wrote results/eval-report.md')
}
