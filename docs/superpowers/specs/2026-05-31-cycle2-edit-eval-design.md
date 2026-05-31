# Cycle 2 — Compact-Form Edit-Accuracy Eval — Design

- **Date:** 2026-05-31
- **Status:** Approved (pending spec review)
- **Cycle:** 2 of N — *Does the model still code correctly on token-reduced source?*

## 1. Context & motivation

Cycle 1 (merged to `main`) measured the *static token cost* of source transforms
across tiktoken o200k/cl100k, with semantic-equivalence verification. Key
findings: the lossless wins are **information deletions** — whitespace+comments
(`minify-whitespace` ~46%), comments (~33%), types (~40%) — while re-encodings
are weak or negative (identifier rename adds only ~1pp over minify;
`keyword-sigils` *increased* tokens). See
`docs/superpowers/specs/2026-05-31-js-token-efficiency-design.md` and
`results/report.md`.

Cycle 1 deliberately did **not** answer the question that decides whether those
savings are real: **can a coding agent still read and edit code correctly once
its comments / types / formatting are stripped?** If stripping comments saves
33% tokens but the model then misreads intent and produces broken edits, the
savings are illusory — paid back in retries and wrong answers. Token-counting
cannot answer this; only running a model can. The user chose to bring this eval
forward (originally sketched as Cycle 3) before building any production codec,
because it gates whether a codec is worth building at all.

## 2. Goal & success criteria

Measure whether feeding a coding agent source in **token-reduced forms**
degrades its ability to **correctly edit** that code, and quantify the
trade-off against the token savings.

Per trial: *given module M in form X plus change-request R, does the model's
edited output pass M's hidden test suite T?*

**Done when** the harness produces `results/eval-report.md` reporting, per form,
the **edit-success-rate** (with sample variance), **mean input-token-cost**, and
**Δsuccess vs Δtokens** against the `original` baseline — across ~8 snippets × 5
forms × 3 samples (~120 Sonnet trials), with objective test-execution scoring and
a passing baseline-calibration gate.

## 3. Architecture — 4 stages

```
generate forms+tokens (script) → collect candidate edits (Workflow: Sonnet subjects) → score by tests (script) → aggregate report (script)
```

The model-in-the-loop middle stage is a **Workflow** fan-out of fresh subagents;
every objective step (form generation, token counting, test execution, scoring,
aggregation) is deterministic Bun code, mirroring Cycle 1's discipline. The split
exists because Workflow scripts cannot touch the filesystem — subjects only
*generate* edits (returned as structured output); scoring runs as a batch script
on the collected candidates afterward.

## 4. Components

### 4.1 Snippet set (`eval/snippets/<name>/`)

~8 bespoke, self-contained modules of **novel / arbitrary logic** —
deliberately NOT textbook algorithms the model could edit from memory, so it must
read *this* specific code. Each snippet directory contains:

- `original.ts` — the module: comments + TS types present (so strip-comments /
  strip-types have something to remove), exactly one **stable named export**,
  no external/runtime dependencies, pure and deterministic.
- `request.md` — a plain-English change request, answerable from the code in any
  form, that must NOT rename the export.
- `<name>.test.ts` — a behavioral `bun:test` suite covering (a) the NEW behavior
  required by the request and (b) REGRESSION (pre-existing behavior preserved).
  Imports the stable export. **Hidden from the subject.**
- `meta.json` — Zod-validated: export name, language, and any fixture inputs.

Authored by the orchestrator; the Sonnet subjects are blind and isolated, so
authoring does not contaminate them.

### 4.2 Form generator (`eval/src/form.ts`)

Reuses Cycle 1 `src/transform`. For each snippet's `original.ts`, emits 5 forms:
`original`, `strip-comments`, `strip-types`, `minify-whitespace`,
`combined-best`. Each form's input-token count is computed via Cycle 1
`src/tokenizer` (tiktoken o200k + cl100k; Claude omitted — unfunded). Exports are
preserved across all forms (a Cycle 1 invariant), so the subject always knows
what to modify and the tests can import it. Output: a `generated.json` manifest
(per snippet: request text, the 5 form strings, per-form token counts).

### 4.3 Subject collector (Workflow, **Sonnet**)

Orchestrates ~8×5×3 ≈ 120 trials. The `generated.json` manifest (§4.2) is passed
into the workflow as its `args` input, so the script can embed each form's code
text directly in the prompt (Workflow scripts have no filesystem access). Each
trial dispatches a fresh `claude-sonnet-4-6` subagent whose prompt contains ONLY:
the form-X code, the change request, and an instruction to return the COMPLETE
modified module as a single code block preserving the export. The subagent is blind to the tests, the
original, ground truth, and all prior project context. Returns structured
`{ trialId, snippet, form, sample, candidateCode }`. The workflow returns the
full array; a post-step writes candidates to disk for scoring.

### 4.4 Scorer (`eval/src/score.ts`)

