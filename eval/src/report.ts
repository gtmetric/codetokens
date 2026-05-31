import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { FORMS, type Form } from './form.ts'
import { GeneratedSchema, type Generated } from './manifest.ts'
import { TrialResultsSchema, type TrialResult } from './trial.ts'
import { COMPLEXITY_LEVELS, type Complexity } from './snippet.ts'

export type ReportRow = {
  form: Form
  trials: number
  passed: number
  successRate: number
  meanTokens: number
  tokenSavingsPct: number
  deltaSuccessVsOriginal: number
}

export type ComplexityFormRow = {
  complexity: Complexity
  form: string
  trials: number
  passed: number
  successRate: number
}

export type EvalReport = { rows: ReportRow[]; byComplexity: ComplexityFormRow[]; markdown: string }

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

  // Aggregate by complexity × form, only for tiers that have trials
  const byComplexity: ComplexityFormRow[] = []
  for (const complexity of COMPLEXITY_LEVELS) {
    // Collect snippets for this tier
    const snippetsForTier = generated.snippets
      .filter((s) => s.complexity === complexity)
      .map((s) => s.name)
    if (snippetsForTier.length === 0) continue

    const tierTrials = trials.filter((t) => snippetsForTier.includes(t.snippet))
    if (tierTrials.length === 0) continue

    // Get forms present in these trials
    const formsPresent = [...new Set(tierTrials.map((t) => t.form))]
    for (const form of formsPresent) {
      const ts = tierTrials.filter((t) => t.form === form)
      const passed = ts.filter((t) => t.passed).length
      byComplexity.push({
        complexity,
        form,
        trials: ts.length,
        passed,
        successRate: ts.length === 0 ? 0 : passed / ts.length,
      })
    }
  }

  return { rows, byComplexity, markdown: renderMarkdown(rows, byComplexity, trials, tokenizer) }
}

function rateFor(trials: TrialResult[], form: Form): number {
  const ts = trials.filter((t) => t.form === form)
  return ts.length === 0 ? 0 : ts.filter((t) => t.passed).length / ts.length
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function renderMarkdown(rows: ReportRow[], byComplexity: ComplexityFormRow[], trials: TrialResult[], tokenizer: string): string {
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

  // Complexity × form breakdown
  lines.push('', '## Edit success by complexity × form', '')
  lines.push('Shows whether minification fragility rises with code complexity.', '')
  if (byComplexity.length === 0) {
    lines.push('_No data._')
  } else {
    // Collect tiers and forms present in byComplexity
    const tiersPresent = COMPLEXITY_LEVELS.filter((c) => byComplexity.some((r) => r.complexity === c))
    const formsPresent = [...new Set(byComplexity.map((r) => r.form))]
    // Header row
    lines.push(`| Complexity | ${formsPresent.map((f) => `${f} (pass/total)`).join(' | ')} |`)
    lines.push(`|---|${formsPresent.map(() => '---').join('|')}|`)
    for (const tier of tiersPresent) {
      const cells = formsPresent.map((form) => {
        const row = byComplexity.find((r) => r.complexity === tier && r.form === form)
        if (row === undefined) return '—'
        return `${pct(row.successRate)} (${row.passed}/${row.trials})`
      })
      lines.push(`| ${tier} | ${cells.join(' | ')} |`)
    }
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
