Treat spans that merely touch as overlapping and merge them too. That is, when one
span's end equals the next span's start (they share a single boundary point), the
two spans should be merged into one rather than kept separate. All other behavior
(sorting ascending by start, merging strictly-overlapping spans, taking the largest
end) must be unchanged.
