# js-exp — can JS/TS be made more token-efficient for AI coding agents?

AI coding agents read and write source code as **tokens**, and tokens are the
currency of cost, latency, and context budget. This repo is an empirical
experiment into whether JavaScript/TypeScript can be made cheaper for agents to
work with — and, crucially, a **measurement harness** that verifies every claim
instead of asserting it.

## TL;DR

- **Don't re-encode the language.** Replacing keywords with terse symbols
  *increases* tokens — JS keywords are already single BPE tokens. Idiomatic code
  is near-optimal.
- **The real lever is removing human-oriented redundancy from what you feed the
  agent** — above all, **comments**: ~33–50% of tokens in documented code, and
  stripping them cost **0 percentage points** of edit accuracy across 16 snippets
  and every complexity tier.
- **Whitespace minification** saves more (~60%) but occasionally makes the model
  drop a fine detail in dense code; **identifier renaming** and **type stripping**
  are weak/low-value token levers.
- **Character count ≠ token count.** Measure against a real tokenizer; verify the
  agent still produces correct output.

The full, evidence-tagged writeup with honest confidence levels and scope is in
**[`FINDINGS.md`](./FINDINGS.md)**.

## How it was done (cycles)

The work proceeded in verified cycles; design docs are under `docs/superpowers/`
and machine-readable results under `results/`.

1. **Measurement harness** — a multi-tokenizer (Claude API + local `tiktoken`)
   pipeline that applies source transforms to real OSS code and ranks token
   savings, with a **semantic-equivalence checker** so no saving is ever claimed
   on code that was silently broken. → `results/report.md`
2. **Edit-accuracy eval** — does the saving survive the model? Fresh **Sonnet**
   subagents edit code shown in each form, scored objectively by running hidden
   test suites. A broader 240-trial run across a complexity gradient corrected an
   early over-claim. → `results/eval-report.md`
3. **WHY/HOW comment eval** — an attempt to test whether *rationale* comments
   matter more than *mechanical* ones. **Inconclusive** (a snippet-design
   artifact, honestly documented rather than buried). → `results/why-how-report.md`

## Run it

Requires [Bun](https://bun.sh).

```bash
bun install
bun run fetch-corpus        # vendor MIT OSS source into corpus/ (network)

# Cycle 1 — token measurement (tiktoken-only by default; offline)
bun run experiment          # → results/report.md
ANTHROPIC_API_KEY=sk-... bun run experiment   # adds the exact Claude column

# Cycle 2 — edit-accuracy eval (the model-in-the-loop runs are driven via the
# Claude Code Workflow tool; see eval/src/ and the design docs)
bun run eval:generate && bun run eval:score && bun run eval:report

bun test                    # full suite
bun run typecheck
```

> The Claude tokenizer column needs a **funded Anthropic API key** (there's no
> accurate local Claude tokenizer). Without one, the harness degrades gracefully
> to the local GPT tokenizers — which is how every result here was produced.

## Repository layout

```
src/
  tokenizer/        multi-tokenizer adapters (tiktoken + Anthropic) + cache
  transform/        Babel-based code transforms + canonicalizer + equivalence checker
  experiment/       runner + report (Cycle 1)
corpus/             vendored MIT OSS source + manifest + ATTRIBUTION.md
eval/
  src/              edit-eval harness (forms, scorer, report, Sonnet workflow)
  snippets/         16 bespoke edit snippets (complexity-tiered)
  why-how/          Cycle 3 eval (2 comment forms + 10 snippets)
docs/superpowers/   specs + implementation plans (design history)
results/            committed reports (the findings artifacts)
```

## What makes the results trustworthy

This experiment's discipline is the point:

- **Semantic-equivalence verification** gates every token saving — broken or
  unverifiable transforms are excluded from headline numbers, never over-claimed.
- **Blind subjects:** eval agents see only the code form + the task, never the
  hidden tests or reference; answers are physically relocated out of the repo
  during runs.
- **Objective scoring:** edits are graded by executing hidden test suites, not by
  an LLM judging itself.
- **Calibration gates** and **skeptical post-run diagnosis** — when a result
  looked too clean (Cycle 3's 0pp), it was investigated and reported as an
  artifact rather than a finding.

See **[`FINDINGS.md`](./FINDINGS.md)** for limits and scope; these are
focused-experiment findings meant to be **re-measured**, not taken on faith.

## License

Code and docs: MIT (see [`LICENSE`](./LICENSE)). The `corpus/` files are
third-party OSS vendored under their own MIT licenses — see
[`corpus/ATTRIBUTION.md`](./corpus/ATTRIBUTION.md).
