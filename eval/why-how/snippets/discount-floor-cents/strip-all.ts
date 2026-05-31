export type Tier = 'member'

export function discountedCents(priceCents: number, tier: Tier): number {
  if (tier === 'member') return Math.floor(priceCents * 0.9)
  return priceCents
}
