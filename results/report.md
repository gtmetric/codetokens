# Token-Efficiency Report

Positive % = fewer tokens than `baseline`. The headline ranks only **verified** cells (machine-verified semantics-preserving). **Unverified** estimates (`manual` transforms and any cell whose output failed verification) are reported separately and are NOT lossless-guaranteed.

## Verified lossless savings (ranked)

These rows are machine-verified semantics-preserving on the verified samples.

| Transform | Tokenizer | Mean | Median | Min | Max | Verified n | Total n | Method |
|---|---|---|---|---|---|---|---|---|
| combined-best | tiktoken:cl100k_base | 46.9% | 41.3% | 17.7% | 68.5% | 5 | 5 | canonical |
| combined-best | tiktoken:o200k_base | 46.9% | 41.1% | 17.8% | 69.0% | 5 | 5 | canonical |
| minify-whitespace | tiktoken:cl100k_base | 45.9% | 40.8% | 15.6% | 67.0% | 5 | 5 | canonical |
| minify-whitespace | tiktoken:o200k_base | 45.5% | 40.3% | 14.6% | 67.3% | 5 | 5 | canonical |
| strip-types | tiktoken:cl100k_base | 40.4% | 43.9% | 0.2% | 99.9% | 5 | 5 | canonical |
| strip-types | tiktoken:o200k_base | 40.4% | 44.1% | 0.2% | 99.9% | 5 | 5 | canonical |
| rename-idents-short | tiktoken:o200k_base | 38.7% | 29.1% | 12.5% | 64.2% | 5 | 5 | canonical |
| rename-idents-short | tiktoken:cl100k_base | 38.5% | 28.8% | 12.1% | 64.5% | 5 | 5 | canonical |
| rename-idents-dict | tiktoken:o200k_base | 37.9% | 29.1% | 12.5% | 64.2% | 5 | 5 | canonical |
| rename-idents-dict | tiktoken:cl100k_base | 37.6% | 28.8% | 12.1% | 64.5% | 5 | 5 | canonical |
| strip-comments | tiktoken:cl100k_base | 33.5% | 24.8% | 8.0% | 58.8% | 5 | 5 | canonical |
| strip-comments | tiktoken:o200k_base | 33.4% | 24.3% | 8.0% | 58.6% | 5 | 5 | canonical |
| baseline | tiktoken:o200k_base | 0.0% | 0.0% | 0.0% | 0.0% | 5 | 5 | canonical |
| baseline | tiktoken:cl100k_base | 0.0% | 0.0% | 0.0% | 0.0% | 5 | 5 | canonical |
| keyword-sigils | tiktoken:o200k_base | -2.2% | -2.2% | -4.3% | -0.3% | 5 | 5 | round-trip |
| keyword-sigils | tiktoken:cl100k_base | -3.9% | -3.6% | -8.4% | -0.7% | 5 | 5 | round-trip |

## Unverified estimates — NOT lossless-guaranteed

⚠️ These figures include `manual` transforms (never machine-verified) and any cells whose transformed output FAILED verification (possibly semantically broken). They must NOT be treated as safe savings.

| Transform | Tokenizer | Method | Est. mean | Unverified n |
|---|---|---|---|---|
| arrow-functions | tiktoken:o200k_base | manual | 37.2% | 5 |
| arrow-functions | tiktoken:cl100k_base | manual | 37.3% | 5 |

## Cross-tokenizer agreement

- **combined-best**: consistent direction across tokenizers
- **minify-whitespace**: consistent direction across tokenizers
- **strip-types**: consistent direction across tokenizers
- **rename-idents-short**: consistent direction across tokenizers
- **rename-idents-dict**: consistent direction across tokenizers
- **strip-comments**: consistent direction across tokenizers
- **baseline**: consistent direction across tokenizers
- **keyword-sigils**: consistent direction across tokenizers
- **arrow-functions**: consistent direction across tokenizers
