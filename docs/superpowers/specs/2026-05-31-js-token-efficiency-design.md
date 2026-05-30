# JS/TS Token-Efficiency Experiment — Cycle 1 Design

- **Date:** 2026-05-31
- **Status:** Approved (pending spec review)
- **Cycle:** 1 of N — *Measurement Harness + Broad Transform Sweep*

## 1. Context & motivation

AI coding agents read and write source code as tokens, and tokens are the
currency of cost, latency, and context budget. The hypothesis behind this
project is that JavaScript/TypeScript — designed for humans, not for
token-efficient machine consumption — leaves measurable savings on the table.

The critical, non-obvious constraint is that **character count is not token
count.** LLM tokenizers are BPE-based: frequently-seen byte sequences
(`function`, `const`, `=>`, `  `) collapse to single tokens, while rare
sequences (cryptic sigils, random short identifiers) can *expand*. "Shorter"
code is not necessarily "fewer tokens." We therefore cannot reason our way to
the answer — we must **measure** it.

This makes verification the centerpiece of the project, not an afterthought.
Cycle 1 builds a trustworthy measurement harness and runs a broad sweep of
candidate transforms to discover what genuinely reduces tokens, before any
language or compressor is designed.

## 2. Goal & success criteria

Empirically rank which source-level transforms reduce LLM token consumption for
real-world JS/TS, measured across **both** Claude (exact) and GPT (tiktoken)
tokenizers, with **semantic-equivalence verification** so no token saving is
ever claimed on code that was silently broken.

**Done when** `bun run experiment`:

1. Loads a vendored corpus of real-world OSS source (TS + JS).
2. Applies ~10–15 transforms, each with a declared equivalence guarantee that
   is machine-checked (or explicitly labeled unprovable).
3. Counts tokens per (file × transform × tokenizer), with results cached.
4. Emits `results/results.json` (machine-readable) and `results/report.md`
   (ranked tables: mean / median / min–max % reduction per tokenizer,
   equivalence pass-rate, cross-tokenizer agreement, per-file breakdown).
5. Runs fully offline on tiktoken alone; adds exact Claude counts when
   `ANTHROPIC_API_KEY` is present — never crashing when it is absent.

## 3. Non-goals (YAGNI for Cycle 1)

- The actual dialect / compressor implementation (Cycle 2, designed *from* these
  findings).
- Execution-based behavioral testing against real test suites.
- Whether an LLM can reliably *read and write* a compact form (Cycle 3 eval —
  see §11).
- Editor / agent integration; performance tuning of the harness itself.

## 4. Architecture — a 5-stage pipeline

```
corpus files → transform → equivalence check → tokenize (cached) → aggregate → report
```

Each stage is an independently testable unit with a narrow interface. Layers are
global; the directory layout (§8) groups by concern.

## 5. Components

### 5.1 Corpus loader (`src/corpus/loader.ts`)

- **Does:** Reads a *vendored* snapshot of permissively-licensed OSS source from
  `corpus/`, validated against `corpus/manifest.json`.
- **Interface:** `loadCorpus(): CorpusFile[]` where
  `CorpusFile = { path; lang: 'ts'|'tsx'|'js'|'jsx'; code; source; license }`.
- **Depends on:** filesystem, Zod (manifest validation).
- **Notes:** Vendoring (not runtime fetching) guarantees reproducibility,
  offline runs, and honest attribution. `manifest.json` records, per file:
  origin repo, commit SHA, and SPDX license (MIT/Apache-2.0/BSD only). Corpus
  spans idioms: a React/JSX component, an HTTP router, a pure-logic utility, a
  type-heavy module, a config module, and a test file.

### 5.2 Tokenizer adapters (`src/tokenizer/`)

- **Common interface:** `type Tokenizer = { name: string; countTokens(text: string): Promise<number> }`.
- **`tiktoken.tokenizer.ts`:** wraps `js-tiktoken` (pure-JS, no native build)
  for `o200k_base` (GPT-4o/4.1) and `cl100k_base` (GPT-4/3.5-class). Local,
  deterministic, free.
- **`anthropic.tokenizer.ts`:** wraps `@anthropic-ai/sdk`
  `messages.countTokens` — exact for Claude. Retries with backoff on
  rate-limit; results cached. Absent `ANTHROPIC_API_KEY` → adapter is omitted
  from the run with a clear warning (experiment still completes on tiktoken).
- **`cache.ts`:** `bun:sqlite` store keyed by `sha256(text) + tokenizer.name`.
  Token counts are deterministic per (text, tokenizer), so caching makes reruns
  free and the Claude API path tolerable. Cache is committed-optional (default:
  gitignored).
