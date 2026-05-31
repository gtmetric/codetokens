import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { LANGS, type Lang } from '../lang.ts'

const ManifestSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      lang: z.enum(LANGS),
      source: z.string().url(),
      license: z.string(),
    }),
  ),
})

export type CorpusFile = {
  path: string
  lang: Lang
  code: string
  source: string
  license: string
}

export function loadCorpus(dir = 'corpus'): CorpusFile[] {
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')))
  return manifest.files.map((f) => ({
    path: f.path,
    lang: f.lang,
    code: readFileSync(join(dir, f.path), 'utf8'),
    source: f.source,
    license: f.license,
  }))
}
