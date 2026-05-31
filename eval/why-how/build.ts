// Builds a self-contained workflow for the WHY/HOW eval by reusing the existing
// hardened eval.workflow.js as a template: inline the why-how manifest where it
// reads `args.snippets`, and bump SAMPLES 3 → 5. No filesystem access is needed
// at workflow runtime (the form code is baked in, byte-exact).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const ROOT = 'eval/why-how/snippets'
const MetaSchema = z.object({ exportName: z.string().min(1) })

const snippets = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(ROOT, d.name)
    const meta = MetaSchema.parse(JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')))
    return {
      name: d.name,
      exportName: meta.exportName,
      request: readFileSync(join(dir, 'request.md'), 'utf8').trim(),
      forms: {
        'strip-how': { code: readFileSync(join(dir, 'strip-how.ts'), 'utf8') },
        'strip-all': { code: readFileSync(join(dir, 'strip-all.ts'), 'utf8') },
      },
    }
  })

const manifest = JSON.stringify({ snippets })
const template = readFileSync('eval/src/eval.workflow.js', 'utf8')
if (!template.includes('args.snippets') || !template.includes('const SAMPLES = 3')) {
  throw new Error('eval.workflow.js template markers not found')
}
const script = template
  .replace('args.snippets', `(${manifest}).snippets`)
  .replace('const SAMPLES = 3', 'const SAMPLES = 5')

writeFileSync('eval/why-how/run.generated.workflow.js', script)
console.log(
  `[why-how] wrote run.generated.workflow.js — ${snippets.length} snippets × 2 forms × 5 = ${snippets.length * 2 * 5} trials`,
)
