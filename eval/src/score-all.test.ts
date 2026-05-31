// eval/src/score-all.test.ts
import { test, expect } from 'bun:test'
import { CandidatesSchema, TrialResultsSchema } from './trial.ts'

test('CandidatesSchema validates a candidate array', () => {
  const ok = [{ snippet: 's', form: 'original', sample: 0, code: 'export const f = 1' }]
  expect(() => CandidatesSchema.parse(ok)).not.toThrow()
})

test('TrialResultsSchema validates results', () => {
  const ok = [{ snippet: 's', form: 'original', sample: 0, passed: true }]
  expect(() => TrialResultsSchema.parse(ok)).not.toThrow()
})
