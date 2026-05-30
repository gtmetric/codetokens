import { parse } from '@babel/parser'
import { z } from 'zod'
import type { Transform } from '../transform.type.ts'
import type { Lang } from '../../lang.ts'

/**
 * Whole-keyword → rare-single-glyph substitution. This is the
 * experiment's crux hypothesis: replacing high-frequency keyword
 * tokens with one-character sigils that tokenize cheaply.
 *
 * Output is intentionally NOT valid JS, so equivalence is proven by
 * round-trip: `invert(apply(x))` must canonicalize back to `x`.
 */
export const SIGILS = {
  function: 'ƒ',
  return: '↩',
  const: '◇',
  export: '⇑',
  import: '⇓',
} as const

/** Forward lookup keyword → sigil (avoids a keyof cast on token.value). */
const SIGIL_BY_KEYWORD = new Map<string, string>(Object.entries(SIGILS))
/** Reverse lookup sigil → keyword for inversion. */
const KEYWORD_BY_SIGIL = new Map<string, string>(
  Object.entries(SIGILS).map(([keyword, sigil]) => [sigil, keyword]),
)

function pluginsFor(lang: Lang): ('typescript' | 'jsx')[] {
  const p: ('typescript' | 'jsx')[] = []
  if (lang === 'ts' || lang === 'tsx') p.push('typescript')
  if (lang === 'tsx' || lang === 'jsx') p.push('jsx')
  return p
}

/**
 * `@babel/types` types `File.tokens` as `any[]`, so the token stream is an
 * untrusted boundary. Narrow each token with Zod rather than letting `any`
 * leak. We only need the byte range, the textual value, and whether the
 * token's type carries a `keyword` field (set on reserved-word tokens, e.g.
 * `function`/`const`; identifiers and strings leave it null/absent).
 */
const TokenSchema = z.object({
  start: z.number(),
  end: z.number(),
  value: z.unknown(),
  type: z
    .object({ keyword: z.string().nullish() })
    .nullish(),
})

export const keywordSigils: Transform = {
  name: 'keyword-sigils',
  description:
    'Replace whole keyword tokens with rare single-glyph sigils (THE crux test). Non-JS output, verified by round-trip.',
  equivalence: 'round-trip',
  apply(code, lang) {
    for (const sig of Object.values(SIGILS)) {
      if (code.includes(sig)) {
        throw new Error(
          `keyword-sigils: source already contains sigil "${sig}"; cannot guarantee round-trip`,
        )
      }
    }
    const ast = parse(code, { sourceType: 'module', plugins: pluginsFor(lang), tokens: true })
    const tokens = ast.tokens ?? []
    let out = ''
    let last = 0
    for (const rawToken of tokens) {
      const parsed = TokenSchema.safeParse(rawToken)
      if (!parsed.success) continue
      const tok = parsed.data
      out += code.slice(last, tok.start)
      // A token is a keyword iff its type carries a set `keyword` field AND its
      // textual value is one we substitute. The Map lookup subsumes the
      // membership check and avoids a `keyof typeof SIGILS` cast on tok.value.
      const isKeyword = tok.type?.keyword != null
      const sigil =
        isKeyword && typeof tok.value === 'string' ? SIGIL_BY_KEYWORD.get(tok.value) : undefined
      out += sigil ?? code.slice(tok.start, tok.end)
      last = tok.end
    }
    out += code.slice(last)
    return out
  },
  invert(code) {
    let out = code
    for (const [sigil, keyword] of KEYWORD_BY_SIGIL) out = out.replaceAll(sigil, keyword)
    return out
  },
}
