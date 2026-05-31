/** A single ledger movement. */
export type Entry = { type: 'debit' | 'credit'; amount: number }

/**
 * Compute the running balance reported after each ledger entry.
 *
 * Bespoke rules:
 * - The balance starts at 0.
 * - A 'credit' adds its amount; a 'debit' subtracts its amount.
 * - Whenever an entry leaves the running balance negative (strictly below 0),
 *   a flat overdraft fee of 25 is also subtracted, and that deduction is
 *   reflected in the balance reported for that same entry.
 * - The returned array has one balance per entry, in order.
 */
export function runningBalance(entries: Entry[]): number[] {
  let balance = 0
  const result: number[] = []
  for (const entry of entries) {
    balance += entry.type === 'credit' ? entry.amount : -entry.amount
    if (balance < 0) balance -= 25
    result.push(balance)
  }
  return result
}
