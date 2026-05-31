# Compact-Form Edit-Accuracy Report

Each cell: a fresh Sonnet subagent edited a snippet shown in one form, scored by running its hidden tests. Token cost = mean input tokens (`tiktoken:o200k_base`). "Δ success" is vs the `original` form.

| Form | Edit success | Trials | Mean tokens | Token savings | Δ success vs original |
|---|---|---|---|---|---|
| combined-best | 88% | 21/24 | 74 | 64.9% | -13 pp |
| minify-whitespace | 88% | 21/24 | 81 | 61.6% | -13 pp |
| strip-comments | 100% | 24/24 | 102 | 51.6% | 0 pp |
| strip-types | 100% | 24/24 | 193 | 8.0% | 0 pp |
| original | 100% | 24/24 | 210 | 0.0% | 0 pp |

## Calibration (original-form success per snippet)

A snippet whose `original`-form success is low is mis-calibrated (too hard/ambiguous) and its row should be discounted.

- **csv-rownormalizer**: 3/3
- **grade-curve**: 3/3
- **interval-merge**: 3/3
- **path-depth**: 3/3
- **retry-budget**: 3/3
- **slug-builder**: 3/3
- **tiered-pricing**: 3/3
- **token-bucket**: 3/3
