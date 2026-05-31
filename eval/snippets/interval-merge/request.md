Merge two spans whenever the gap between them is at most 2 — i.e. when the next
span's start minus the current merged end is ≤ 2 — in addition to overlapping
spans. (So `[1,3]` and `[5,9]` merge into `[1,9]` because the gap is 2.) All
other behavior (sorting ascending by start, taking the largest end seen) must be
unchanged.
