/** A progressive tax bracket: `rate` applies up to taxable income `upTo`. */
export type Bracket = { upTo: number; rate: number }

/**
 * Compute progressive (marginal) income tax.
 *
 * Bespoke rules:
 * - A standard deduction of 5000 is subtracted from `income` before taxing; the
 *   taxable amount is floored at 0.
 * - `brackets` are sorted ascending by `upTo`. Each bracket's `rate` applies to
 *   the portion of taxable income between the previous bracket's `upTo` and this
 *   bracket's `upTo`. The final bracket's `upTo` may be `Infinity`.
 * - A 3% surtax is added on every dollar of PRE-deduction income above 100000.
 * - The final tax (bracket tax plus surtax) is capped at 40% of PRE-deduction
 *   income, then rounded to the nearest integer.
 */
export function computeTax(income: number, brackets: Bracket[]): number {
  const taxable = Math.max(0, income - 5000)
  let prev = 0
  let tax = 0
  for (const bracket of brackets) {
    const top = Math.min(taxable, bracket.upTo)
    if (top > prev) tax += (top - prev) * bracket.rate
    prev = bracket.upTo
    if (taxable <= bracket.upTo) break
  }
  const surtax = 0.03 * Math.max(0, income - 100000)
  const total = tax + surtax
  const capped = Math.min(total, 0.4 * income)
  return Math.round(capped)
}
