# Cycle 2 — Compact-Form Edit-Accuracy Eval — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an eval that measures whether presenting source in token-reduced forms degrades a coding agent's ability to correctly *edit* it — fresh **Sonnet** subagents edit code shown in 5 forms, scored objectively by running hidden test suites, reported as success-rate-vs-token-cost per form.

**Architecture:** Deterministic Bun scripts bracket a model-in-the-loop Workflow. `generate.ts` turns each snippet's source into 5 forms (+ token counts) reusing Cycle 1's transforms/tokenizers → a **Workflow** fans out ~120 blind Sonnet subjects that return edited modules → `score-all.ts` runs each candidate against the snippet's hidden tests in an isolated temp dir → `report.ts` aggregates. Subjects are blind (prompt-only, no ground truth); scoring is objective (test execution, no LLM judging).

**Tech Stack:** Bun + strict TS (Cycle 1 tsconfig flags), reuse `src/transform` + `src/tokenizer`, Zod at boundaries, `bun:test` (both for the harness's own tests and as the snippet test runner), Workflow tool on Sonnet for subject orchestration.

**Spec:** `docs/superpowers/specs/2026-05-31-cycle2-edit-eval-design.md`.

---

## File Structure

```
eval/
  snippets/<name>/
    subject.ts          # bespoke module: comments + TS types, one stable export, pure/deterministic, no deps
    request.md          # plain-English change request (must NOT rename the export)
    reference.ts        # golden post-edit module (validates tests; NEVER shown to subjects)
    editcheck.ts        # bun:test suite importing './subject.ts'; PASSES on reference, FAILS on original.
                        #   Named so the repo-wide `bun test` does NOT auto-discover it — only the scorer runs it.
    meta.json           # { exportName, lang }
  src/
    snippet.ts          # loader + Zod meta schema
    form.ts             # FORMS + makeForm() (maps form → Cycle 1 transform)
    score.ts            # runTests(testPath, code) → {passed, detail} (isolated temp dir + timeout)
    generate.ts         # CLI: snippets → eval/generated.json (forms + token counts)
    prompt.ts           # buildSubjectPrompt(formCode, request, exportName)
    extract.ts          # extractCode(modelResponse) → string
    score-all.ts        # CLI: eval/candidates.json → results/eval-results.json
    report.ts           # CLI: eval-results.json + generated.json → results/eval-report.md
    eval.workflow.js    # Workflow script: fan out Sonnet subjects, return candidates
  snippet.test.ts       # well-posedness gate for ALL snippets
results/
  eval-report.md        # committed
  eval-results.json     # gitignored
```

Generated/large artifacts (`eval/generated.json`, `eval/candidates.json`, `results/eval-results.json`) are gitignored; `results/eval-report.md` is committed.

---

## Task 1: Cycle-2 scaffold

**Files:**
- Modify: `tsconfig.json`, `package.json`, `.gitignore`
- Create: `eval/` directory tree (empty dirs created as files land)

- [ ] **Step 1: Create a feature branch**

Run:
```bash
cd /Users/gtmetric/Projects/js-exp
git checkout main && git checkout -b cycle-2-eval
git branch --show-current
```
Expected: `cycle-2-eval`.

- [ ] **Step 2: Add `eval` to tsconfig `include`**

In `tsconfig.json`, change the `include` array to:
```json
"include": ["src", "test", "scripts", "eval"]
```

- [ ] **Step 3: Add eval scripts to `package.json`**

Merge these into the `"scripts"` object (keep existing entries):
```json
"eval:generate": "bun run eval/src/generate.ts",
"eval:score": "bun run eval/src/score-all.ts",
"eval:report": "bun run eval/src/report.ts"
```

- [ ] **Step 4: Add generated artifacts to `.gitignore`**

Append:
```
eval/generated.json
eval/candidates.json
results/eval-results.json
```

- [ ] **Step 5: Verify typecheck still clean**

Run: `bun run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json package.json .gitignore
git commit -m "chore: cycle-2 scaffold (eval include, scripts, gitignore)"
```

---

## Task 2: Form generator

**Files:**
- Create: `eval/src/form.ts`
- Test: `eval/src/form.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// eval/src/form.test.ts
import { test, expect } from 'bun:test'
import { FORMS, makeForm } from './form.ts'

const SRC = `/** doc */\nexport function add(a: number, b: number): number {\n  const sum = a + b // inline\n  return sum\n}\n`

test('FORMS lists the 5 forms with original first', () => {
  expect(FORMS[0]).toBe('original')
  expect(FORMS.length).toBe(5)
})

test('every form preserves the export and stays parseable', async () => {
  const { parses } = await import('../../src/transform/babel.ts')
  for (const form of FORMS) {
    const out = makeForm(SRC, 'ts', form)
    expect(out).toContain('add') // export name preserved
    expect(parses(out, out.includes(': number') ? 'ts' : 'js')).toBe(true)
  }
})

test('strip-types removes annotations; minify shrinks length', () => {
  expect(makeForm(SRC, 'ts', 'strip-types')).not.toContain(': number')
  expect(makeForm(SRC, 'ts', 'minify-whitespace').length).toBeLessThan(SRC.length)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test eval/src/form.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `eval/src/form.ts`**

```ts
import type { Lang } from '../../src/lang.ts'
import type { Transform } from '../../src/transform/transform.type.ts'
import { baseline } from '../../src/transform/transforms/baseline.ts'
import { stripComments } from '../../src/transform/transforms/strip-comments.ts'
import { stripTypes } from '../../src/transform/transforms/strip-types.ts'
import { minifyWhitespace } from '../../src/transform/transforms/minify-whitespace.ts'
import { combinedBest } from '../../src/transform/transforms/combined-best.ts'

export const FORMS = ['original', 'strip-comments', 'strip-types', 'minify-whitespace', 'combined-best'] as const
export type Form = (typeof FORMS)[number]

const FORM_TRANSFORM = {
  original: baseline,
  'strip-comments': stripComments,
  'strip-types': stripTypes,
  'minify-whitespace': minifyWhitespace,
  'combined-best': combinedBest,
} satisfies Record<Form, Transform>

export function makeForm(code: string, lang: Lang, form: Form): string {
  return FORM_TRANSFORM[form].apply(code, lang)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test eval/src/form.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add eval/src/form.ts eval/src/form.test.ts
git commit -m "feat(eval): form generator reusing Cycle 1 transforms"
```

---

## Task 3: Test-execution scorer

**Files:**
- Create: `eval/src/score.ts`
- Test: `eval/src/score.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// eval/src/score.test.ts
import { test, expect } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runTests } from './score.ts'

function makeTestFile(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'score-fixture-'))
  const path = join(dir, 'fixture.test.ts')
  writeFileSync(
    path,
    `import { test, expect } from 'bun:test'\nimport { f } from './subject.ts'\ntest('doubles', () => { expect(f(3)).toBe(6) })\n`,
  )
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

test('correct candidate passes', async () => {
  const { path, cleanup } = makeTestFile()
  const r = await runTests(path, 'export function f(n: number): number { return n * 2 }')
  cleanup()
  expect(r.passed).toBe(true)
})

test('wrong candidate fails', async () => {
  const { path, cleanup } = makeTestFile()
  const r = await runTests(path, 'export function f(n: number): number { return n + 2 }')
  cleanup()
  expect(r.passed).toBe(false)
})

test('empty candidate fails with reason', async () => {
  const { path, cleanup } = makeTestFile()
  const r = await runTests(path, '   ')
  cleanup()
  expect(r.passed).toBe(false)
  expect(r.detail).toContain('no code')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test eval/src/score.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `eval/src/score.ts`**

```ts
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type ScoreResult = { passed: boolean; detail?: string }

/**
 * Run a snippet's hidden test suite against candidate code.
 * The fixture imports './subject.ts'; we write `code` as subject.ts in an
 * isolated temp dir, copy the fixture beside it (renamed to a `.test.ts` so bun
 * discovers it there), and run `bun test` with a timeout.
 */
export async function runTests(testPath: string, code: string, timeoutMs = 15000): Promise<ScoreResult> {
  if (code.trim().length === 0) return { passed: false, detail: 'no code produced' }
  const dir = mkdtempSync(join(tmpdir(), 'eval-trial-'))
  try {
    writeFileSync(join(dir, 'subject.ts'), code)
    copyFileSync(testPath, join(dir, 'editcheck.test.ts'))
    const proc = Bun.spawn(['bun', 'test', 'editcheck.test.ts'], {
      cwd: dir,
      stdout: 'pipe',
      stderr: 'pipe',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const stderr = await new Response(proc.stderr).text()
    const stdout = await new Response(proc.stdout).text()
    const exit = await proc.exited
    if (exit === 0) return { passed: true }
    return { passed: false, detail: (stderr || stdout).slice(-600) }
  } catch (err) {
    return { passed: false, detail: `execution error/timeout: ${String(err)}` }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test eval/src/score.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add eval/src/score.ts eval/src/score.test.ts
git commit -m "feat(eval): isolated test-execution scorer with timeout"
```

---

## Task 4: Snippet loader + well-posedness gate + the exemplar snippet

**Files:**
- Create: `eval/src/snippet.ts`, `eval/snippet.test.ts`
- Create exemplar: `eval/snippets/tiered-pricing/{subject.ts, request.md, reference.ts, tiered-pricing.test.ts, meta.json}`

- [ ] **Step 1: Author the exemplar snippet `tiered-pricing`**

`eval/snippets/tiered-pricing/subject.ts`:
```ts
/** A line item in a customer order. */
export type Item = { sku: string; price: number; quantity: number }

/**
 * Compute the total price of an order in whole cents.
 *
 * Bespoke pricing rules:
 * - Each line costs price * quantity.
 * - Lines with quantity >= 5 get a 10% discount on that line (rounded).
 * - If the pre-discount subtotal exceeds 10000 cents, a flat 200-cent loyalty
 *   credit is subtracted from the running total.
 * - The final total is never negative.
 */
export function priceOrder(items: Item[]): number {
  let subtotal = 0
  let discounted = 0
  for (const item of items) {
    const line = item.price * item.quantity
    subtotal += line
    discounted += item.quantity >= 5 ? Math.round(line * 0.9) : line
  }
  const afterLoyalty = subtotal > 10000 ? discounted - 200 : discounted
  return Math.max(0, afterLoyalty)
}
```

`eval/snippets/tiered-pricing/request.md`:
```md
Add a 5% surcharge applied to the final total (after all existing discounts and
the loyalty credit) whenever the order contains at least one line with quantity
strictly greater than 10. Round the surcharged total to the nearest whole cent.
The total must still never be negative, and every existing rule must be unchanged
otherwise.
```

`eval/snippets/tiered-pricing/reference.ts`:
```ts
/** A line item in a customer order. */
export type Item = { sku: string; price: number; quantity: number }

export function priceOrder(items: Item[]): number {
  let subtotal = 0
  let discounted = 0
  let hasBulkLine = false
  for (const item of items) {
    const line = item.price * item.quantity
    subtotal += line
    discounted += item.quantity >= 5 ? Math.round(line * 0.9) : line
    if (item.quantity > 10) hasBulkLine = true
  }
  const afterLoyalty = subtotal > 10000 ? discounted - 200 : discounted
  const surcharged = hasBulkLine ? Math.round(afterLoyalty * 1.05) : afterLoyalty
  return Math.max(0, surcharged)
}
```

`eval/snippets/tiered-pricing/editcheck.ts` (named so the repo-wide `bun test` does NOT auto-discover it):
```ts
import { test, expect } from 'bun:test'
import { priceOrder } from './subject.ts'

test('regression: plain line total, no discounts', () => {
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 2 }])).toBe(200)
})
test('regression: per-line 10% discount at quantity >= 5', () => {
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 5 }])).toBe(450)
})
test('regression: 200-cent loyalty credit when subtotal exceeds 10000', () => {
  expect(priceOrder([{ sku: 'a', price: 2000, quantity: 6 }])).toBe(10600)
})
test('new: 5% surcharge when a line quantity exceeds 10', () => {
  // line 1100 → round(990) → q>10 → round(990*1.05)=1040
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 11 }])).toBe(1040)
})
test('new: no surcharge when all quantities are 10 or less', () => {
  expect(priceOrder([{ sku: 'a', price: 100, quantity: 10 }])).toBe(900)
})
```

`eval/snippets/tiered-pricing/meta.json`:
```json
{ "exportName": "priceOrder", "lang": "ts" }
```

- [ ] **Step 2: Write the failing test (well-posedness gate)**

```ts
// eval/snippet.test.ts
import { test, expect } from 'bun:test'
import { loadSnippets } from './src/snippet.ts'
import { runTests } from './src/score.ts'

