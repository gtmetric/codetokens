Add two guardrails to `planReorders`, keeping the export name and all existing
rules (skip items with `dailySales` <= 0; reorder when
`stock < dailySales * leadDays * 1.5`; target `30 * dailySales - stock` rounded
UP to the nearest case pack of 10; omit items that don't need reordering;
preserve input order) otherwise unchanged:

1. Cap any single order at 500 units (a computed quantity above 500 becomes 500).

2. Enforce a minimum order of one case — 10 units — for any item that needs
   reordering (a computed quantity below 10, including 0 or negative results from
   the rounding, becomes 10).

Apply both clamps to the case-rounded quantity. The reorder eligibility test is
unchanged: items that don't meet the reorder condition are still omitted entirely.
