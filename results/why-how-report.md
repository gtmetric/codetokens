# WHY/HOW Comment Eval — Results

> ## ⚠️ VERDICT: INCONCLUSIVE — the 0pp result is a snippet-design artifact, NOT a finding.
>
> A post-run skeptical diagnosis (verified by reading all 50 `strip-all` candidates and by
> running deliberate constraint-violating edits through each `editcheck`) found that **all 10
> snippets failed to create a real fork.** The editchecks are sound — they catch deliberate
> violations — but the Sonnet subjects were never *tempted* to violate, because in every snippet
> the requested change is **orthogonal to the constraint**, mimics an **adjacent branch's idiom**,
> or rides a **language default**:
> - *Append-only* edits (csv-trailing-empty, dedupe-keep-last, slug-collapse-runs, retry-backoff-cap,
>   reverse-collect, legacy-timestamp-clamp): the constraint sits in code the edit never touches.
> - *Branch-mimicry* edits (discount-floor-cents, percentile-nearest-rank, vat-half-down): "add a new
>   tier/percentile/category" → the agent copies the neighboring branch's idiom (`Math.floor`,
>   nearest-rank, `ceil(x-0.5)`), inheriting the rule by mimicry, never *deciding* it.
> - *Language-default* edits (priority-stable-sort): JS `Array.sort` is stable since ES2019, so the
>   natural descending edit preserves tie-order for free.
>
> **So this eval did NOT test WHY-dependence on any snippet; "WHY effect = 0pp" is meaningless here.**
> The methodological lesson: a valid WHY-load-bearing snippet needs the **requested change itself**
> to force the fork (the natural way to satisfy the request must *break* the constraint), and validity
> must be confirmed by **piloting actual agent edits on the WHY-stripped form** — not by simulating
> hand-crafted violations (which gave false confidence here). See the project memory for the redesign recipe.

Blind Sonnet subjects edited each snippet shown with WHY-comments kept (`strip-how`) vs all comments removed (`strip-all`). Scored by hidden tests encoding a constraint stated ONLY in the WHY-comment. **WHY effect = success(strip-how) − success(strip-all).**

| Form | Edit success | Trials |
|---|---|---|
| strip-all | 100% | 50/50 |
| strip-how | 100% | 50/50 |

**WHY effect: 0 percentage points** — strip-how 100% vs strip-all 100%.

## Per-snippet (strip-how / strip-all)

- **csv-trailing-empty**: strip-how 5/5, strip-all 5/5
- **dedupe-keep-last**: strip-how 5/5, strip-all 5/5
- **discount-floor-cents**: strip-how 5/5, strip-all 5/5
- **legacy-timestamp-clamp**: strip-how 5/5, strip-all 5/5
- **percentile-nearest-rank**: strip-how 5/5, strip-all 5/5
- **priority-stable-sort**: strip-how 5/5, strip-all 5/5
- **retry-backoff-cap**: strip-how 5/5, strip-all 5/5
- **reverse-collect**: strip-how 5/5, strip-all 5/5
- **slug-collapse-runs**: strip-how 5/5, strip-all 5/5
- **vat-half-down**: strip-how 5/5, strip-all 5/5
