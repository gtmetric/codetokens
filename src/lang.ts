export const LANGS = ['ts', 'tsx', 'js', 'jsx'] as const
export type Lang = (typeof LANGS)[number]

export function langFromPath(path: string): Lang {
  if (path.endsWith('.tsx')) return 'tsx'
  if (path.endsWith('.ts')) return 'ts'
  if (path.endsWith('.jsx')) return 'jsx'
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return 'js'
  throw new Error(`Unsupported file extension: ${path}`)
}
