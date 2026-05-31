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
 * - Whenever a 'credit' moves the balance from strictly below 1000 up to 1000
 *   or more, a 1% interest bonus on the new (post-credit) balance, rounded to
 *   the nearest integer, is added to that entry's reported balance.
 * - The returned array has one balance per entry, in order.
 */
export function runningBalance(entries: Entry[]): number[] {
  let balance = 0
  const result: number[] = []
  for (const entry of entries) {
    const previous = balance
    balance += entry.type === 'credit' ? entry.amount : -entry.amount
    if (balance < 0) balance -= 25
    if (entry.type === 'credit' && previous < 1000 && balance >= 1000) {
      balance += Math.round(balance * 0.01)
    }
    result.push(balance)
  }
  return result
}
