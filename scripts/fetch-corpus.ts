// Fetches a small set of permissively-licensed (MIT) real-world source files
// at pinned version tags, verifies each parses, and writes corpus/manifest.json.
import { mkdirSync } from 'node:fs'
import { parseCode } from '../src/transform/babel.ts'
import { langFromPath } from '../src/lang.ts'

type Target = { localName: string; url: string; license: string }

// Pinned tags (stable). If any URL 404s, replace with another file of the same
// idiom from an MIT-licensed repo and keep the license/source fields accurate.
const TARGETS: Target[] = [
  { localName: 'util-pmap.js', url: 'https://raw.githubusercontent.com/sindresorhus/p-map/v7.0.3/index.js', license: 'MIT' },
  { localName: 'http-ky.ts', url: 'https://raw.githubusercontent.com/sindresorhus/ky/v1.7.2/source/index.ts', license: 'MIT' },
  { localName: 'util-typefest-paths.ts', url: 'https://raw.githubusercontent.com/sindresorhus/type-fest/v4.26.1/source/get.d.ts', license: 'MIT' },
  { localName: 'util-nanoid.js', url: 'https://raw.githubusercontent.com/ai/nanoid/5.0.7/index.browser.js', license: 'MIT' },
  { localName: 'state-zustand.ts', url: 'https://raw.githubusercontent.com/pmndrs/zustand/v4.5.5/src/vanilla.ts', license: 'MIT' },
]

const entries: { path: string; lang: string; source: string; license: string }[] = []
mkdirSync('corpus', { recursive: true })

for (const target of TARGETS) {
  const res = await fetch(target.url)
  if (!res.ok) {
    console.error(`SKIP ${target.localName}: ${res.status} ${target.url} — replace with an equivalent MIT file.`)
    continue
  }
  const code = await res.text()
  const localPath = `corpus/${target.localName}`
  const lang = langFromPath(localPath)
  try {
    parseCode(code, lang)
  } catch (err) {
    console.error(`SKIP ${target.localName}: does not parse as ${lang} (${String(err)})`)
    continue
  }
  await Bun.write(localPath, code)
  entries.push({ path: target.localName, lang, source: target.url, license: target.license })
  console.log(`OK ${target.localName} (${lang}, ${code.length} chars)`)
}

if (entries.length < 4) throw new Error(`Only ${entries.length} corpus files acquired; need >= 4. Replace failed URLs.`)
await Bun.write('corpus/manifest.json', JSON.stringify({ files: entries }, null, 2))
console.log(`Wrote corpus/manifest.json with ${entries.length} files.`)
