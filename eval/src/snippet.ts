import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { LANGS, type Lang } from '../../src/lang.ts'

const MetaSchema = z.object({ exportName: z.string().min(1), lang: z.enum(LANGS) })
export type SnippetMeta = z.infer<typeof MetaSchema>

export type Snippet = {
  name: string
  dir: string
  meta: SnippetMeta
  subject: string
  reference: string
  request: string
  testPath: string
}

export function loadSnippets(root = 'eval/snippets'): Snippet[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = join(root, d.name)
      const meta = MetaSchema.parse(JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')))
      return {
        name: d.name,
        dir,
        meta,
        subject: readFileSync(join(dir, 'subject.ts'), 'utf8'),
        reference: readFileSync(join(dir, 'reference.ts'), 'utf8'),
        request: readFileSync(join(dir, 'request.md'), 'utf8'),
        testPath: join(dir, 'editcheck.ts'),
      }
    })
}
