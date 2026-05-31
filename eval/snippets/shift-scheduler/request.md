Add a per-worker shift cap to `assignShifts`, keeping the export name and all
existing rules otherwise unchanged.

New rule: a worker may take at most 3 shifts total. A worker who has already been
assigned 3 shifts is no longer eligible for any further shift, regardless of how
much remaining capacity they still have.

All other rules are unchanged: a worker is otherwise eligible when their remaining
capacity is >= the shift's hours; among eligible workers the one with the MOST
remaining hours is chosen with ties broken by earliest index; the chosen worker's
remaining capacity is decremented by the shift's hours; a shift with no eligible
worker is assigned `null`; and one assignment is returned per shift, in order.
