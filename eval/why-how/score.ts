// Scores the WHY/HOW eval candidates against each snippet's hidden editcheck and
// reports edit-success per form + the WHY effect (strip-how − strip-all).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { runTests } from '../src/score.ts'

const CandidatesSchema = z.array(
  z.object({ snippet: z.string(), form: z.string(), sample: z.number().int().nonnegative(), code: z.string() }),
)

type Row = { snippet: string; form: string; sample: number; passed: boolean }

const candidates = CandidatesSchema.parse(JSON.parse(readFileSync('eval/why-how/candidates.json', 'utf8')))

const rows: Row[] = []
for (const c of candidates) {
  const editcheck = join('eval/why-how/snippets', c.snippet, 'editcheck.ts')
  const r = await runTests(editcheck, c.code)
  rows.push({ snippet: c.snippet, form: c.form, sample: c.sample, passed: r.passed })
}

function rate(subset: Row[]): { passed: number; total: number } {
  return { passed: subset.filter((r) => r.passed).length, total: subset.length }
}

const forms = [...new Set(rows.map((r) => r.form))].sort()
const snippetNames = [...new Set(rows.map((r) => r.snippet))].sort()

const lines: string[] = []
lines.push('# WHY/HOW Comment Eval — Results', '')
lines.push(
  'Blind Sonnet subjects edited each snippet shown with WHY-comments kept (`strip-how`) vs all comments removed (`strip-all`). Scored by hidden tests encoding a constraint stated ONLY in the WHY-comment. **WHY effect = success(strip-how) − success(strip-all).**',
  '',
)
lines.push('| Form | Edit success | Trials |', '|---|---|---|')
for (const f of forms) {
  const { passed, total } = rate(rows.filter((r) => r.form === f))
  lines.push(`| ${f} | ${total === 0 ? '—' : `${((passed / total) * 100).toFixed(0)}%`} | ${passed}/${total} |`)
}

const sh = rate(rows.filter((r) => r.form === 'strip-how'))
const sa = rate(rows.filter((r) => r.form === 'strip-all'))
if (sh.total > 0 && sa.total > 0) {
  const effect = (sh.passed / sh.total - sa.passed / sa.total) * 100
  lines.push(
    '',
    `**WHY effect: ${effect.toFixed(0)} percentage points** — strip-how ${((sh.passed / sh.total) * 100).toFixed(0)}% vs strip-all ${((sa.passed / sa.total) * 100).toFixed(0)}%.`,
  )
}

lines.push('', '## Per-snippet (strip-how / strip-all)', '')
for (const s of snippetNames) {
  const sh1 = rate(rows.filter((r) => r.snippet === s && r.form === 'strip-how'))
  const sa1 = rate(rows.filter((r) => r.snippet === s && r.form === 'strip-all'))
  lines.push(`- **${s}**: strip-how ${sh1.passed}/${sh1.total}, strip-all ${sa1.passed}/${sa1.total}`)
}

const md = lines.join('\n') + '\n'
mkdirSync('results', { recursive: true })
writeFileSync('results/why-how-report.md', md)
writeFileSync('eval/why-how/results.json', JSON.stringify(rows, null, 2))
console.log(`[why-how] scored ${rows.length} trials — ${rows.filter((r) => r.passed).length} passed`)
console.log(md)
