export type VatCategory = 'standard'

export function vatCents(netCents: number, category: VatCategory): number {
  if (category === 'standard') return Math.ceil(netCents * 0.15 - 0.5)
  return 0
}
