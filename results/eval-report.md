# Compact-Form Edit-Accuracy Report

Each cell: a fresh Sonnet subagent edited a snippet shown in one form, scored by running its hidden tests. Token cost = mean input tokens (`tiktoken:o200k_base`). "Δ success" is vs the `original` form.

| Form | Edit success | Trials | Mean tokens | Token savings | Δ success vs original |
|---|---|---|---|---|---|
| combined-best | 94% | 45/48 | 88 | 63.5% | -6 pp |
| minify-whitespace | 94% | 45/48 | 94 | 60.9% | -6 pp |
| strip-comments | 100% | 48/48 | 120 | 49.9% | 0 pp |
| strip-types | 100% | 48/48 | 220 | 8.3% | 0 pp |
| original | 100% | 48/48 | 240 | 0.0% | 0 pp |

## Edit success by complexity × form

Shows whether minification fragility rises with code complexity.

| Complexity | original (pass/total) | strip-comments (pass/total) | strip-types (pass/total) | minify-whitespace (pass/total) | combined-best (pass/total) |
|---|---|---|---|---|---|
| simple | 100% (6/6) | 100% (6/6) | 100% (6/6) | 100% (6/6) | 100% (6/6) |
| moderate | 100% (15/15) | 100% (15/15) | 100% (15/15) | 100% (15/15) | 100% (15/15) |
| complex | 100% (15/15) | 100% (15/15) | 100% (15/15) | 80% (12/15) | 80% (12/15) |
| very-complex | 100% (12/12) | 100% (12/12) | 100% (12/12) | 100% (12/12) | 100% (12/12) |

## Calibration (original-form success per snippet)

A snippet whose `original`-form success is low is mis-calibrated (too hard/ambiguous) and its row should be discounted.

- **csv-rownormalizer**: 3/3
- **diff-summarize**: 3/3
- **grade-curve**: 3/3
- **interval-merge**: 3/3
- **inventory-reorder**: 3/3
- **ledger-balance**: 3/3
- **parse-duration**: 3/3
- **path-depth**: 3/3
- **rate-limiter**: 3/3
- **retry-budget**: 3/3
- **shift-scheduler**: 3/3
- **slug-builder**: 3/3
- **tax-bracket**: 3/3
- **tiered-pricing**: 3/3
- **token-bucket**: 3/3
- **word-wrap**: 3/3
