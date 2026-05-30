import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { Tokenizer } from './tokenizer.type.ts'

export type TokenCache = {
  get(key: string): number | undefined
  set(key: string, count: number): void
}

const RowSchema = z.object({ n: z.number() })

export function createCache(path: string): TokenCache {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true })
  db.run('CREATE TABLE IF NOT EXISTS tok (k TEXT PRIMARY KEY, n INTEGER NOT NULL)')
  const getStmt = db.query('SELECT n FROM tok WHERE k = ?')
  const setStmt = db.query('INSERT OR REPLACE INTO tok (k, n) VALUES (?, ?)')
  return {
    get(key) {
      const row = getStmt.get(key)
      return row == null ? undefined : RowSchema.parse(row).n
    },
    set(key, count) {
      setStmt.run(key, count)
    },
  }
}

function sha256(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex')
}

export function withCache(tokenizer: Tokenizer, cache: TokenCache): Tokenizer {
  return {
    name: tokenizer.name,
    async countTokens(text) {
      const key = `${tokenizer.name}:${sha256(text)}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      const count = await tokenizer.countTokens(text)
      cache.set(key, count)
      return count
    },
  }
}
