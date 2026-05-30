# Token-Efficiency Measurement Harness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Bun+TypeScript harness that measures, across Claude and GPT tokenizers, how much ~9 source-level transforms reduce LLM token counts on real-world OSS JS/TS, with semantic-equivalence verification, and emit a ranked report.

**Architecture:** A 5-stage pipeline — corpus loader → transform → equivalence check → tokenize (cached) → aggregate → report. Each stage is an independently tested unit behind a narrow interface. Babel powers all AST work; `js-tiktoken` (local) and `@anthropic-ai/sdk` (exact, cached) do the counting. The equivalence checker is the honesty backstop: transforms that silently break semantics are flagged and excluded from "lossless savings," so a transform need not be perfect to be safe to include.

**Tech Stack:** Bun, TypeScript (strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), Babel (`@babel/{core,parser,traverse,generator,types}`, `@babel/preset-typescript`), `js-tiktoken`, `@anthropic-ai/sdk`, Zod, `bun:sqlite`.

**Deviations from the approved spec (intentional, see header note in the conversation):** dropped `compact-types` (subsumed by `minify-whitespace`), `remove-semicolons` (ASI-unsafe), and the `indent-*` variants (template-literal safety cost > signal). Final sweep is 9 transforms; all five Learning-Roadmap questions remain answered.

**Conventions:** singular filenames; `type` over `interface`; `satisfies` over annotation; no `any`/`!`/`@ts-ignore`; Zod at boundaries; throw at boundaries, one top-level catch. Runs on **Bun**, which honors `__esModule` interop so Babel default imports work directly.

---

## File Structure

```
js-exp/
  package.json            tsconfig.json   .gitignore   README.md
  scripts/fetch-corpus.ts                 # one-off corpus acquisition
  corpus/                                 # vendored OSS source + manifest.json
  src/
    lang.ts                               # Lang type
    config.ts                             # Zod-validated env
    tokenizer/
      tokenizer.type.ts                   # Tokenizer type
      cache.ts                            # bun:sqlite count cache + withCache
      tiktoken.tokenizer.ts
      anthropic.tokenizer.ts
      index.ts                            # createTokenizers(config)
    transform/
      transform.type.ts                   # Transform / Equivalence types
      babel.ts                            # parse / generate / traverse / t helpers
      canonicalize.ts                     # strip types+comments → alpha-rename → print
      equivalence.ts                      # verifyEquivalence()
      transforms/
        baseline.ts  strip-comments.ts  minify-whitespace.ts  strip-types.ts
        rename-idents.ts  arrow-functions.ts  keyword-sigils.ts  combined-best.ts
      index.ts                            # allTransforms registry
    corpus/loader.ts                      # loadCorpus()
    experiment/
      runner.ts                           # runExperiment()
      report.ts                           # writeReport()
    main.ts                               # CLI entry, top-level try/catch
  test/  (mirrors src/)
  results/                                # report.md committed; results.json gitignored
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `src/lang.ts`

- [ ] **Step 1: Initialize package and install dependencies**

Run:
```bash
cd /Users/gtmetric/Projects/js-exp
bun init -y
bun add @babel/core @babel/parser @babel/traverse @babel/generator @babel/types @babel/preset-typescript js-tiktoken @anthropic-ai/sdk zod
bun add -d typescript @types/babel__core @types/babel__traverse @types/babel__generator bun-types
```
Expected: `node_modules/` created, dependencies appear in `package.json`.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src", "test", "scripts"]
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
.cache/
.env
*.log
results/results.json
```

- [ ] **Step 4: Set `package.json` scripts**

Replace the `"scripts"` block in `package.json` with:
```json
{
  "type": "module",
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc",
    "fetch-corpus": "bun run scripts/fetch-corpus.ts",
    "experiment": "bun run src/main.ts"
  }
}
```
(Merge `"type"` and `"scripts"` into the existing object; keep `dependencies`/`devDependencies`.)

- [ ] **Step 5: Write `src/lang.ts`**

```ts
export const LANGS = ['ts', 'tsx', 'js', 'jsx'] as const
export type Lang = (typeof LANGS)[number]

export function langFromPath(path: string): Lang {
  if (path.endsWith('.tsx')) return 'tsx'
  if (path.endsWith('.ts')) return 'ts'
  if (path.endsWith('.jsx')) return 'jsx'
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return 'js'
  throw new Error(`Unsupported file extension: ${path}`)
}
```

- [ ] **Step 6: Verify typecheck passes on the empty project**

Run: `bun run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json .gitignore src/lang.ts bun.lock* package-lock.json 2>/dev/null; git add -A
git commit -m "chore: scaffold Bun+TS token-efficiency harness"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/tokenizer/tokenizer.type.ts`, `src/transform/transform.type.ts`

- [ ] **Step 1: Write `src/tokenizer/tokenizer.type.ts`**

```ts
export type Tokenizer = {
  readonly name: string
  countTokens(text: string): Promise<number>
}
```

- [ ] **Step 2: Write `src/transform/transform.type.ts`**

```ts
import type { Lang } from '../lang.ts'

export const EQUIVALENCE = ['canonical', 'round-trip', 'manual'] as const
export type Equivalence = (typeof EQUIVALENCE)[number]

export type Transform = {
  readonly name: string
  readonly description: string
  readonly equivalence: Equivalence
  apply(code: string, lang: Lang): string
  /** Required iff equivalence === 'round-trip': reverses apply() back to valid JS/TS. */
  invert?(code: string, lang: Lang): string
}
```

- [ ] **Step 3: Verify typecheck**

Run: `bun run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/tokenizer/tokenizer.type.ts src/transform/transform.type.ts
git commit -m "feat: shared Tokenizer and Transform types"
```

---

## Task 3: Babel helpers

**Files:**
- Create: `src/transform/babel.ts`
- Test: `test/transform/babel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/babel.test.ts
import { test, expect } from 'bun:test'
import { parseCode, generateCode, traverse, t } from '../../src/transform/babel.ts'

test('parseCode parses TS and generateCode round-trips structure', () => {
  const ast = parseCode('const x: number = 1', 'ts')
  const out = generateCode(ast)
  expect(out).toContain('const x')
  expect(out).toContain('1')
})

test('parseCode handles tsx', () => {
  const ast = parseCode('const el = <div className="a">{x}</div>', 'tsx')
  expect(ast.type).toBe('File')
})

test('traverse and t are usable', () => {
  const ast = parseCode('const a = 1; const b = 2', 'js')
  let count = 0
  traverse(ast, { VariableDeclarator() { count++ } })
  expect(count).toBe(2)
  expect(t.isFile(ast)).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/babel.test.ts`
Expected: FAIL — module `src/transform/babel.ts` not found.

- [ ] **Step 3: Write `src/transform/babel.ts`**

```ts
import { parse, type ParserPlugin } from '@babel/parser'
import traverse from '@babel/traverse'
import generate, { type GeneratorOptions } from '@babel/generator'
import * as t from '@babel/types'
import type { File, Node } from '@babel/types'
import type { Lang } from '../lang.ts'

export { traverse, t }
export type { File, Node }

function pluginsFor(lang: Lang): ParserPlugin[] {
  const plugins: ParserPlugin[] = []
  if (lang === 'ts' || lang === 'tsx') plugins.push('typescript')
  if (lang === 'tsx' || lang === 'jsx') plugins.push('jsx')
  return plugins
}

export function parseCode(code: string, lang: Lang): File {
  return parse(code, { sourceType: 'module', plugins: pluginsFor(lang) })
}

export function generateCode(ast: Node, opts: GeneratorOptions = {}): string {
  return generate(ast, { comments: false, ...opts }).code
}

export function parses(code: string, lang: Lang): boolean {
  try {
    parseCode(code, lang)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/babel.test.ts`
