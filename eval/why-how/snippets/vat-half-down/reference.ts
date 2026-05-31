export type VatCategory = 'standard' | 'reduced'

// Our tax authority mandates round-half-down on VAT: a charge landing exactly
// on half a cent rounds toward the lower cent, never up. The conventional
// round-half-up (Math.round) would over-collect by a cent and fail an audit.
export function vatCents(netCents: number, category: VatCategory): number {
  if (category === 'standard') return Math.ceil(netCents * 0.15 - 0.5)
  if (category === 'reduced') return Math.ceil(netCents * 0.05 - 0.5)
  return 0
}
