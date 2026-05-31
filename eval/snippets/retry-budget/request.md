Cap the backoff delays. Whenever a computed delay would exceed 5000ms, replace it
with a capped value of 5000ms plus a fixed extra 50ms (i.e. 5050ms). Delays of
5000ms or less are left unchanged. The underlying doubling progression that
produces each attempt's delay is unchanged; only the per-attempt value that gets
recorded is capped. Returning one delay per attempt and yielding an empty array
for a non-positive attempt count must be unchanged.