Expected: PASS (3 tests). If a "traverse is not a function" error appears, the Babel interop differs in this environment — change to `import traverseDefault from '@babel/traverse'` then `const traverse = (traverseDefault as { default?: typeof traverseDefault }).default ?? traverseDefault` (and the same for `generate`). On Bun this is not expected.

- [ ] **Step 5: Commit**

```bash
git add src/transform/babel.ts test/transform/babel.test.ts
git commit -m "feat: Babel parse/generate/traverse helpers"
```

---

## Task 4: tiktoken tokenizer adapter

**Files:**
- Create: `src/tokenizer/tiktoken.tokenizer.ts`
- Test: `test/tokenizer/tiktoken.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/tokenizer/tiktoken.test.ts
import { test, expect } from 'bun:test'
import { createTiktokenTokenizer } from '../../src/tokenizer/tiktoken.tokenizer.ts'

test('counts tokens deterministically and names itself', async () => {
  const tok = createTiktokenTokenizer('o200k_base')
  expect(tok.name).toBe('tiktoken:o200k_base')
  const a = await tok.countTokens('const x = 1')
  const b = await tok.countTokens('const x = 1')
  expect(a).toBe(b)
  expect(a).toBeGreaterThan(0)
})

test('longer code costs more tokens', async () => {
  const tok = createTiktokenTokenizer('cl100k_base')
  const short = await tok.countTokens('a')
  const long = await tok.countTokens('a'.repeat(50) + ' = function foo() { return 1 }')
  expect(long).toBeGreaterThan(short)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/tokenizer/tiktoken.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/tokenizer/tiktoken.tokenizer.ts`**

```ts
import { getEncoding } from 'js-tiktoken'
import type { Tokenizer } from './tokenizer.type.ts'

export type TiktokenEncoding = 'o200k_base' | 'cl100k_base'

export function createTiktokenTokenizer(encoding: TiktokenEncoding): Tokenizer {
  const enc = getEncoding(encoding)
  return {
    name: `tiktoken:${encoding}`,
    countTokens: (text) => Promise.resolve(enc.encode(text).length),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/tokenizer/tiktoken.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/tiktoken.tokenizer.ts test/tokenizer/tiktoken.test.ts
git commit -m "feat: tiktoken tokenizer adapter (o200k/cl100k)"
```

---

## Task 5: Token cache + withCache wrapper

**Files:**
- Create: `src/tokenizer/cache.ts`
- Test: `test/tokenizer/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/tokenizer/cache.test.ts
import { test, expect } from 'bun:test'
import { createCache, withCache } from '../../src/tokenizer/cache.ts'
import type { Tokenizer } from '../../src/tokenizer/tokenizer.type.ts'

test('cache stores and retrieves counts (in-memory db)', () => {
  const cache = createCache(':memory:')
  expect(cache.get('k')).toBeUndefined()
  cache.set('k', 42)
  expect(cache.get('k')).toBe(42)
})

test('withCache calls underlying tokenizer only once per unique text', async () => {
  const cache = createCache(':memory:')
  let calls = 0
  const base: Tokenizer = {
    name: 'fake',
    countTokens: async () => { calls++; return 7 },
  }
  const cached = withCache(base, cache)
  expect(await cached.countTokens('hello')).toBe(7)
  expect(await cached.countTokens('hello')).toBe(7)
  expect(calls).toBe(1)
  await cached.countTokens('world')
  expect(calls).toBe(2)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/tokenizer/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/tokenizer/cache.ts`**

```ts
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { Tokenizer } from './tokenizer.type.ts'

export type TokenCache = {
  get(key: string): number | undefined
  set(key: string, count: number): void
}

const RowSchema = z.object({ n: z.number() })

export function createCache(path: string): TokenCache {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true })
  db.run('CREATE TABLE IF NOT EXISTS tok (k TEXT PRIMARY KEY, n INTEGER NOT NULL)')
  const getStmt = db.query('SELECT n FROM tok WHERE k = ?')
  const setStmt = db.query('INSERT OR REPLACE INTO tok (k, n) VALUES (?, ?)')
  return {
    get(key) {
      const row = getStmt.get(key)
      return row == null ? undefined : RowSchema.parse(row).n
    },
    set(key, count) {
      setStmt.run(key, count)
    },
  }
}

function sha256(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex')
}

export function withCache(tokenizer: Tokenizer, cache: TokenCache): Tokenizer {
  return {
    name: tokenizer.name,
    async countTokens(text) {
      const key = `${tokenizer.name}:${sha256(text)}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      const count = await tokenizer.countTokens(text)
      cache.set(key, count)
      return count
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/tokenizer/cache.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/cache.ts test/tokenizer/cache.test.ts
git commit -m "feat: bun:sqlite token cache + withCache wrapper"
```

---

## Task 6: Anthropic tokenizer adapter

**Files:**
- Create: `src/tokenizer/anthropic.tokenizer.ts`
- Test: `test/tokenizer/anthropic.test.ts`

- [ ] **Step 1: Write the failing test** (no network — inject a fake counter)

```ts
// test/tokenizer/anthropic.test.ts
import { test, expect } from 'bun:test'
import { createAnthropicTokenizer } from '../../src/tokenizer/anthropic.tokenizer.ts'

test('names itself by model and returns input_tokens from the counter', async () => {
  let received = ''
  const tok = createAnthropicTokenizer({
    model: 'claude-sonnet-4-6',
    count: async (text) => { received = text; return 11 },
  })
  expect(tok.name).toBe('anthropic:claude-sonnet-4-6')
  expect(await tok.countTokens('const x = 1')).toBe(11)
  expect(received).toBe('const x = 1')
})

test('retries on transient failure then succeeds', async () => {
  let attempts = 0
  const tok = createAnthropicTokenizer({
    model: 'm',
    maxRetries: 3,
    backoffMs: 0,
    count: async () => {
      attempts++
      if (attempts < 2) throw new Error('rate_limit')
      return 5
    },
  })
  expect(await tok.countTokens('x')).toBe(5)
  expect(attempts).toBe(2)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/tokenizer/anthropic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/tokenizer/anthropic.tokenizer.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Tokenizer } from './tokenizer.type.ts'

const CountResponseSchema = z.object({ input_tokens: z.number() })

type CountFn = (text: string) => Promise<number>

export type AnthropicTokenizerOptions = {
  model: string
  /** Injectable counter for testing; defaults to the real SDK call. */
  count?: CountFn
  apiKey?: string
  maxRetries?: number
  backoffMs?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createAnthropicTokenizer(opts: AnthropicTokenizerOptions): Tokenizer {
  const maxRetries = opts.maxRetries ?? 3
  const backoffMs = opts.backoffMs ?? 500

  const realCount: CountFn = async (text) => {
    const client = new Anthropic(opts.apiKey === undefined ? {} : { apiKey: opts.apiKey })
    const res = await client.messages.countTokens({
      model: opts.model,
      messages: [{ role: 'user', content: text }],
    })
    return CountResponseSchema.parse(res).input_tokens
  }
  const count = opts.count ?? realCount

  return {
    name: `anthropic:${opts.model}`,
    async countTokens(text) {
      let lastErr: unknown
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await count(text)
        } catch (err) {
          lastErr = err
          if (attempt < maxRetries - 1) await sleep(backoffMs * (attempt + 1))
        }
      }
      throw new Error(`Anthropic token count failed after ${maxRetries} attempts: ${String(lastErr)}`)
    },
  }
}
```

> **Note on Claude counts:** `messages.countTokens` includes a small fixed message-framing overhead (~a handful of tokens) constant per text. It cancels exactly in absolute deltas and only slightly understates the *percentage* reduction uniformly across transforms — so rankings are unaffected and reported Claude %s are mildly conservative. The report documents this; tiktoken counts have zero overhead.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/tokenizer/anthropic.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/anthropic.tokenizer.ts test/tokenizer/anthropic.test.ts
git commit -m "feat: Anthropic count_tokens adapter with retry + injectable counter"
```