- **Depends on:** `js-tiktoken`, `@anthropic-ai/sdk`, `bun:sqlite`, Zod (API
  response boundary).

### 5.3 Transform registry (`src/transform/`)

- **Common interface:**
  ```ts
  type Equivalence = 'canonical' | 'round-trip' | 'manual'
  type Transform = {
    name: string
    description: string
    equivalence: Equivalence
    apply(code: string, lang: Lang): string
    invert?(code: string, lang: Lang): string  // required iff equivalence === 'round-trip'
  }
  ```
- **`transforms/*.ts`:** one transform per file. AST work via **Babel**
  (`@babel/parser`, `@babel/traverse`, `@babel/types`, `@babel/generator`) —
  handles TS + JSX with a mature scope/traversal API.
- **`index.ts`:** the registry array consumed by the runner.
- **Depends on:** Babel; the equivalence checker (§5.4) consumes its output.

### 5.4 Equivalence checker (`src/transform/equivalence.ts`, `canonicalize.ts`)

The honesty layer. Every transform output is first **parse-checked** (must be
valid JS/TS unless it is a `round-trip` transform producing a non-JS form).
Behavior preservation is then verified per the transform's declared class:

- **`canonicalize.ts`** defines `canon(code, lang): string` =
  parse → strip all type annotations → strip comments → **scope-aware
  alpha-rename of all bound identifiers** to canonical indices (`_b0`, `_b1`,
  … in traversal order; property names, string literals, and import/export
  *external* names are left untouched) → reprint with a fixed printer.
- **`canonical` transforms:** verified by `canon(original) === canon(output)`.
  Covers whitespace, comments, semicolons, indentation, type stripping, type
  compaction, and scope-safe identifier renaming — because type erasure and
  consistent alpha-renaming preserve runtime semantics.
- **`round-trip` transforms:** output is not valid JS (e.g. sigil dialects);
  verified by `canon(invert(output)) === canon(original)`.
- **`manual` transforms:** equivalence is not machine-provable (e.g.
  function→arrow conversion changes `this`/`arguments`/hoisting). These are
  parse-checked only, **flagged** in the report, and **excluded from
  "verified-lossless savings"** aggregates so we never over-claim.

### 5.5 Runner & report (`src/experiment/runner.ts`, `report.ts`)

- **Runner:** orchestrates file × transform × tokenizer; for each cell records
  token count (cached), char/byte count, and equivalence status. Returns a typed
  result matrix.
- **Report:** writes `results/results.json` and a human-readable
  `results/report.md` containing:
  - Per-transform ranking by **mean % token reduction vs baseline**, per
    tokenizer, with median and min–max spread.
  - **Equivalence pass-rate** per transform.
  - **Cross-tokenizer agreement:** does the *sign* of savings agree across
    tokenizers? Disagreements are flagged (a transform that helps GPT but hurts
    Claude is brittle).
  - Per-file breakdown.
  - A dedicated **sigil sub-analysis**: for each candidate sigil used by
    `keyword-sigils`, its standalone token cost across tokenizers — directly
    testing the "rare symbols are single tokens" assumption.

## 6. The transform sweep (the hypotheses)

| Transform | Equivalence | Hypothesis under test |
|---|---|---|
| `baseline` | canonical | Reference (identity) |
| `strip-comments` | canonical | Comments/JSDoc are a large, cheap-to-remove cost |
| `minify-whitespace` | canonical | Whitespace is ~free in BPE (expected small) |
| `remove-semicolons` | canonical | Punctuation savings are negligible |
| `indent-tabs`, `indent-2sp`, `indent-none` (3 separate transforms) | canonical | Leading-whitespace tokenization differs by style |
| `strip-types` | canonical | The TS "type tax" as a % of tokens |
| `compact-types` | canonical | Type syntax can shrink without full erasure |
| `rename-idents-short` (`a`,`b`,…) | canonical | Short names beat — or fragment worse than — words |
| `rename-idents-dict` (single-token words) | canonical | Dictionary words tokenize cheaper than camelCase |
| `arrow-functions` | manual | Arrow form is terser (semantics permitting) |
| **`keyword-sigils`** | round-trip | **Crux:** do symbol keywords beat already-single-token keywords? |
| `combined-best` | canonical | Ceiling of stacked *verified-lossless* winners |

`combined-best` stacks only `canonical`-verified winners (it excludes
`round-trip` sigil forms and `manual` transforms), so its output is still valid
JS and verifiable by `canon(original) === canon(output)`.

## 7. Tech stack

