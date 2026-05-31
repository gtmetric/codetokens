Make two additions to `computeTax`, leaving the export name and all existing
rules (5000 standard deduction floored at 0, progressive marginal brackets sorted
ascending by `upTo` with a possible `Infinity` top bracket) otherwise unchanged:

1. Add a 3% surtax on every dollar of PRE-deduction income above 100000 — i.e.
   `0.03 * max(0, income - 100000)` — added on top of the bracket tax. (Note this
   uses the raw `income`, not the post-deduction taxable amount.)

2. Cap the FINAL tax (bracket tax plus surtax, before rounding) at 40% of
   PRE-deduction income: `0.4 * income`.

The final returned value is still rounded to the nearest integer. Compute the
bracket tax and surtax, sum them, apply the 40%-of-income cap, then round.
