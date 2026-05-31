// Produces a self-contained workflow script with the manifest baked in, so the
// Workflow runtime (which has no filesystem access) needs no `args`. We inline
// the manifest where the template reads `args.snippets`, copying it byte-exact
// (no hand-transcription) to avoid corrupting any subject's input code.
import { readFileSync, writeFileSync } from 'node:fs'

const MARKER = 'args.snippets'
const manifest = readFileSync('eval/generated.json', 'utf8').trim()
const template = readFileSync('eval/src/eval.workflow.js', 'utf8')

if (!template.includes(MARKER)) throw new Error(`template missing "${MARKER}" marker`)

const script = template.replace(MARKER, `(${manifest}).snippets`)
writeFileSync('eval/src/eval.generated.workflow.js', script)
console.log(`[eval] wrote eval/src/eval.generated.workflow.js (${script.length} bytes)`)
