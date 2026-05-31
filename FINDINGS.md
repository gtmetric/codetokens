# Findings: token-efficient coding with AI agents

This experiment asked a concrete question — **can JavaScript/TypeScript be made
more token-efficient for AI coding agents?** — and answered it empirically, in
cycles, each measured and verified rather than asserted. This document is the
distilled knowledge. Every claim is tagged with the evidence behind it and an
honest confidence level. Scope and limits are stated at the end; read them.

---

## The one-sentence answer

**For an AI coding agent, the token cost of code lives in human-oriented
redundancy — chiefly comments — not in the language's syntax. You optimize by
removing redundancy from what you *feed* the agent, not by re-encoding the
language; syntax-level "compression" backfires.**

---

## What was measured

**Cycle 1 — static token cost** (transforms applied to 5 real OSS source files,
counted with `tiktoken` o200k + cl100k, every transform semantic-equivalence
verified):

| Transform | ~Token reduction | Note |
|---|---|---|
| strip comments | ~33% | comments are a large share of tokens in documented code |
| minify whitespace | ~46% | whitespace + comments removed |
| strip types | ~40% | **skewed** by one pure-`.d.ts` file; far less on normal code |
| rename identifiers | ~38% | but only **~1pp** on top of minify → renaming is a *weak* lever |
| **keyword → rare-glyph sigils** | **−2 to −4%** | **made code bigger** |

The two GPT tokenizers agreed within ~0.5pp on every transform.

**Cycle 2 + broader eval — does the saving survive the model?** (240 blind
edit trials — one fixed frontier coding model — over 16 bespoke snippets spanning a complexity gradient;
each subagent edited code shown in one form, scored objectively by running
hidden tests; perfect calibration):

| Form | Edit success | ~Token savings | Accuracy cost |
|---|---|---|---|
| strip-comments | **100%** | ~50% | **0 pp** |
| strip-types | 100% | ~8% | 0 pp |
| minify / combined | 94% | ~61–64% | −6 pp |

The −6pp was **entirely one snippet** dropping a required `Math.round` in dense
one-line form; the most-complex tier minified at 100%. So **complexity does not
drive minification fragility** (this overturned an earlier n=1 guess).

**Cycle 3 — WHY vs HOW comments: INCONCLUSIVE.** A 100-trial eval tried to test
whether stripping *rationale* ("why") comments hurts more than *mechanical*
("how") comments. Both forms scored 100% (0pp), but a skeptical post-run
diagnosis found this was a **snippet-design artifact**: all 10 snippets failed to
create a real fork (the requested edit was orthogonal to the constraint, mimicked
an adjacent branch, or rode a language default), so WHY-dependence was never
actually exercised. The question remains **open**. See `results/why-how-report.md`.

---

## Guidelines

### Do (evidence-backed)

1. **Strip mechanical / redundant comments from code you put in an agent's
   context.** Comments are 33–50% of tokens in documented code, and removing
   them cost **0pp** edit accuracy across 16 snippets and every complexity tier.
   *(High confidence — measured.)* Keep the comments in your repo for humans;
   this is about the context you send, and it assumes the task intent is in your
   **prompt**, not mined from the code.
2. **Probably keep "why"/rationale comments** (intent, constraints, workarounds).
   They encode information not recoverable from the code, so an agent that can't
   see them could re-introduce the bug they warn about. *(Principle — Clean Code
   aligned; consistent with the data but NOT yet measured: Cycle 3 was
   inconclusive.)*
3. **Write idiomatic, standard code — it's already near-token-optimal.** Keywords
   are single tokens; the common form is what the tokenizer compresses best.
4. **Optimize the read side, not the write side.** Token cost is dominated by
   what you load into context. Don't ask the agent to *emit* terse code.

### Don't (evidence-backed)

5. **Don't invent a compact syntax or symbol-DSL.** Replacing keywords with rare
   glyphs *increased* tokens 2–4% — rare symbols tokenize into multiple tokens
   while the keywords they replace were already one. This is the direct answer to
   "should we optimize JS at the syntax level": **no.**
6. **Don't shorten/obfuscate identifiers for tokens.** Renaming bought ~1pp over
   minification while destroying semantic hints. Descriptive names are nearly
   free.
7. **Don't strip types for token reasons.** Only ~8% on normal code, and types
   aid correctness. (Type-only `.d.ts` files are unusually token-dense — note it
   when loading them.)
8. **Don't default to aggressive whitespace minification.** It buys ~11pp more
   than comment-stripping but occasionally makes the model drop a fine detail in
   dense code. Reserve it for simple code or where you can verify the output.

### How to know (methodological)

9. **Token count ≠ character count — measure against your real tokenizer.** BPE
   makes "shorter-looking" code sometimes *more* tokens. (This repo is that
   measuring tool.)
10. **A token saving is only real if the agent still produces correct output.**
    Measure the representation cost *and* run the model. Comment-stripping
    passed; aggressive minification had a small failure tail.

---

## The open question (Cycle 3) and how to close it

Whether **"why"** comments are load-bearing for editing is unresolved. Making a
snippet that actually tests it is hard: the *requested change itself* must force
the fork (the natural way to satisfy the request must break the constraint), and
validity must be confirmed by **piloting real agent edits on the why-stripped
form** — not by simulating hand-crafted violations, which gave false confidence
here. A side-observation worth following up (unproven): agents tend to preserve
orthogonal constraints by default and by pattern-mimicry, which *might* reduce
how often rationale comments matter for editing specifically.

---

## Scope & limits (read this before generalizing)

- One fixed model (held constant across all trials), **JS/TS**, an **edit** task, modest n (5 OSS files for
  Cycle 1; 16 + 10 bespoke snippets for the evals).
- **Local `tiktoken` (GPT) tokenizers only.** Other tokenizers (e.g. hosted-model
  ones) are unverified here; the two GPT BPEs agreed within ~0.5pp, so
  cross-tokenizer generalization looks likely but isn't confirmed beyond them.
- The comment results assume task intent lives in the prompt; a workflow that
  relies on the agent reading docstrings for intent would behave differently.
- These are findings from a focused experiment, not a large study. They're meant
  to be *re-measured* with the harness here, not taken on faith.
