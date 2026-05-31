import { z } from 'zod'
import { FORMS } from './form.ts'

export const CandidateSchema = z.object({
  snippet: z.string(),
  form: z.enum(FORMS),
  sample: z.number().int().nonnegative(),
  code: z.string(),
})
export const CandidatesSchema = z.array(CandidateSchema)
export type Candidate = z.infer<typeof CandidateSchema>

export const TrialResultSchema = z.object({
  snippet: z.string(),
  form: z.enum(FORMS),
  sample: z.number().int().nonnegative(),
  passed: z.boolean(),
  detail: z.string().optional(),
})
export const TrialResultsSchema = z.array(TrialResultSchema)
export type TrialResult = z.infer<typeof TrialResultSchema>
