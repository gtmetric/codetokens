export const meta = {
  name: 'cycle2-edit-eval',
  description: 'Fan out Sonnet subjects to edit code shown in 5 forms; collect candidate edits',
  phases: [{ title: 'Edit', detail: 'one Sonnet subject per snippet × form × sample' }],
}

// args = the parsed eval/generated.json manifest. SAMPLES per (snippet × form).
const SAMPLES = 3

const CANDIDATE_SCHEMA = {
  type: 'object',
  required: ['code'],
  additionalProperties: false,
  properties: { code: { type: 'string', description: 'the COMPLETE modified module source' } },
}

// Inlined prompt builder (workflow scripts cannot import project modules).
function buildPrompt(formCode, request, exportName) {
  return [
    'You are editing a JavaScript/TypeScript module. Below is its COMPLETE current source.',
    '', '```', formCode, '```', '',
    'Make exactly this change:', '', String(request).trim(), '',
    'Requirements:',
    '- Return the COMPLETE modified module source (not a diff or a fragment).',
    `- Preserve the existing export \`${exportName}\` (same name and calling convention).`,
    '- Output ONLY the code in a single fenced code block. No prose.',
  ].join('\n')
}

const tasks = []
for (const s of args.snippets) {
  for (const form of Object.keys(s.forms)) {
    for (let sample = 0; sample < SAMPLES; sample++) {
      tasks.push({ snippet: s.name, form, sample, code: s.forms[form].code, request: s.request, exportName: s.exportName })
    }
  }
}
log(`dispatching ${tasks.length} Sonnet edit trials`)

const results = await parallel(
  tasks.map((t) => async () => {
    const out = await agent(buildPrompt(t.code, t.request, t.exportName), {
      model: 'sonnet',
      schema: CANDIDATE_SCHEMA,
      label: `${t.snippet}:${t.form}#${t.sample}`,
      phase: 'Edit',
    })
    return { snippet: t.snippet, form: t.form, sample: t.sample, code: out?.code ?? '' }
  }),
)

return results.filter(Boolean)
