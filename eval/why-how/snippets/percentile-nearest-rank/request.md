Add support for the 90th percentile. Extend the `Pct` type to include `'p90'`
and make `percentile` return the 90th percentile of the already-sorted input.
The existing `'p50'` behavior is unchanged.
