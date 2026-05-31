import { z } from 'zod'

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  TOKEN_CACHE_PATH: z.string().default('.cache/tokens.sqlite'),
})

export type Config = {
  anthropicApiKey?: string
  anthropicModel: string
  cachePath: string
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = EnvSchema.parse(env)
  return {
    anthropicModel: parsed.ANTHROPIC_MODEL,
    cachePath: parsed.TOKEN_CACHE_PATH,
    ...(parsed.ANTHROPIC_API_KEY === undefined ? {} : { anthropicApiKey: parsed.ANTHROPIC_API_KEY }),
  }
}
