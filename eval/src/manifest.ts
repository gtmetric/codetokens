import { z } from 'zod'
import { LANGS } from '../../src/lang.ts'

const FormDataSchema = z.object({ code: z.string(), tokens: z.record(z.string(), z.number()) })

export const GeneratedSchema = z.object({
  snippets: z.array(
    z.object({
      name: z.string(),
      lang: z.enum(LANGS),
      exportName: z.string(),
      request: z.string(),
      // Keyed by form name; a partial set is allowed so the schema stays robust.
      forms: z.record(z.string(), FormDataSchema),
    }),
  ),
})
export type Generated = z.infer<typeof GeneratedSchema>