For each candidate: write it to an **isolated temp module**, run that snippet's
hidden test suite against it via `bun test` in a **subprocess with a timeout**,
record `passed: boolean` (all tests green) plus failure detail. Deterministic;
no model involved.

### 4.5 Aggregator & report (`eval/src/report.ts`)

Per form: **edit-success-rate** (passed / total), sample variance, mean
input-token-cost, and **Δsuccess-rate vs Δtoken-cost** against `original`.
Emits `results/eval-report.md` (ranked table + per-snippet breakdown + the
decision signal) and `results/eval-results.json`.

## 5. Methodological controls

- **Blind subjects** — see only (form-X code + request).
- **Single variable** — same snippet + request + tests across all 5 forms; only
  the input form differs.
- **Fresh, non-textbook code** — bespoke logic, not the Cycle 1 corpus.
- **3 samples per cell** — success *rate* with variance, not one pass/fail (the
  model is non-deterministic).
- **Baseline-calibration gate** — if the `original` form does not pass for the
  large majority of its samples, the snippet is mis-calibrated (too hard or
  ambiguous) and is revised before the run counts. Reported explicitly.
- **Fixed model** — `claude-sonnet-4-6` for every subject (reproducibility,
  cost).
- **Objective scoring** — pass/fail by test execution only; no LLM-as-judge.

## 6. Metrics & decision signal

The headline is **success-rate vs input-token-savings per form**. The decision:
which forms save tokens *without* materially hurting edit accuracy (worth
adopting) vs which save tokens but break edits (illusory savings). A conclusion
takes the form "form F saves N% tokens at a cost of P percentage points of edit
accuracy vs the original" — turning Cycle 1's token numbers into net-value
numbers, computed per form from the measured rates.

## 7. Tech stack & structure

Reuses Cycle 1 `src/transform` (forms) and `src/tokenizer` (token counts). New
work lives under `eval/`. Bun + strict TS (same tsconfig flags), Zod at
boundaries (`meta.json`, `generated.json`, workflow structured outputs),
`bun:test` for the harness's own unit tests and as the snippet test runner.
Subject orchestration via the **Workflow** tool on **Sonnet**.

```
eval/
  snippets/<name>/{original.ts, request.md, <name>.test.ts, meta.json}
  src/
    form.ts        # original.ts → 5 forms + token counts (reuses src/transform, src/tokenizer)
    generate.ts    # build generated.json manifest for all snippets
    prompt.ts      # build the blind subject prompt for (form, request)
    extract.ts     # extract the code block from a subject's response
    score.ts       # run a snippet's hidden tests against a candidate (subprocess + timeout)
    report.ts      # aggregate success-rate vs token-cost → eval-report.md
    eval.workflow.js  # Workflow script: fan out ~120 Sonnet subject trials
  candidates/      # generated; gitignored
results/
  eval-report.md   # committed
  eval-results.json # gitignored
```

## 8. Error handling

- A subject that returns unparseable / no code → that trial scores as a fail with
  a recorded reason (it IS a real outcome: the model failed to produce usable
  code on that form). Never crashes the run.
- A test execution that times out or errors → fail with reason.
- Token counting reuses Cycle 1's cached, offline tiktoken path.
- Top-level scripts throw to a single catch and exit non-zero with a clean
  message.

## 9. Testing strategy (the harness's own tests)

`bun:test`, TDD: `form.ts` (emits 5 valid forms preserving the export),
`extract.ts` (pulls code from fenced / unfenced / chatty responses),
`score.ts` (a known-good candidate passes, a known-broken one fails, a timeout is
handled), `report.ts` (success-rate / variance / Δ math on synthetic trial
matrices). The Workflow orchestration is exercised by the real run.

## 10. Risks & mitigations

- **Executing model-generated code** → candidates are run to score them. The
  snippet domain is pure-compute (no network / fs), executed in a subprocess with
  a timeout on the user's own machine. Low risk; flagged explicitly and the
  snippet domain is kept pure.
- **Calibration** → baseline-calibration gate (above).
- **Snippet recognition** → bespoke, arbitrary logic, not famous algorithms.
- **Non-determinism** → 3 samples/cell + variance reporting; model pinned to
  Sonnet.
- **Small N** → ~8 snippets is a focused first read, not a publishable study;
  the report states this and the design scales to a broader run later.

## 11. Out of scope (YAGNI for Cycle 2)

The read-only output-prediction task; the round-trip reconstruction task;
non-Sonnet models; the Claude token column (API unfunded); and building any
production codec. Cycle 2 is solely this eval. A codec (Cycle 3+) is justified
only by what this eval shows.

## 12. Decisions made

- **Eval before codec** — measure whether savings survive the model first.
- **Edit task** (read + write) over output-prediction or reconstruction —
  most representative of real agent coding.
- **Fresh isolated Sonnet subagents** as blind subjects; **objective
  test-execution scoring**; **bespoke fresh snippets**.
- **Focused scale** — ~8 × 5 × 3 ≈ 120 trials.
- **Reuse** Cycle 1 transforms + tokenizers; new code under `eval/`.
