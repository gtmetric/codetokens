Tighten the `moved` detection in `summarize`, keeping the export name and the
`added` / `removed` rules unchanged.

Currently an item present in both arrays counts as `moved` whenever its index
differs at all. Change this so an item only counts as `moved` when its index
changed by MORE than one position — that is, the absolute difference between its
`oldArr` index and its `newArr` index is strictly greater than 1. An item whose
index shifted by exactly 0 or exactly 1 is neither moved nor reported anywhere.

For example, swapping two adjacent items (each shifting by 1) yields an empty
`moved` list. `added` and `removed` are computed exactly as before, and `moved`
items still appear in `newArr` order.
