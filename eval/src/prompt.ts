export function buildSubjectPrompt(formCode: string, request: string, exportName: string): string {
  return [
    'You are editing a JavaScript/TypeScript module. Below is its COMPLETE current source.',
    '',
    '```',
    formCode,
    '```',
    '',
    'Make exactly this change:',
    '',
    request.trim(),
    '',
    'Requirements:',
    '- Return the COMPLETE modified module source (not a diff or a fragment).',
    `- Preserve the existing export \`${exportName}\` (same name and calling convention).`,
    '- Output ONLY the code in a single fenced code block. No prose.',
    '- Do NOT read files or use any tools. Everything you need is in this message; work only from the source above.',
  ].join('\n')
}