const snippets = loadSnippets()

test('at least one snippet exists', () => {
  expect(snippets.length).toBeGreaterThan(0)
})

for (const s of snippets) {
  test(`[${s.name}] reference passes its own tests`, async () => {
    const r = await runTests(s.testPath, s.reference)
    expect(r.passed).toBe(true)
  })
  test(`[${s.name}] original (pre-change) FAILS the tests`, async () => {
    const r = await runTests(s.testPath, s.subject)
    expect(r.passed).toBe(false)
  })
  test(`[${s.name}] subject declares the stable export`, () => {
    expect(s.subject).toContain(s.meta.exportName)
    expect(s.reference).toContain(s.meta.exportName)
  })
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test eval/snippet.test.ts`
Expected: FAIL — `eval/src/snippet.ts` not found.

- [ ] **Step 4: Write `eval/src/snippet.ts`**

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { LANGS, type Lang } from '../../src/lang.ts'

const MetaSchema = z.object({ exportName: z.string().min(1), lang: z.enum(LANGS) })
export type SnippetMeta = z.infer<typeof MetaSchema>

export type Snippet = {
  name: string
  dir: string
  meta: SnippetMeta
  subject: string
  reference: string
  request: string
  testPath: string
}

export function loadSnippets(root = 'eval/snippets'): Snippet[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(root, d.name)
      const meta = MetaSchema.parse(JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')))
      return {
        name: d.name,
        dir,
        meta,
        subject: readFileSync(join(dir, 'subject.ts'), 'utf8'),
        reference: readFileSync(join(dir, 'reference.ts'), 'utf8'),
        request: readFileSync(join(dir, 'request.md'), 'utf8'),
        testPath: join(dir, 'editcheck.ts'),
      }
    })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test eval/snippet.test.ts`
Expected: PASS (1 + 3 tests for the exemplar). `bun run typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add eval/src/snippet.ts eval/snippet.test.ts eval/snippets/tiered-pricing
git commit -m "feat(eval): snippet loader + well-posedness gate + tiered-pricing exemplar"
```

---

## Task 5: Author the remaining 7 snippets

**Goal:** author 7 more snippet directories following the `tiered-pricing` exemplar pattern (Task 4). Each is creative fixture work; the **objective gate is `eval/snippet.test.ts` passing for all snippets** (reference passes its tests, original fails them, single stable export present in both).

**Properties every snippet MUST satisfy:**
- `subject.ts`: bespoke / arbitrary logic (NOT a recognizable textbook algorithm), **pure & deterministic**, **no external/runtime imports**, JSDoc comments + TS type annotations present, exactly one named export named in `meta.json`.
- `request.md`: a single, unambiguous behavioral change answerable from the code in any form; must NOT rename the export.
- `reference.ts`: the original with the change correctly applied; identical export signature.
- `editcheck.ts` (NOT `*.test.ts` — must not be auto-discovered by repo-wide `bun test`): a `bun:test` suite importing `./subject.ts`; ≥2 regression assertions (existing behavior) + ≥2 assertions for the new behavior; PASSES on `reference.ts`, FAILS on `subject.ts`.
- `meta.json`: `{ "exportName": "...", "lang": "ts" }` (use `"lang": "js"` only if you author a plain-JS snippet — keep most as `ts` so strip-types has something to remove).

**Author these 7** (vary the domain and difficulty; export signature + change are the contract — author subject/reference/tests so the gate passes):

| name | export signature | bespoke domain (one line) | change request |
|---|---|---|---|
| `csv-rownormalizer` | `normalizeRow(raw: string): string[]` | split on commas, trim cells, collapse internal runs of spaces to one, drop trailing empty cells | also unquote cells wrapped in matching double-quotes, preserving commas inside the quotes |
| `interval-merge` | `mergeIntervals(spans: [number, number][]): [number, number][]` | merge overlapping numeric spans, sorted by start | treat spans that merely *touch* (end === next start) as overlapping and merge them too |
| `slug-builder` | `buildSlug(title: string, maxWords: number): string` | lowercase, keep alphanumerics, join words with `-`, cap at maxWords | drop common stop-words (`a`, `the`, `of`, `and`) before applying the word cap |
| `retry-budget` | `planRetries(attempts: number, baseMs: number): number[]` | produce per-attempt backoff delays doubling each time | cap each delay at 5000ms and add a fixed 50ms after the cap is reached |
| `grade-curve` | `curveScores(scores: number[]): number[]` | shift all scores so the max becomes 100, clamp to [0,100] | round each curved score to the nearest multiple of 5 |
| `path-depth` | `deepestKey(obj: Record<string, unknown>): string` | return the dotted path to the most deeply nested key | on ties, return the path that is alphabetically first |
| `token-bucket` | `refill(tokens: number, elapsedMs: number, ratePerSec: number, cap: number): number` | add refilled tokens for elapsed time, clamp to cap | never refill above cap AND never let a negative starting `tokens` go below 0 after refill |

- [ ] **Step 1: Author all 7 directories** under `eval/snippets/<name>/` with the 5 files each, following the exemplar and the table above.

- [ ] **Step 2: Run the well-posedness gate**

Run: `bun test eval/snippet.test.ts`
Expected: PASS — for all 8 snippets: reference passes, original fails, export present. If any snippet's reference doesn't pass or original doesn't fail, FIX that snippet (the change must be real and tested). Do not weaken the gate.

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: exit 0 (subject + reference + tests are all type-clean TS).

- [ ] **Step 4: Commit**

```bash
git add eval/snippets
git commit -m "feat(eval): author 7 bespoke eval snippets (8 total)"
```

---

## Task 6: Prompt builder + code extractor

**Files:**
- Create: `eval/src/prompt.ts`, `eval/src/extract.ts`
- Test: `eval/src/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// eval/src/prompt.test.ts
import { test, expect } from 'bun:test'
import { buildSubjectPrompt } from './prompt.ts'
import { extractCode } from './extract.ts'

test('prompt embeds code, request, export, and asks for full module', () => {
  const p = buildSubjectPrompt('export const x = 1', 'make it 2', 'x')
  expect(p).toContain('export const x = 1')
  expect(p).toContain('make it 2')
  expect(p).toContain('x')
  expect(p.toLowerCase()).toContain('complete')
})

test('extractCode pulls the largest fenced block', () => {
  const resp = 'Sure!\n```ts\nexport const x = 2\n```\nDone.'
  expect(extractCode(resp)).toBe('export const x = 2')
})

test('extractCode falls back to whole response when unfenced', () => {
  expect(extractCode('export const x = 2')).toBe('export const x = 2')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test eval/src/prompt.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `eval/src/prompt.ts`**

```ts
export function buildSubjectPrompt(formCode: string, request: string, exportName: string): string {
  return [
    'You are editing a JavaScript/TypeScript module. Below is its COMPLETE current source.',
    '',
    '```',
    formCode,
    '```',
    '',
    'Make exactly this change:',
    '',
    request.trim(),
    '',
    'Requirements:',
    '- Return the COMPLETE modified module source (not a diff or a fragment).',
    `- Preserve the existing export \`${exportName}\` (same name and calling convention).`,
    '- Output ONLY the code in a single fenced code block. No prose.',
  ].join('\n')
}
```

- [ ] **Step 4: Write `eval/src/extract.ts`**

```ts
const FENCE = /```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g

export function extractCode(response: string): string {
  const blocks = [...response.matchAll(FENCE)].map((m) => m[1] ?? '')
  if (blocks.length > 0) {
    return blocks.reduce((a, b) => (b.length > a.length ? b : a)).trim()
  }
  return response.trim()
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test eval/src/prompt.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add eval/src/prompt.ts eval/src/extract.ts eval/src/prompt.test.ts
git commit -m "feat(eval): subject prompt builder + code extractor"
```

---

## Task 7: Manifest generator (`generate.ts`)

**Files:**
- Create: `eval/src/generate.ts`, `eval/src/manifest.ts` (shared types)
- Test: `eval/src/manifest.test.ts`

- [ ] **Step 1: Write the failing test** (validates the manifest shape via its schema)

```ts
// eval/src/manifest.test.ts
import { test, expect } from 'bun:test'
import { GeneratedSchema } from './manifest.ts'

test('GeneratedSchema accepts a well-formed manifest', () => {
  const ok = {
    snippets: [
      {
        name: 's',
        lang: 'ts',
        exportName: 'f',
        request: 'do x',
        forms: { original: { code: 'export const f = 1', tokens: { 'tiktoken:o200k_base': 5 } } },
      },
    ],
  }
  expect(() => GeneratedSchema.parse(ok)).not.toThrow()
})

test('GeneratedSchema rejects a manifest missing tokens', () => {
  const bad = { snippets: [{ name: 's', lang: 'ts', exportName: 'f', request: 'x', forms: { original: { code: 'y' } } }] }
  expect(() => GeneratedSchema.parse(bad)).toThrow()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test eval/src/manifest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `eval/src/manifest.ts`**

```ts
import { z } from 'zod'
import { LANGS } from '../../src/lang.ts'

const FormDataSchema = z.object({ code: z.string(), tokens: z.record(z.string(), z.number()) })

export const GeneratedSchema = z.object({
  snippets: z.array(
    z.object({
      name: z.string(),
      lang: z.enum(LANGS),
      exportName: z.string(),
      request: z.string(),
      // Keyed by form name; a partial set is allowed so the schema stays robust.
      forms: z.record(z.string(), FormDataSchema),
    }),
  ),
})
export type Generated = z.infer<typeof GeneratedSchema>
```

- [ ] **Step 4: Write `eval/src/generate.ts`**

```ts
import { writeFileSync } from 'node:fs'
import { loadConfig } from '../../src/config.ts'
import { createTokenizers } from '../../src/tokenizer/index.ts'
import { loadSnippets } from './snippet.ts'
import { FORMS, makeForm } from './form.ts'
import { GeneratedSchema, type Generated } from './manifest.ts'

async function main(): Promise<void> {
  const tokenizers = createTokenizers(loadConfig())
  const snippets = loadSnippets()
  const out: Generated['snippets'] = []
  for (const s of snippets) {
    const forms: Generated['snippets'][number]['forms'] = {}
    for (const form of FORMS) {
      const code = makeForm(s.subject, s.meta.lang, form)
      const tokens: Record<string, number> = {}
      for (const t of tokenizers) tokens[t.name] = await t.countTokens(code)
      forms[form] = { code, tokens }
    }
    out.push({ name: s.name, lang: s.meta.lang, exportName: s.meta.exportName, request: s.request, forms })
  }
  const manifest = GeneratedSchema.parse({ snippets: out })
  writeFileSync('eval/generated.json', JSON.stringify(manifest, null, 2))
  console.log(`[eval] wrote eval/generated.json — ${out.length} snippets × ${FORMS.length} forms`)
}

main().catch((err: unknown) => {
  console.error('[eval] generate failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
```

- [ ] **Step 5: Run the test, then run the generator for real**

Run: `bun test eval/src/manifest.test.ts`
Expected: PASS (2 tests).

Run: `bun run eval:generate`
Expected: `[eval] wrote eval/generated.json — 8 snippets × 5 forms` (an `ANTHROPIC_API_KEY not set` warning is expected and fine). Confirm `eval/generated.json` exists and each snippet has 5 forms each with a `tokens` map.

- [ ] **Step 6: Commit**

```bash
git add eval/src/manifest.ts eval/src/generate.ts eval/src/manifest.test.ts
git commit -m "feat(eval): forms+tokens manifest generator"
```

---

## Task 8: Scorer CLI (`score-all.ts`)

**Files:**
- Create: `eval/src/score-all.ts`, `eval/src/trial.ts` (shared types)
- Test: `eval/src/score-all.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// eval/src/score-all.test.ts
import { test, expect } from 'bun:test'
import { CandidatesSchema, TrialResultsSchema } from './trial.ts'

test('CandidatesSchema validates a candidate array', () => {
  const ok = [{ snippet: 's', form: 'original', sample: 0, code: 'export const f = 1' }]
  expect(() => CandidatesSchema.parse(ok)).not.toThrow()
})

test('TrialResultsSchema validates results', () => {
  const ok = [{ snippet: 's', form: 'original', sample: 0, passed: true }]
  expect(() => TrialResultsSchema.parse(ok)).not.toThrow()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test eval/src/score-all.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `eval/src/trial.ts`**

```ts
import { z } from 'zod'
import { FORMS } from './form.ts'

export const CandidateSchema = z.object({
  snippet: z.string(),
  form: z.enum(FORMS),
  sample: z.number().int().nonnegative(),
  code: z.string(),
})
export const CandidatesSchema = z.array(CandidateSchema)
export type Candidate = z.infer<typeof CandidateSchema>

export const TrialResultSchema = z.object({
  snippet: z.string(),
  form: z.enum(FORMS),
  sample: z.number().int().nonnegative(),
  passed: z.boolean(),
  detail: z.string().optional(),
})
export const TrialResultsSchema = z.array(TrialResultSchema)
export type TrialResult = z.infer<typeof TrialResultSchema>
```

- [ ] **Step 4: Write `eval/src/score-all.ts`**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test eval/src/score-all.test.ts`
Expected: PASS (2 tests). `bun run typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add eval/src/trial.ts eval/src/score-all.ts eval/src/score-all.test.ts
git commit -m "feat(eval): candidate scorer CLI"
```

---

## Task 9: Report generator + Workflow script

**Files:**
- Create: `eval/src/report.ts`, `eval/src/eval.workflow.js`
- Test: `eval/src/report.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// eval/src/report.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test eval/src/report.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `eval/src/report.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test eval/src/report.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the Workflow script `eval/src/eval.workflow.js`**

```js
export const meta = {
  name: 'cycle2-edit-eval',
  description: 'Fan out Sonnet subjects to edit code shown in 5 forms; collect candidate edits',
  phases: [{ title: 'Edit', detail: 'one Sonnet subject per snippet × form × sample' }],
}

// args = the parsed eval/generated.json manifest. SAMPLES per (snippet × form).
const SAMPLES = 3

const CANDIDATE_SCHEMA = {
  type: 'object',
  required: ['code'],
  additionalProperties: false,
  properties: { code: { type: 'string', description: 'the COMPLETE modified module source' } },
}

// Inlined prompt builder (workflow scripts cannot import project modules).
function buildPrompt(formCode, request, exportName) {
  return [
    'You are editing a JavaScript/TypeScript module. Below is its COMPLETE current source.',
    '', '```', formCode, '```', '',
    'Make exactly this change:', '', String(request).trim(), '',
    'Requirements:',
    '- Return the COMPLETE modified module source (not a diff or a fragment).',
    `- Preserve the existing export \`${exportName}\` (same name and calling convention).`,
    '- Output ONLY the code in a single fenced code block. No prose.',
  ].join('\n')
}

const tasks = []
for (const s of args.snippets) {
  for (const form of Object.keys(s.forms)) {
    for (let sample = 0; sample < SAMPLES; sample++) {
      tasks.push({ snippet: s.name, form, sample, code: s.forms[form].code, request: s.request, exportName: s.exportName })
    }
  }
}
log(`dispatching ${tasks.length} Sonnet edit trials`)

const results = await parallel(
  tasks.map((t) => async () => {
    const out = await agent(buildPrompt(t.code, t.request, t.exportName), {
      model: 'sonnet',
      schema: CANDIDATE_SCHEMA,
      label: `${t.snippet}:${t.form}#${t.sample}`,
      phase: 'Edit',
    })
    return { snippet: t.snippet, form: t.form, sample: t.sample, code: out?.code ?? '' }
  }),
)

return results.filter(Boolean)
```

- [ ] **Step 6: Typecheck + commit** (the workflow `.js` is exercised for real in Task 10)

Run: `bun run typecheck` → exit 0.
```bash
git add eval/src/report.ts eval/src/eval.workflow.js eval/src/report.test.ts
git commit -m "feat(eval): report generator + Sonnet subject workflow"
```

---

## Task 10: Run the eval (orchestration)

**This task is performed by the executor using tools, not a single shell script.** It generates forms, runs the Workflow of Sonnet subjects, persists candidates, scores, and reports.

- [ ] **Step 1: Generate forms + token manifest**

Run: `bun run eval:generate`
Expected: `eval/generated.json` written (8 snippets × 5 forms).

- [ ] **Step 2: Run the subject Workflow**

Read `eval/generated.json`, then invoke the **Workflow** tool:
- `scriptPath`: `eval/src/eval.workflow.js`
- `args`: the parsed contents of `eval/generated.json` (a JSON object with a `snippets` array — pass as an actual JSON value, not a string).

Expected: the workflow dispatches `8 × 5 × 3 = 120` Sonnet trials and returns an array of `{ snippet, form, sample, code }`. (Concurrency is capped automatically; this takes a while.)

- [ ] **Step 3: Persist candidates**

Write the workflow's returned array to `eval/candidates.json` (pretty-printed JSON). It must validate against `CandidatesSchema` (snippet, form, sample, code).

- [ ] **Step 4: Score all candidates**

Run: `bun run eval:score`
Expected: `[eval] scored 120 trials — N passed`; writes `results/eval-results.json`.

- [ ] **Step 5: Build the report**

Run: `bun run eval:report`
Expected: `results/eval-report.md` written. **Read it and sanity-check:**
- `original` form should have the highest (or near-highest) edit-success rate; if it's low, snippets are mis-calibrated (see the Calibration section) — flag it.
- Token savings per form should match Cycle 1 directionally (minify/combined highest).
- The decision signal: which forms keep success high while saving tokens vs which tank success.

- [ ] **Step 6: Full suite + typecheck**

Run: `bun test` (all eval + Cycle 1 tests pass) and `bun run typecheck` (exit 0).

- [ ] **Step 7: Commit the report**

```bash
git add results/eval-report.md
git commit -m "feat(eval): first compact-form edit-accuracy results"
```

---

## Self-Review (completed during planning)

**Spec coverage:** snippet set with subject/request/reference/tests/meta + well-posedness gate (T4–T5); form generator reusing Cycle 1 transforms (T2); token counts reusing Cycle 1 tokenizers (T7); blind Sonnet subjects via Workflow (T9, run in T10); objective test-execution scoring in isolated temp dirs with timeout (T3, T8); success-rate-vs-token-cost report + Δ vs original + calibration gate (T9); the 5 forms, 3 samples, ~120 trials (T9/T10); gitignored artifacts + committed report (T1, T10). The "executing model-generated code" risk is handled by isolated temp dirs + timeout + pure snippet domain (T3).

**Placeholder scan:** No TBD/TODO. Snippet authoring (T5) is creative-fixture work specified by exact export signatures + change requests + an automated well-posedness gate (the test is the contract) — not a hand-wave. All harness code is complete.

**Type consistency:** `Form`/`FORMS` (form.ts) reused in manifest.ts, trial.ts, report.ts. `runTests(testPath, code)` signature consistent across score.ts ↔ score.test.ts ↔ snippet.test.ts ↔ score-all.ts. `Candidate`/`TrialResult` shapes (trial.ts) match the workflow's returned objects (T9) and score-all output (T8). `Generated` shape (manifest.ts) matches generate.ts output and report.ts input. `buildEvalReport(trials, generated, tokenizer)` signature consistent T9 test ↔ impl. Primary tokenizer string `tiktoken:o200k_base` matches Cycle 1's tokenizer naming.
