import { mkdirSync } from 'node:fs'
import { loadConfig } from './config.ts'
import { createTokenizers } from './tokenizer/index.ts'
import { loadCorpus } from './corpus/loader.ts'
import { allTransforms } from './transform/index.ts'
import { runExperiment } from './experiment/runner.ts'
import { buildReport } from './experiment/report.ts'

async function main(): Promise<void> {
  const config = loadConfig()
  const tokenizers = createTokenizers(config)
  const corpus = loadCorpus('corpus')
  console.log(`[token-exp] ${corpus.length} files × ${allTransforms.length} transforms × ${tokenizers.length} tokenizers`)

  const cells = await runExperiment(corpus, allTransforms, tokenizers)
  const report = buildReport(cells)

  mkdirSync('results', { recursive: true })
  await Bun.write('results/results.json', JSON.stringify({ cells, rows: report.rows }, null, 2))
  await Bun.write('results/report.md', report.markdown)
  console.log('[token-exp] wrote results/report.md and results/results.json')

  const flagged = cells.filter((c) => c.error != null)
  if (flagged.length > 0) console.warn(`[token-exp] ${flagged.length} cells had errors (see results.json).`)
}

main().catch((err: unknown) => {
  console.error('[token-exp] FAILED:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
