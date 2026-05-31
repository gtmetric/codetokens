/** An inventory item with current stock and sales velocity. */
export type Item = { sku: string; stock: number; dailySales: number; leadDays: number }

/** A planned reorder of `qty` units for a given `sku`. */
export type Reorder = { sku: string; qty: number }

/**
 * Plan reorders for a set of inventory items.
 *
 * Bespoke rules:
 * - Items with `dailySales` <= 0 are skipped entirely.
 * - An item needs reordering when `stock < dailySales * leadDays * 1.5`.
 * - The order quantity targets 30 days of sales: `30 * dailySales - stock`,
 *   rounded UP to the nearest case pack of 10 units.
 * - Items that do not need reordering are omitted from the result.
 * - The result preserves input order among the items that are reordered.
 */
export function planReorders(items: Item[]): Reorder[] {
  const plan: Reorder[] = []
  for (const item of items) {
    if (item.dailySales <= 0) continue
    if (item.stock < item.dailySales * item.leadDays * 1.5) {
      const raw = 30 * item.dailySales - item.stock
      const qty = Math.ceil(raw / 10) * 10
      plan.push({ sku: item.sku, qty })
    }
  }
  return plan
}
