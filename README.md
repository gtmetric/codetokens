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
