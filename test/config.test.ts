// test/config.test.ts
import { test, expect } from 'bun:test'
import { loadConfig } from '../src/config.ts'

test('defaults apply and api key is optional', () => {
  const cfg = loadConfig({})
  expect(cfg.anthropicModel).toBe('claude-sonnet-4-6')
  expect(cfg.cachePath).toContain('tokens.sqlite')
  expect('anthropicApiKey' in cfg).toBe(false)
})

test('reads api key when present', () => {
  const cfg = loadConfig({ ANTHROPIC_API_KEY: 'sk-test' })
  expect(cfg.anthropicApiKey).toBe('sk-test')
})
