import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { loadSnippets } from './snippet.ts'
import { runTests } from './score.ts'
import { CandidatesSchema, TrialResultsSchema, type TrialResult } from './trial.ts'

async function main(): Promise<void> {
  const candidates = CandidatesSchema.parse(JSON.parse(readFileSync('eval/candidates.json', 'utf8')))
  const byName = new Map(loadSnippets().map((s) => [s.name, s]))
  const results: TrialResult[] = []
  for (const c of candidates) {
    const snippet = byName.get(c.snippet)
    if (snippet === undefined) {
      results.push({ snippet: c.snippet, form: c.form, sample: c.sample, passed: false, detail: 'unknown snippet' })
      continue
    }
    const r = await runTests(snippet.testPath, c.code)
    results.push({
      snippet: c.snippet,
      form: c.form,
      sample: c.sample,
      passed: r.passed,
      ...(r.detail === undefined ? {} : { detail: r.detail }),
    })
  }
  mkdirSync('results', { recursive: true })
  writeFileSync('results/eval-results.json', JSON.stringify(TrialResultsSchema.parse(results), null, 2))
  const passed = results.filter((r) => r.passed).length
  console.log(`[eval] scored ${results.length} trials — ${passed} passed`)
}

main().catch((err: unknown) => {
  console.error('[eval] score-all failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
