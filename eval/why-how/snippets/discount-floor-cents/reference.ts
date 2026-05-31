export type Tier = 'member' | 'bulk'

// Consumer-protection rules forbid ever charging more than the exact discounted
// amount, so a fractional cent is always dropped (floored), never rounded to the
// nearest cent — rounding up by even one cent would be an illegal overcharge.
export function discountedCents(priceCents: number, tier: Tier): number {
  if (tier === 'member') return Math.floor(priceCents * 0.9)
  if (tier === 'bulk') return Math.floor(priceCents * 0.67)
  return priceCents
}
