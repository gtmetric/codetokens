After curving and clamping each score, round it to the nearest multiple of 5
(values exactly halfway round up, following standard rounding). For example a
clamped score of 73 becomes 75 and 87 becomes 85. The existing flat-shift curve
(lifting the highest raw score to 100), the clamp into [0, 100], and the
empty-input behavior must all be unchanged.
