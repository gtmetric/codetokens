# Token-Efficiency Report

Positive % = fewer tokens than `baseline`. `equiv` = fraction of files whose semantic equivalence was machine-verified (`manual` transforms are never auto-verified).

| Transform | Tokenizer | Mean | Median | Min | Max | Equiv | Method | n |
|---|---|---|---|---|---|---|---|---|
| combined-best | tiktoken:o200k_base | 48.5% | 53.4% | 17.8% | 69.3% | 100% | canonical | 4 |
| combined-best | tiktoken:cl100k_base | 48.4% | 53.6% | 17.7% | 68.7% | 100% | canonical | 4 |
| minify-whitespace | tiktoken:cl100k_base | 45.9% | 40.8% | 15.6% | 67.0% | 100% | canonical | 5 |
| minify-whitespace | tiktoken:o200k_base | 45.5% | 40.3% | 14.6% | 67.3% | 100% | canonical | 5 |
| arrow-functions | tiktoken:cl100k_base | 40.9% | 44.4% | 10.2% | 64.5% | 0% | manual | 4 |
| arrow-functions | tiktoken:o200k_base | 40.8% | 44.4% | 10.3% | 64.2% | 0% | manual | 4 |
| strip-types | tiktoken:cl100k_base | 40.4% | 43.9% | 0.2% | 99.9% | 100% | canonical | 5 |
| strip-types | tiktoken:o200k_base | 40.4% | 44.1% | 0.2% | 99.9% | 100% | canonical | 5 |
| rename-idents-short | tiktoken:o200k_base | 38.8% | 29.1% | 12.5% | 64.2% | 100% | canonical | 5 |
| rename-idents-short | tiktoken:cl100k_base | 38.5% | 28.8% | 12.1% | 64.5% | 100% | canonical | 5 |
| rename-idents-dict | tiktoken:o200k_base | 38.0% | 29.1% | 12.5% | 64.2% | 80% | canonical | 5 |
| rename-idents-dict | tiktoken:cl100k_base | 37.7% | 28.8% | 12.1% | 64.5% | 80% | canonical | 5 |
| strip-comments | tiktoken:cl100k_base | 33.5% | 24.8% | 8.0% | 58.8% | 100% | canonical | 5 |
| strip-comments | tiktoken:o200k_base | 33.4% | 24.3% | 8.0% | 58.6% | 100% | canonical | 5 |
| baseline | tiktoken:o200k_base | 0.0% | 0.0% | 0.0% | 0.0% | 100% | canonical | 5 |
| baseline | tiktoken:cl100k_base | 0.0% | 0.0% | 0.0% | 0.0% | 100% | canonical | 5 |
| keyword-sigils | tiktoken:o200k_base | -2.2% | -2.2% | -4.3% | -0.3% | 100% | round-trip | 5 |
| keyword-sigils | tiktoken:cl100k_base | -3.9% | -3.6% | -8.4% | -0.7% | 100% | round-trip | 5 |

## Cross-tokenizer agreement

- **combined-best**: consistent direction across tokenizers
- **minify-whitespace**: consistent direction across tokenizers
- **arrow-functions**: consistent direction across tokenizers
- **strip-types**: consistent direction across tokenizers
- **rename-idents-short**: consistent direction across tokenizers
- **rename-idents-dict**: consistent direction across tokenizers
- **strip-comments**: consistent direction across tokenizers
- **baseline**: consistent direction across tokenizers
- **keyword-sigils**: consistent direction across tokenizers