---

## Task 7: Config + tokenizer factory

**Files:**
- Create: `src/config.ts`, `src/tokenizer/index.ts`
- Test: `test/config.test.ts`, `test/tokenizer/index.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/config.test.ts
import { test, expect } from 'bun:test'
import { loadConfig } from '../src/config.ts'

test('defaults apply and api key is optional', () => {
  const cfg = loadConfig({})
  expect(cfg.anthropicModel).toBe('claude-sonnet-4-6')
  expect(cfg.cachePath).toContain('tokens.sqlite')
  expect('anthropicApiKey' in cfg).toBe(false)
})

test('reads api key when present', () => {
  const cfg = loadConfig({ ANTHROPIC_API_KEY: 'sk-test' })
  expect(cfg.anthropicApiKey).toBe('sk-test')
})
```

```ts
// test/tokenizer/index.test.ts
import { test, expect } from 'bun:test'
import { createTokenizers } from '../../src/tokenizer/index.ts'

test('without api key: only tiktoken tokenizers', () => {
  const toks = createTokenizers({ anthropicModel: 'm', cachePath: ':memory:' })
  expect(toks.map((t) => t.name)).toEqual(['tiktoken:o200k_base', 'tiktoken:cl100k_base'])
})

test('with api key: adds the anthropic tokenizer', () => {
  const toks = createTokenizers({ anthropicApiKey: 'sk-test', anthropicModel: 'claude-sonnet-4-6', cachePath: ':memory:' })
  expect(toks.map((t) => t.name)).toContain('anthropic:claude-sonnet-4-6')
  expect(toks.length).toBe(3)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/config.test.ts test/tokenizer/index.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/config.ts`**

```ts
import { z } from 'zod'

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  TOKEN_CACHE_PATH: z.string().default('.cache/tokens.sqlite'),
})

export type Config = {
  anthropicApiKey?: string
  anthropicModel: string
  cachePath: string
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = EnvSchema.parse(env)
  return {
    anthropicModel: parsed.ANTHROPIC_MODEL,
    cachePath: parsed.TOKEN_CACHE_PATH,
    ...(parsed.ANTHROPIC_API_KEY === undefined ? {} : { anthropicApiKey: parsed.ANTHROPIC_API_KEY }),
  }
}
```

- [ ] **Step 4: Write `src/tokenizer/index.ts`**

```ts
import type { Config } from '../config.ts'
import type { Tokenizer } from './tokenizer.type.ts'
import { createCache, withCache } from './cache.ts'
import { createTiktokenTokenizer } from './tiktoken.tokenizer.ts'
import { createAnthropicTokenizer } from './anthropic.tokenizer.ts'

export function createTokenizers(config: Config): Tokenizer[] {
  const cache = createCache(config.cachePath)
  const tokenizers: Tokenizer[] = [
    withCache(createTiktokenTokenizer('o200k_base'), cache),
    withCache(createTiktokenTokenizer('cl100k_base'), cache),
  ]
  if (config.anthropicApiKey !== undefined) {
    tokenizers.push(
      withCache(
        createAnthropicTokenizer({ apiKey: config.anthropicApiKey, model: config.anthropicModel }),
        cache,
      ),
    )
  } else {
    console.warn('[token-exp] ANTHROPIC_API_KEY not set — skipping Claude tokenizer (tiktoken only).')
  }
  return tokenizers
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test test/config.test.ts test/tokenizer/index.test.ts`
Expected: PASS (4 tests). A `[token-exp] ANTHROPIC_API_KEY not set` warning prints in the first index test — that is expected.

- [ ] **Step 6: Commit**

```bash
git add src/config.ts src/tokenizer/index.ts test/config.test.ts test/tokenizer/index.test.ts
git commit -m "feat: Zod config + tokenizer factory with graceful Claude fallback"
```

---

## Task 8: Canonicalizer

**Files:**
- Create: `src/transform/canonicalize.ts`
- Test: `test/transform/canonicalize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/canonicalize.test.ts
import { test, expect } from 'bun:test'
import { canonicalize } from '../../src/transform/canonicalize.ts'

test('formatting/comment differences vanish under canon', () => {
  const a = 'const   x=1 // hi\nfunction f(){return x}'
  const b = '/* doc */\nconst x = 1\nfunction f() {\n  return x\n}'
  expect(canonicalize(a, 'js')).toBe(canonicalize(b, 'js'))
})

test('type annotations are erased (TS and JS forms canon-equal)', () => {
  const ts = 'export const add = (a: number, b: number): number => a + b'
  const js = 'export const add = (a, b) => a + b'
  expect(canonicalize(ts, 'ts')).toBe(canonicalize(js, 'js'))
})

test('consistent local renaming is canon-equal', () => {
  const a = 'function f(){ const userId = 1; return userId + 2 }'
  const b = 'function f(){ const q = 1; return q + 2 }'
  expect(canonicalize(a, 'js')).toBe(canonicalize(b, 'js'))
})

test('genuinely different programs are NOT canon-equal', () => {
  const a = 'function f(){ return 1 }'
  const b = 'function f(){ return 2 }'
  expect(canonicalize(a, 'js')).not.toBe(canonicalize(b, 'js'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/canonicalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/transform/canonicalize.ts`**

```ts
import { transformSync } from '@babel/core'
import type { Lang } from '../lang.ts'
import { parseCode, generateCode, traverse, type File } from './babel.ts'

/** Strip TS types + comments, producing plain JS text. */
function stripTypesAndComments(code: string, lang: Lang): string {
  const isTSX = lang === 'tsx' || lang === 'jsx'
  const result = transformSync(code, {
    filename: `file.${lang}`,
    babelrc: false,
    configFile: false,
    comments: false,
    retainLines: false,
    presets: [
      ['@babel/preset-typescript', { allExtensions: true, isTSX, allowDeclareFields: true, onlyRemoveTypeImports: false }],
    ],
  })
  if (result?.code == null) throw new Error('canonicalize: type-strip produced no output')
  return result.code
}

/** Rename every bound identifier to a deterministic, position-based name. */
function alphaRename(ast: File): void {
  let counter = 0
  const seen = new Set<unknown>()
  const ordered: { rename(from: string, to: string): void; bindings: Record<string, unknown> }[] = []
  traverse(ast, {
    enter(path) {
      const scope = path.scope
      if (seen.has(scope)) return
      seen.add(scope)
      ordered.push(scope)
    },
  })
  for (const scope of ordered) {
    for (const name of Object.keys(scope.bindings)) {
      scope.rename(name, `_$c${counter++}`)
    }
  }
}

export function canonicalize(code: string, lang: Lang): string {
  const js = stripTypesAndComments(code, lang)
  const ast = parseCode(js, 'js')
  alphaRename(ast)
  return generateCode(ast, { comments: false, compact: false, concise: false })
}
```

