In addition to clamping the refilled balance so it never exceeds the bucket cap,
also floor the result at 0 so it is never negative. A negative starting `tokens`
value that is still negative after the refill must be returned as 0. The token
accumulation formula ((elapsedMs / 1000) * ratePerSec added to the current
balance) and the upper clamp to `cap` must be unchanged.