- **Runtime/lang:** Bun + TypeScript, strict (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). No `any`/`!`/`@ts-ignore`.
- **Transforms:** Babel (TS + JSX support, mature AST API).
- **Tokenizers:** `js-tiktoken` (GPT BPEs, local), `@anthropic-ai/sdk` (Claude, exact).
- **Validation:** Zod at every boundary (config/env, Anthropic responses, manifest).
- **Cache:** `bun:sqlite`.
- **Types:** `type` over `interface`, `satisfies` over annotation, `as const` +
  derived types, `z.infer` for boundary types.

## 8. Project structure

```
js-exp/
  package.json  tsconfig.json  README.md  .gitignore
  corpus/                         # vendored OSS source + manifest.json (provenance, SPDX, SHA)
  src/
    tokenizer/
      tokenizer.type.ts           # Tokenizer type + Zod boundary schemas
      tiktoken.tokenizer.ts
      anthropic.tokenizer.ts
      cache.ts                    # sha256(content)+name → count (bun:sqlite)
    transform/
      transform.type.ts           # Transform/Equivalence types
      canonicalize.ts             # parse → strip types → alpha-rename → print
      equivalence.ts              # canonical / round-trip / manual verification
      transforms/                 # one file per transform
      index.ts                    # registry
    corpus/
      loader.ts
    experiment/
      runner.ts                   # file × transform × tokenizer matrix
      report.ts                   # results.json + report.md
    config.ts                     # Zod-validated env/config (ANTHROPIC_API_KEY optional)
    main.ts                       # CLI entry; single top-level try/catch
  test/                           # bun:test mirrors src/
  results/                        # generated; report.md committed, intermediate gitignored
```

## 9. Configuration & error handling

- **Config:** `config.ts` parses env via Zod. `ANTHROPIC_API_KEY` optional;
  tokenizer set is derived from what is available.
- **Errors:** throw at boundaries; a single top-level `try/catch` in `main.ts`
  prints a clean message and exits non-zero. Missing key → warn + degrade to
  tiktoken-only. Anthropic network/rate-limit → retry with backoff, then cache.

## 10. Testing strategy

`bun:test`, TDD:

- **Tokenizer adapters:** deterministic counts on fixtures; cache hit avoids a
  second call; Anthropic adapter skipped (or mocked) without a key.
- **Equivalence checker:** known-equivalent pairs pass; known-broken pairs fail;
  round-trip inverts correctly; `manual` transforms are flagged not asserted.
- **Each transform:** produces valid output and the declared equivalence status.
- **Report:** aggregation math (mean/median/%) verified on synthetic matrices.

## 11. Learning roadmap — what Cycle 1 unlocks

**Cycle 1 answers five questions:**

1. **The type tax** — types as a % of tokens; decides whether type-handling is
   the headline strategy.
2. **The identifier question** — whether scope-safe renaming (and which style,
   short vs dictionary) is a real lever, given camelCase fragments under BPE.
3. **The keyword-sigil verdict (crux)** — whether a terse symbol syntax can beat
   already-single-token keywords. A *negative* result kills the naive
   "new terse language" idea before it is built.
4. **Cross-tokenizer robustness** — whether Claude and GPT agree on what saves
   tokens, constraining how portable any future format can be.
5. **The size of the prize** — `combined-best` gives the ceiling of stacked
   lossless savings, which sizes the case for Cycle 2.

**Each outcome routes Cycle 2:**

| If the data shows… | Cycle 2 becomes… |
|---|---|
| Types dominate | A reversible type-erasure / sidecar codec |
| Identifiers dominate | A scope-safe rename codec (compact ↔ original) |
| Comments/formatting dominate | A trivial lossless "context minifier" — ship it |
| Sigils surprisingly win | An actual compact dialect + transpiler |
| Nothing beats baseline | The finding *"JS is already near-optimal for BPE"* — pivot |

The null result is a legitimate, valuable conclusion — and the reason
measuring-first exists.

**What Cycle 1 deliberately does *not* answer:** it measures the *static token
cost of a representation*, not whether an LLM can reliably *read and write* it. A
sigil-dense form could be cheaper to store yet so error-prone to emit that
retries erase the savings. That round-trip-accuracy eval is **Cycle 3**; the
harness built here is its test bench, so no work is throwaway.

## 12. Risks & mitigations

- **Overfitting to one tokenizer** → measure across Claude + both GPT BPEs;
  report cross-tokenizer agreement.
- **Over-claiming losslessness** → equivalence checker gates every saving;
  unprovable transforms are excluded from lossless aggregates.
- **Corpus bias** → span multiple idioms and both TS/JS; record provenance.
- **Claude API cost/flakiness** → content-hash cache + offline tiktoken fallback.

## 13. Decisions made

- **Babel** over SWC / TS-compiler-API for transforms (AST ergonomics).
- **Vendored** corpus snapshot over runtime fetching (reproducibility).
- **`report.md` committed**; `results.json` and the token cache gitignored.