> If `scope.rename` ever appends a numeric suffix because `_$c<n>` collided with a pre-existing identifier, the "different programs are not canon-equal" test still passes and the equivalence checker (Task 9) treats a mismatch conservatively as *not verified* — never as a false positive. Source files containing literal `_$c0`-style names are vanishingly unlikely.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/canonicalize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/transform/canonicalize.ts test/transform/canonicalize.test.ts
git commit -m "feat: canonicalizer (type/comment strip + alpha-rename)"
```

---

## Task 9: Equivalence checker

**Files:**
- Create: `src/transform/equivalence.ts`
- Test: `test/transform/equivalence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/equivalence.test.ts
import { test, expect } from 'bun:test'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'
import type { Transform } from '../../src/transform/transform.type.ts'

const canonical: Transform = { name: 'c', description: '', equivalence: 'canonical', apply: (s) => s }
const roundTrip: Transform = {
  name: 'r', description: '', equivalence: 'round-trip',
  apply: (s) => s.replaceAll('const', '◇'),
  invert: (s) => s.replaceAll('◇', 'const'),
}
const manual: Transform = { name: 'm', description: '', equivalence: 'manual', apply: (s) => s }

test('canonical: equal canon forms verify', () => {
  const r = verifyEquivalence(canonical, 'const x = 1 // a', 'const x = 1', 'js')
  expect(r.verified).toBe(true)
  expect(r.method).toBe('canonical')
})

test('canonical: broken transform fails verification', () => {
  const r = verifyEquivalence(canonical, 'const x = 1', 'const x = 2', 'js')
  expect(r.verified).toBe(false)
})

test('canonical: non-parsing output fails', () => {
  const r = verifyEquivalence(canonical, 'const x = 1', 'const x = ', 'js')
  expect(r.verified).toBe(false)
})

test('round-trip: invert reproduces original', () => {
  const r = verifyEquivalence(roundTrip, 'const x = 1', '◇ x = 1', 'js')
  expect(r.verified).toBe(true)
  expect(r.method).toBe('round-trip')
})

