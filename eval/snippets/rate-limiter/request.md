Add a burst exemption to `allow`, keeping every other rule and the export name
unchanged.

New rule: the first 2 events overall (the events at array indices 0 and 1) are
ALWAYS allowed, regardless of the sliding window or `max`. These exempted events
still count toward the window for evaluating later events (i.e. they are recorded
as allowed events just like any normally-allowed event).

All remaining rules are unchanged: timestamps are ascending milliseconds; from
the 3rd event onward an event is allowed only when the number of previously
allowed events with timestamp >= current - windowMs (inclusive) is strictly less
than `max`; a denied event does not count toward the window; one boolean is
returned per event, in order.
