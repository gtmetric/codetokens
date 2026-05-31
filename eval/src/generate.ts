import { writeFileSync } from 'node:fs'
import { loadConfig } from '../../src/config.ts'
import { createTokenizers } from '../../src/tokenizer/index.ts'
import { loadSnippets } from './snippet.ts'
import { FORMS, makeForm } from './form.ts'
import { GeneratedSchema, type Generated } from './manifest.ts'

async function main(): Promise<void> {
  const tokenizers = createTokenizers(loadConfig())
  const snippets = loadSnippets()
  const out: Generated['snippets'] = []
  for (const s of snippets) {
    const forms: Generated['snippets'][number]['forms'] = {}
    for (const form of FORMS) {
      const code = makeForm(s.subject, s.meta.lang, form)
      const tokens: Record<string, number> = {}
      for (const t of tokenizers) {
        try {
          tokens[t.name] = await t.countTokens(code)
        } catch (err) {
          console.warn(`[eval] tokenizer ${t.name} failed, skipping: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      forms[form] = { code, tokens }
    }
    out.push({ name: s.name, lang: s.meta.lang, exportName: s.meta.exportName, complexity: s.meta.complexity, request: s.request, forms })
  }
  const manifest = GeneratedSchema.parse({ snippets: out })
  writeFileSync('eval/generated.json', JSON.stringify(manifest, null, 2))
  console.log(`[eval] wrote eval/generated.json — ${out.length} snippets × ${FORMS.length} forms`)
}

main().catch((err: unknown) => {
  console.error('[eval] generate failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