test('manual: never machine-verified, flagged', () => {
  const r = verifyEquivalence(manual, 'const x = 1', 'const x = 1', 'js')
  expect(r.verified).toBe(false)
  expect(r.method).toBe('manual')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/equivalence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/transform/equivalence.ts`**

```ts
import type { Lang } from '../lang.ts'
import type { Equivalence, Transform } from './transform.type.ts'
import { canonicalize } from './canonicalize.ts'
import { parses } from './babel.ts'

export type EquivalenceResult = {
  verified: boolean
  method: Equivalence
  detail?: string
}

export function verifyEquivalence(
  transform: Transform,
  original: string,
  output: string,
  lang: Lang,
): EquivalenceResult {
  const method = transform.equivalence

  if (method === 'manual') {
    const ok = parses(output, lang)
    return { verified: false, method, detail: ok ? 'parse-ok; not machine-verified' : 'output does not parse' }
  }

  if (method === 'round-trip') {
    if (transform.invert === undefined) throw new Error(`Transform ${transform.name} is round-trip but has no invert()`)
    let back: string
    try {
      back = transform.invert(output, lang)
    } catch (err) {
      return { verified: false, method, detail: `invert threw: ${String(err)}` }
    }
    try {
      const ok = canonicalize(original, lang) === canonicalize(back, lang)
      return ok ? { verified: true, method } : { verified: false, method, detail: 'round-trip canon mismatch' }
    } catch (err) {
      return { verified: false, method, detail: `canon threw: ${String(err)}` }
    }
  }

  // canonical
  if (!parses(output, lang)) return { verified: false, method, detail: 'output does not parse' }
  try {
    const ok = canonicalize(original, lang) === canonicalize(output, lang)
    return ok ? { verified: true, method } : { verified: false, method, detail: 'canonical forms differ' }
  } catch (err) {
    return { verified: false, method, detail: `canon threw: ${String(err)}` }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/equivalence.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/transform/equivalence.ts test/transform/equivalence.test.ts
git commit -m "feat: equivalence checker (canonical/round-trip/manual)"
```

---

## Task 10: Transforms A — baseline, strip-comments, minify-whitespace

**Files:**
- Create: `src/transform/transforms/baseline.ts`, `src/transform/transforms/strip-comments.ts`, `src/transform/transforms/minify-whitespace.ts`
- Test: `test/transform/transforms-a.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/transforms-a.test.ts
import { test, expect } from 'bun:test'
import { baseline } from '../../src/transform/transforms/baseline.ts'
import { stripComments } from '../../src/transform/transforms/strip-comments.ts'
import { minifyWhitespace } from '../../src/transform/transforms/minify-whitespace.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const SRC = `// header\nfunction add(a, b) {\n  /* sum */\n  return a + b\n}\n`

test('baseline is identity and canon-verified', () => {
  expect(baseline.apply(SRC, 'js')).toBe(SRC)
  expect(verifyEquivalence(baseline, SRC, baseline.apply(SRC, 'js'), 'js').verified).toBe(true)
})

test('strip-comments removes comments, preserves code, stays verified', () => {
  const out = stripComments.apply(SRC, 'js')
  expect(out).not.toContain('header')
  expect(out).not.toContain('sum')
  expect(out).toContain('return a + b')
  expect(verifyEquivalence(stripComments, SRC, out, 'js').verified).toBe(true)
})

test('strip-comments preserves comment-like text inside strings', () => {
  const s = 'const url = "http://x"; // c'
  const out = stripComments.apply(s, 'js')
  expect(out).toContain('"http://x"')
  expect(out).not.toContain('// c')
})

test('minify-whitespace shrinks chars and stays verified', () => {
  const out = minifyWhitespace.apply(SRC, 'js')
  expect(out.length).toBeLessThan(SRC.length)
  expect(verifyEquivalence(minifyWhitespace, SRC, out, 'js').verified).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/transforms-a.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the three transforms**

```ts
// src/transform/transforms/baseline.ts
import type { Transform } from '../transform.type.ts'

export const baseline: Transform = {
  name: 'baseline',
  description: 'Identity transform; the reference point for all comparisons.',
  equivalence: 'canonical',
  apply: (code) => code,
}
```

```ts
// src/transform/transforms/strip-comments.ts
import type { Transform } from '../transform.type.ts'
import { parseCode } from '../babel.ts'

export const stripComments: Transform = {
  name: 'strip-comments',
  description: 'Remove all comments (incl. JSDoc) using parser comment ranges; original formatting otherwise preserved.',
  equivalence: 'canonical',
  apply(code, lang) {
    const ast = parseCode(code, lang)
    const comments = [...(ast.comments ?? [])]
      .filter((c): c is typeof c & { start: number; end: number } => c.start != null && c.end != null)
      .sort((a, b) => b.start - a.start)
    let out = code
    for (const c of comments) out = out.slice(0, c.start) + out.slice(c.end)
    return out
  },
}
```

```ts
// src/transform/transforms/minify-whitespace.ts
import type { Transform } from '../transform.type.ts'
import { parseCode, generateCode } from '../babel.ts'

export const minifyWhitespace: Transform = {
  name: 'minify-whitespace',
  description: 'Re-print via Babel in compact mode: removes optional whitespace and comments, retains types.',
  equivalence: 'canonical',
  apply(code, lang) {
    const ast = parseCode(code, lang)
    return generateCode(ast, { compact: true, comments: false })
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/transforms-a.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/transform/transforms/baseline.ts src/transform/transforms/strip-comments.ts src/transform/transforms/minify-whitespace.ts test/transform/transforms-a.test.ts
git commit -m "feat: baseline, strip-comments, minify-whitespace transforms"
```

---

## Task 11: Transform — strip-types

**Files:**
- Create: `src/transform/transforms/strip-types.ts`
- Test: `test/transform/strip-types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/strip-types.test.ts
import { test, expect } from 'bun:test'
import { stripTypes } from '../../src/transform/transforms/strip-types.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const TS = `export function greet(name: string): string {\n  const n: number = 1\n  return name + n\n}\n`

test('strip-types removes annotations, keeps runtime code, stays verified', () => {
  const out = stripTypes.apply(TS, 'ts')
  expect(out).not.toContain(': string')
  expect(out).not.toContain(': number')
  expect(out).toContain('return name + n')
  expect(verifyEquivalence(stripTypes, TS, out, 'ts').verified).toBe(true)
})

test('strip-types leaves plain JS unchanged in behavior', () => {
  const js = 'export const x = 1'
  const out = stripTypes.apply(js, 'js')
  expect(verifyEquivalence(stripTypes, js, out, 'js').verified).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/strip-types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/transform/transforms/strip-types.ts`**

```ts
import { transformSync } from '@babel/core'
import type { Transform } from '../transform.type.ts'

export const stripTypes: Transform = {
  name: 'strip-types',
  description: 'Erase all TS type annotations via @babel/preset-typescript (runtime-equivalent JS). Measures the "type tax".',
  equivalence: 'canonical',
  apply(code, lang) {
    const isTSX = lang === 'tsx' || lang === 'jsx'
    const result = transformSync(code, {
      filename: `file.${lang}`,
      babelrc: false,
      configFile: false,
      comments: true,
      retainLines: true,
      presets: [['@babel/preset-typescript', { allExtensions: true, isTSX, allowDeclareFields: true, onlyRemoveTypeImports: false }]],
    })
    if (result?.code == null) throw new Error('strip-types produced no output')
    return result.code
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/strip-types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/transform/transforms/strip-types.ts test/transform/strip-types.test.ts
git commit -m "feat: strip-types transform (the type tax)"
```

---

## Task 12: Transform — rename-idents (short + dict)

**Files:**
- Create: `src/transform/transforms/rename-idents.ts`
- Test: `test/transform/rename-idents.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/rename-idents.test.ts
import { test, expect } from 'bun:test'
import { renameIdentsShort, renameIdentsDict } from '../../src/transform/transforms/rename-idents.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const SRC = `export function compute(initialValue) {\n  const accumulatedTotal = initialValue + 1\n  function helperRoutine(localCounter) { return localCounter * accumulatedTotal }\n  return helperRoutine(accumulatedTotal)\n}\n`

test('rename-short renames locals, preserves exported name, stays verified', () => {
  const out = renameIdentsShort.apply(SRC, 'js')
  expect(out).toContain('compute') // export preserved (module-scope binding untouched)
  expect(out).not.toContain('accumulatedTotal') // local renamed
  expect(verifyEquivalence(renameIdentsShort, SRC, out, 'js').verified).toBe(true)
})

test('rename-dict renames locals to dictionary words, stays verified', () => {
  const out = renameIdentsDict.apply(SRC, 'js')
  expect(out).not.toContain('localCounter')
  expect(verifyEquivalence(renameIdentsDict, SRC, out, 'js').verified).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/rename-idents.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/transform/transforms/rename-idents.ts`**

```ts
import type { Transform } from '../transform.type.ts'
import type { Lang } from '../../lang.ts'
import { parseCode, generateCode, traverse, type File } from '../babel.ts'

const RESERVED = new Set([
  'do', 'if', 'in', 'for', 'let', 'new', 'try', 'var', 'case', 'else', 'enum', 'eval', 'null',
  'this', 'true', 'void', 'with', 'await', 'break', 'catch', 'class', 'const', 'false', 'super',
  'throw', 'while', 'yield', 'as', 'is', 'of',
])

const DICT = [
  'data', 'value', 'item', 'list', 'name', 'count', 'index', 'result', 'input', 'output',
  'node', 'key', 'val', 'acc', 'cur', 'next', 'prev', 'temp', 'flag', 'size', 'idx', 'obj',
  'arr', 'str', 'num', 'fn', 'cb', 'res', 'req', 'ctx', 'opt', 'cfg',
]

function shortName(i: number): string {
  const alpha = 'abcdefghijklmnopqrstuvwxyz'
  let n = i
  let s = ''
  do {
    s = alpha[n % 26] + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return RESERVED.has(s) ? `${s}_` : s
}

function dictName(i: number): string {
  const base = DICT[i % DICT.length] ?? 'v'
  const suffix = Math.floor(i / DICT.length)
  const name = suffix === 0 ? base : `${base}${suffix}`
  return RESERVED.has(name) ? `${name}_` : name
}

/** Rename only non-module-scope (local) bindings, so exports/public API are untouched. */
function renameLocals(ast: File, naming: (i: number) => string): void {
  let counter = 0
  const seen = new Set<unknown>()
  const localScopes: { rename(from: string, to: string): void; bindings: Record<string, unknown> }[] = []
  traverse(ast, {
    enter(path) {
      const scope = path.scope
      if (seen.has(scope)) return
      seen.add(scope)
      if (path.isProgram()) return // skip module scope → preserves exported names
      localScopes.push(scope)
    },
  })
  for (const scope of localScopes) {
    for (const name of Object.keys(scope.bindings)) {
      scope.rename(name, naming(counter++))
    }
  }
}

function makeRenameTransform(name: string, description: string, naming: (i: number) => string): Transform {
  return {
    name,
    description,
    equivalence: 'canonical',
    apply(code: string, lang: Lang) {
      const ast = parseCode(code, lang)
      renameLocals(ast, naming)
      return generateCode(ast, { comments: false })
    },
  }
}

export const renameIdentsShort = makeRenameTransform(
  'rename-idents-short',
  'Rename local bindings to short names (a, b, …, aa); tests whether short names beat BPE-fragmented camelCase.',
  shortName,
)

export const renameIdentsDict = makeRenameTransform(
  'rename-idents-dict',
  'Rename local bindings to common single-token dictionary words; tests dictionary vs camelCase tokenization.',
  dictName,
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/rename-idents.test.ts`
Expected: PASS (2 tests). If verification fails on a sample, the checker correctly flags it — inspect the canon mismatch; the most likely cause is a `scope.rename` collision, fixable by prefixing names (e.g. `_${shortName(i)}`).

- [ ] **Step 5: Commit**

```bash
git add src/transform/transforms/rename-idents.ts test/transform/rename-idents.test.ts
git commit -m "feat: rename-idents transforms (short + dictionary)"
```

---

## Task 13: Transforms — arrow-functions (manual) + keyword-sigils (round-trip)

**Files:**
- Create: `src/transform/transforms/arrow-functions.ts`, `src/transform/transforms/keyword-sigils.ts`
- Test: `test/transform/arrow-and-sigils.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/arrow-and-sigils.test.ts
import { test, expect } from 'bun:test'
import { arrowFunctions } from '../../src/transform/transforms/arrow-functions.ts'
import { keywordSigils, SIGILS } from '../../src/transform/transforms/keyword-sigils.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

test('arrow-functions converts a top-level declaration and is marked manual', () => {
  const out = arrowFunctions.apply('function add(a, b) { return a + b }', 'js')
  expect(out).toContain('=>')
  // manual ⇒ never machine-verified
  const r = verifyEquivalence(arrowFunctions, 'function add(a,b){return a+b}', out, 'js')
  expect(r.method).toBe('manual')
  expect(r.verified).toBe(false)
})

test('keyword-sigils replaces keywords with sigils and round-trips', () => {
  const src = 'export const f = function () { return 1 }'
  const out = keywordSigils.apply(src, 'js')
  expect(out).toContain(SIGILS.function)
  expect(out).toContain(SIGILS.return)
  expect(out).not.toMatch(/\bfunction\b/)
  const r = verifyEquivalence(keywordSigils, src, out, 'js')
  expect(r.verified).toBe(true)
})

test('keyword-sigils does not touch keyword-like substrings in strings/identifiers', () => {
  const src = 'const functions = "return here"'
  const out = keywordSigils.apply(src, 'js')
  expect(out).toContain('functions')
  expect(out).toContain('"return here"')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/arrow-and-sigils.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the two transforms**

```ts
// src/transform/transforms/arrow-functions.ts
import type { Transform } from '../transform.type.ts'
import { parseCode, generateCode, traverse, t } from '../babel.ts'

export const arrowFunctions: Transform = {
  name: 'arrow-functions',
  description: 'Convert function declarations to const arrow assignments. MANUAL: changes this/arguments/hoisting, so not machine-verified.',
  equivalence: 'manual',
  apply(code, lang) {
    const ast = parseCode(code, lang)
    traverse(ast, {
      FunctionDeclaration(path) {
        const { id, params, body, async: isAsync } = path.node
        if (id == null) return
        const arrow = t.arrowFunctionExpression(params, body, isAsync)
        const decl = t.variableDeclaration('const', [t.variableDeclarator(id, arrow)])
        path.replaceWith(decl)
      },
    })
    return generateCode(ast, { comments: false })
  },
}
```

```ts
// src/transform/transforms/keyword-sigils.ts
import { parse } from '@babel/parser'
import type { Transform } from '../transform.type.ts'
import type { Lang } from '../../lang.ts'

export const SIGILS = {
  function: 'ƒ',
  return: '↩',
  const: '◇',
  export: '⇑',
  import: '⇓',
} as const

const KEYWORD_BY_SIGIL = new Map(Object.entries(SIGILS).map(([kw, sig]) => [sig, kw]))

function pluginsFor(lang: Lang): ('typescript' | 'jsx')[] {
  const p: ('typescript' | 'jsx')[] = []
  if (lang === 'ts' || lang === 'tsx') p.push('typescript')
  if (lang === 'tsx' || lang === 'jsx') p.push('jsx')
  return p
}

export const keywordSigils: Transform = {
  name: 'keyword-sigils',
  description: 'Replace whole keyword tokens with rare single-glyph sigils (THE crux test). Non-JS output, verified by round-trip.',
  equivalence: 'round-trip',
  apply(code, lang) {
    for (const sig of Object.values(SIGILS)) {
      if (code.includes(sig)) throw new Error(`keyword-sigils: source already contains sigil "${sig}"; cannot guarantee round-trip`)
    }
    const ast = parse(code, { sourceType: 'module', plugins: pluginsFor(lang), tokens: true })
    const tokens = ast.tokens ?? []
    let out = ''
    let last = 0
    for (const tok of tokens) {
      if (tok.start == null || tok.end == null) continue
      out += code.slice(last, tok.start)
      const isKeyword = typeof tok.value === 'string' && Object.hasOwn(SIGILS, tok.value) && tok.type !== undefined &&
        typeof tok.type === 'object' && 'keyword' in tok.type && tok.type.keyword != null
      const sigil = isKeyword ? SIGILS[tok.value as keyof typeof SIGILS] : undefined
      out += sigil ?? code.slice(tok.start, tok.end)
      last = tok.end
    }
    out += code.slice(last)
    return out
  },
  invert(code) {
    let out = code
    for (const [sigil, keyword] of KEYWORD_BY_SIGIL) out = out.replaceAll(sigil, keyword)
    return out
  },
}
```

> The uniqueness guard + rare-glyph choice makes `invert` a safe exact reversal. The round-trip check (`canon(invert(output)) === canon(original)`) is the backstop if any keyword detection edge case slips through.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/transform/arrow-and-sigils.test.ts`
Expected: PASS (3 tests). If `tok.type.keyword` access shape differs, adjust the `isKeyword` predicate; the round-trip test will confirm correctness.

- [ ] **Step 5: Commit**

```bash
git add src/transform/transforms/arrow-functions.ts src/transform/transforms/keyword-sigils.ts test/transform/arrow-and-sigils.test.ts
git commit -m "feat: arrow-functions (manual) + keyword-sigils (round-trip) transforms"
```

---

## Task 14: combined-best + transform registry

**Files:**
- Create: `src/transform/transforms/combined-best.ts`, `src/transform/index.ts`
- Test: `test/transform/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/transform/registry.test.ts
import { test, expect } from 'bun:test'
import { allTransforms } from '../../src/transform/index.ts'
import { combinedBest } from '../../src/transform/transforms/combined-best.ts'
import { verifyEquivalence } from '../../src/transform/equivalence.ts'

const SRC = `// doc\nexport function area(width: number, height: number): number {\n  const product = width * height\n  return product\n}\n`

test('registry includes baseline first and all 9 transforms with unique names', () => {
  expect(allTransforms[0]?.name).toBe('baseline')
  expect(allTransforms.length).toBe(9)
  expect(new Set(allTransforms.map((t) => t.name)).size).toBe(9)
})

test('round-trip transforms declare invert; others may omit', () => {
  for (const t of allTransforms) {
    if (t.equivalence === 'round-trip') expect(typeof t.invert).toBe('function')
  }
})

test('combined-best stacks lossless transforms and stays canon-verified', () => {
  const out = combinedBest.apply(SRC, 'ts')
  expect(out.length).toBeLessThan(SRC.length)
  expect(verifyEquivalence(combinedBest, SRC, out, 'ts').verified).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/transform/registry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/transform/transforms/combined-best.ts`**

```ts
import type { Transform } from '../transform.type.ts'
import { stripComments } from './strip-comments.ts'
import { renameIdentsDict } from './rename-idents.ts'
import { minifyWhitespace } from './minify-whitespace.ts'

/** A fixed stack of canonical-verified transforms; estimates the lossless ceiling. */
export const combinedBest: Transform = {
  name: 'combined-best',
  description: 'strip-comments → rename-idents-dict → minify-whitespace. Ceiling of stacked verified-lossless savings.',
  equivalence: 'canonical',
  apply(code, lang) {
    const a = stripComments.apply(code, lang)
    const b = renameIdentsDict.apply(a, lang)
    return minifyWhitespace.apply(b, lang)
  },
}
```

- [ ] **Step 4: Write `src/transform/index.ts`**

```ts
import type { Transform } from './transform.type.ts'
import { baseline } from './transforms/baseline.ts'
import { stripComments } from './transforms/strip-comments.ts'
import { minifyWhitespace } from './transforms/minify-whitespace.ts'
import { stripTypes } from './transforms/strip-types.ts'
import { renameIdentsShort, renameIdentsDict } from './transforms/rename-idents.ts'
import { arrowFunctions } from './transforms/arrow-functions.ts'
import { keywordSigils } from './transforms/keyword-sigils.ts'
import { combinedBest } from './transforms/combined-best.ts'

export const allTransforms: Transform[] = [
  baseline,
  stripComments,
  minifyWhitespace,
  stripTypes,
  renameIdentsShort,
  renameIdentsDict,
  arrowFunctions,
  keywordSigils,
  combinedBest,
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/transform/registry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/transform/transforms/combined-best.ts src/transform/index.ts test/transform/registry.test.ts
git commit -m "feat: combined-best transform + transform registry (9 transforms)"
```

---

## Task 15: Corpus acquisition + loader

**Files:**
- Create: `scripts/fetch-corpus.ts`, `src/corpus/loader.ts`, `corpus/manifest.json` (generated), corpus source files (fetched)
- Test: `test/corpus/loader.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/corpus/loader.test.ts
import { test, expect } from 'bun:test'
import { loadCorpus } from '../../src/corpus/loader.ts'

test('loads corpus files with lang + code from manifest', () => {
  const files = loadCorpus('corpus')
  expect(files.length).toBeGreaterThanOrEqual(4)
  for (const f of files) {
    expect(f.code.length).toBeGreaterThan(0)
    expect(['ts', 'tsx', 'js', 'jsx']).toContain(f.lang)
    expect(f.source).toMatch(/^https?:\/\//)
  }
})

test('corpus spans more than one language', () => {
  const langs = new Set(loadCorpus('corpus').map((f) => f.lang))
  expect(langs.size).toBeGreaterThan(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/corpus/loader.test.ts`
Expected: FAIL — module not found (and no corpus yet).

- [ ] **Step 3: Write `scripts/fetch-corpus.ts`**

```ts
// Fetches a small set of permissively-licensed (MIT) real-world source files
// at pinned version tags, verifies each parses, and writes corpus/manifest.json.
import { mkdirSync } from 'node:fs'
import { parseCode } from '../src/transform/babel.ts'
import { langFromPath } from '../src/lang.ts'

type Target = { localName: string; url: string; license: string }

// Pinned tags (stable). If any URL 404s, replace with another file of the same
// idiom from an MIT-licensed repo and keep the license/source fields accurate.
const TARGETS: Target[] = [
  { localName: 'util-pmap.js', url: 'https://raw.githubusercontent.com/sindresorhus/p-map/v7.0.3/index.js', license: 'MIT' },
  { localName: 'http-ky.ts', url: 'https://raw.githubusercontent.com/sindresorhus/ky/v1.7.2/source/index.ts', license: 'MIT' },
  { localName: 'util-typefest-paths.ts', url: 'https://raw.githubusercontent.com/sindresorhus/type-fest/v4.26.1/source/get.d.ts', license: 'MIT' },
  { localName: 'util-nanoid.ts', url: 'https://raw.githubusercontent.com/ai/nanoid/5.0.7/index.browser.js', license: 'MIT' },
  { localName: 'state-zustand.ts', url: 'https://raw.githubusercontent.com/pmndrs/zustand/v4.5.5/src/vanilla.ts', license: 'MIT' },
]

const entries: { path: string; lang: string; source: string; license: string }[] = []
mkdirSync('corpus', { recursive: true })

for (const target of TARGETS) {
  const res = await fetch(target.url)
  if (!res.ok) {
    console.error(`SKIP ${target.localName}: ${res.status} ${target.url} — replace with an equivalent MIT file.`)
    continue
  }
  const code = await res.text()
  const localPath = `corpus/${target.localName}`
  const lang = langFromPath(localPath)
  try {
    parseCode(code, lang)
  } catch (err) {
    console.error(`SKIP ${target.localName}: does not parse as ${lang} (${String(err)})`)
    continue
  }
  await Bun.write(localPath, code)
  entries.push({ path: target.localName, lang, source: target.url, license: target.license })
  console.log(`OK ${target.localName} (${lang}, ${code.length} chars)`)
}

if (entries.length < 4) throw new Error(`Only ${entries.length} corpus files acquired; need >= 4. Replace failed URLs.`)
await Bun.write('corpus/manifest.json', JSON.stringify({ files: entries }, null, 2))
console.log(`Wrote corpus/manifest.json with ${entries.length} files.`)
```

- [ ] **Step 4: Run the fetch script and verify corpus is populated**

Run: `bun run fetch-corpus`
Expected: at least 4 `OK …` lines and `Wrote corpus/manifest.json`. If a URL 404s, replace it in `TARGETS` with another MIT-licensed file of the same idiom (a `.tsx` component is a welcome addition) and re-run until ≥4 files (spanning ≥2 languages) are written.

- [ ] **Step 5: Write `src/corpus/loader.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { LANGS, type Lang } from '../lang.ts'

const ManifestSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      lang: z.enum(LANGS),
      source: z.string().url(),
      license: z.string(),
    }),
  ),
})

export type CorpusFile = {
  path: string
  lang: Lang
  code: string
  source: string
  license: string
}

export function loadCorpus(dir = 'corpus'): CorpusFile[] {
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')))
  return manifest.files.map((f) => ({
    path: f.path,
    lang: f.lang,
    code: readFileSync(join(dir, f.path), 'utf8'),
    source: f.source,
    license: f.license,
  }))
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test test/corpus/loader.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit (including the vendored corpus)**

```bash
git add scripts/fetch-corpus.ts src/corpus/loader.ts corpus/ test/corpus/loader.test.ts
git commit -m "feat: corpus fetch script + loader; vendor MIT OSS source"
```

---

## Task 16: Experiment runner

**Files:**
- Create: `src/experiment/runner.ts`
- Test: `test/experiment/runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/experiment/runner.test.ts
import { test, expect } from 'bun:test'
import { runExperiment, type Cell } from '../../src/experiment/runner.ts'
import type { Transform } from '../../src/transform/transform.type.ts'
import type { Tokenizer } from '../../src/tokenizer/tokenizer.type.ts'
import type { CorpusFile } from '../../src/corpus/loader.ts'

const corpus: CorpusFile[] = [
  { path: 'a.js', lang: 'js', code: 'const longName = 1 // c', source: 'http://x', license: 'MIT' },
]
const transforms: Transform[] = [
  { name: 'baseline', description: '', equivalence: 'canonical', apply: (s) => s },
  { name: 'strip-comments', description: '', equivalence: 'canonical', apply: () => 'const longName = 1' },
]
const charTok: Tokenizer = { name: 'chars', countTokens: (t) => Promise.resolve(t.length) }

test('produces a cell per file×transform×tokenizer with tokens, chars, equivalence', async () => {
  const cells = await runExperiment(corpus, transforms, [charTok])
  expect(cells.length).toBe(2)
  const stripped = cells.find((c: Cell) => c.transform === 'strip-comments')
  expect(stripped?.tokens).toBe('const longName = 1'.length)
  expect(stripped?.equivalence.verified).toBe(true)
})

test('a throwing transform yields an error cell, not a crash', async () => {
  const boom: Transform = { name: 'boom', description: '', equivalence: 'canonical', apply: () => { throw new Error('nope') } }
  const cells = await runExperiment(corpus, [boom], [charTok])
  expect(cells[0]?.error).toContain('nope')
  expect(cells[0]?.tokens).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/experiment/runner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/experiment/runner.ts`**

```ts
import type { CorpusFile } from '../corpus/loader.ts'
import type { Transform } from '../transform/transform.type.ts'
import type { Tokenizer } from '../tokenizer/tokenizer.type.ts'
import { verifyEquivalence, type EquivalenceResult } from '../transform/equivalence.ts'

export type Cell = {
  file: string
  lang: string
  transform: string
  tokenizer: string
  tokens: number | null
  chars: number | null
  equivalence: EquivalenceResult
  error?: string
}

export async function runExperiment(
  corpus: CorpusFile[],
  transforms: Transform[],
  tokenizers: Tokenizer[],
): Promise<Cell[]> {
  const cells: Cell[] = []
  for (const file of corpus) {
    for (const transform of transforms) {
      let output: string | undefined
      let applyError: string | undefined
      try {
        output = transform.apply(file.code, file.lang)
      } catch (err) {
        applyError = String(err)
      }
      const equivalence: EquivalenceResult =
        output === undefined
          ? { verified: false, method: transform.equivalence, detail: 'apply threw' }
          : verifyEquivalence(transform, file.code, output, file.lang)

      for (const tokenizer of tokenizers) {
        let tokens: number | null = null
        let tokError: string | undefined
        if (output !== undefined) {
          try {
            tokens = await tokenizer.countTokens(output)
          } catch (err) {
            tokError = String(err)
          }
        }
        cells.push({
          file: file.path,
          lang: file.lang,
          transform: transform.name,
          tokenizer: tokenizer.name,
          tokens,
          chars: output === undefined ? null : output.length,
          equivalence,
          ...(applyError ?? tokError ? { error: applyError ?? tokError } : {}),
        })
      }
    }
  }
  return cells
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/experiment/runner.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/experiment/runner.ts test/experiment/runner.test.ts
git commit -m "feat: experiment runner (file×transform×tokenizer matrix)"
```

---

## Task 17: Report generator

**Files:**
- Create: `src/experiment/report.ts`
- Test: `test/experiment/report.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/experiment/report.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/experiment/report.ts`**

```ts
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
  return `${n >= 0 ? '' : ''}${n.toFixed(1)}%`
}

function renderMarkdown(rows: ReportRow[]): string {
  const lines: string[] = []
  lines.push('# Token-Efficiency Report', '')
  lines.push('Positive % = fewer tokens than `baseline`. `equiv` = fraction of files whose semantic equivalence was machine-verified (`manual` transforms are never auto-verified).', '')
  lines.push('| Transform | Tokenizer | Mean | Median | Min | Max | Equiv | Method | n |')
  lines.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    lines.push(`| ${r.transform} | ${r.tokenizer} | ${fmt(r.meanPctReduction)} | ${fmt(r.medianPctReduction)} | ${fmt(r.minPctReduction)} | ${fmt(r.maxPctReduction)} | ${(r.equivalenceRate * 100).toFixed(0)}% | ${r.method} | ${r.samples} |`)
  }
  lines.push('', '## Cross-tokenizer agreement', '')
  const byTransform = new Map<string, ReportRow[]>()
  for (const r of rows) byTransform.set(r.transform, [...(byTransform.get(r.transform) ?? []), r])
  for (const [transform, rs] of byTransform) {
    const signs = new Set(rs.map((r) => Math.sign(Math.round(r.meanPctReduction * 10))))
    const agree = signs.size <= 1
    lines.push(`- **${transform}**: ${agree ? 'consistent direction across tokenizers' : '⚠️ DISAGREEMENT across tokenizers (brittle)'}`)
  }
  return lines.join('\n') + '\n'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/experiment/report.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/experiment/report.ts test/experiment/report.test.ts
git commit -m "feat: report generator (ranked tables + cross-tokenizer agreement)"
```

---

## Task 18: CLI entry, full run, README

**Files:**
- Create: `src/main.ts`, `README.md`
- Output: `results/report.md`, `results/results.json`

- [ ] **Step 1: Write `src/main.ts`**

```ts
import { mkdirSync } from 'node:fs'
import { loadConfig } from './config.ts'
import { createTokenizers } from './tokenizer/index.ts'
import { loadCorpus } from './corpus/loader.ts'
import { allTransforms } from './transform/index.ts'
import { runExperiment } from './experiment/runner.ts'
import { buildReport } from './experiment/report.ts'

async function main(): Promise<void> {
  const config = loadConfig()
  const tokenizers = createTokenizers(config)
  const corpus = loadCorpus('corpus')
  console.log(`[token-exp] ${corpus.length} files × ${allTransforms.length} transforms × ${tokenizers.length} tokenizers`)

  const cells = await runExperiment(corpus, allTransforms, tokenizers)
  const report = buildReport(cells)

  mkdirSync('results', { recursive: true })
  await Bun.write('results/results.json', JSON.stringify({ cells, rows: report.rows }, null, 2))
  await Bun.write('results/report.md', report.markdown)
  console.log('[token-exp] wrote results/report.md and results/results.json')

  const flagged = cells.filter((c) => c.error != null)
  if (flagged.length > 0) console.warn(`[token-exp] ${flagged.length} cells had errors (see results.json).`)
}

main().catch((err: unknown) => {
  console.error('[token-exp] FAILED:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
```

- [ ] **Step 2: Typecheck the whole project**

Run: `bun run typecheck`
Expected: exits 0, no errors. Fix any type errors surfaced here before proceeding.

- [ ] **Step 3: Run the full test suite**

Run: `bun test`
Expected: all tests across all files PASS.

- [ ] **Step 4: Run the experiment (tiktoken-only is fine without a key)**

Run: `bun run experiment`
Expected: logs the matrix size, then "wrote results/report.md and results/results.json". Open `results/report.md` and confirm `baseline` shows ~0% and transforms are ranked. (Optionally set `ANTHROPIC_API_KEY` to add the Claude column.)

- [ ] **Step 5: Write `README.md`**

````markdown
# js-exp — JS/TS token-efficiency experiment

Measures how much source-level transforms reduce LLM token consumption for
real-world JS/TS, across Claude (exact, via the Anthropic API) and GPT
(`tiktoken`, local) tokenizers, with semantic-equivalence verification.

See the design and rationale in
`docs/superpowers/specs/2026-05-31-js-token-efficiency-design.md`.

## Setup

```bash
bun install
bun run fetch-corpus      # vendors MIT OSS source into corpus/
```

## Run

```bash
bun run experiment        # tiktoken-only by default
ANTHROPIC_API_KEY=sk-... bun run experiment   # adds exact Claude counts
```

Outputs `results/report.md` (ranked tables + cross-tokenizer agreement) and
`results/results.json`.

## Test / typecheck

```bash
bun test
bun run typecheck
```

## How it works

`corpus → transform → equivalence check → tokenize (cached) → aggregate → report`.
The equivalence checker is the honesty backstop: transforms whose semantics can't
be machine-verified (`manual`) are flagged and excluded from lossless-savings
claims. Transform equivalence classes: `canonical` (proven by a canonicalizer),
`round-trip` (inverse reproduces the original), `manual` (parse-only).
````

- [ ] **Step 6: Commit (including the first report)**

```bash
git add src/main.ts README.md results/report.md
git commit -m "feat: CLI entry + README; commit first experiment report"
```

---

## Self-Review (completed during planning)

**Spec coverage:** corpus loader (T15), tokenizer adapters Claude+tiktoken (T4, T6, T7), token cache (T5), transform registry (T10–14), canonicalizer + equivalence model `canonical`/`round-trip`/`manual` (T8, T9), runner (T16), report with ranking + cross-tokenizer agreement + equivalence rate (T17), CLI with graceful no-key degradation (T7, T18), tests throughout, Learning Roadmap captured in the spec. The `keyword-sigils` per-sigil sub-analysis from spec §5.5 is **deferred** to a follow-up (the crux verdict is already answered by the `keyword-sigils` row vs `baseline`); noting it here as the one consciously-deferred spec item.

**Placeholder scan:** No TBD/TODO; every code step contains complete code. Corpus URLs include an explicit verify-and-replace fallback (external availability can't be guaranteed at plan time).

**Type consistency:** `Tokenizer.countTokens → Promise<number>`, `Transform.apply → string` (sync) with optional `invert`, `Cell`/`EquivalenceResult`/`ReportRow` names and fields match across T9/T16/T17. `loadCorpus(dir)` signature consistent T15↔T18. `createTokenizers(Config)` is sync, consistent T7↔T18.
