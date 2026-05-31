/** A line item in a customer order. */
export type Item = { sku: string; price: number; quantity: number }

export function priceOrder(items: Item[]): number {
  let subtotal = 0
  let discounted = 0
  let hasBulkLine = false
  for (const item of items) {
    const line = item.price * item.quantity
    subtotal += line
    discounted += item.quantity >= 5 ? Math.round(line * 0.9) : line
    if (item.quantity > 10) hasBulkLine = true
  }
  const afterLoyalty = subtotal > 10000 ? discounted - 200 : discounted
  const surcharged = hasBulkLine ? Math.round(afterLoyalty * 1.05) : afterLoyalty
  return Math.max(0, surcharged)
}
