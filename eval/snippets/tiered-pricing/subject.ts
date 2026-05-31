/** A line item in a customer order. */
export type Item = { sku: string; price: number; quantity: number }

/**
 * Compute the total price of an order in whole cents.
 *
 * Bespoke pricing rules:
 * - Each line costs price * quantity.
 * - Lines with quantity >= 5 get a 10% discount on that line (rounded).
 * - If the pre-discount subtotal exceeds 10000 cents, a flat 200-cent loyalty
 *   credit is subtracted from the running total.
 * - The final total is never negative.
 */
export function priceOrder(items: Item[]): number {
  let subtotal = 0
  let discounted = 0
  for (const item of items) {
    const line = item.price * item.quantity
    subtotal += line
    discounted += item.quantity >= 5 ? Math.round(line * 0.9) : line
  }
  const afterLoyalty = subtotal > 10000 ? discounted - 200 : discounted
  return Math.max(0, afterLoyalty)
}
