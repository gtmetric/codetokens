Currently a word longer than `width` is left on its own line and overflows past
`width`. Change this so that any single word strictly longer than `width` is
hard-split across consecutive lines: each full piece holds exactly `width - 1`
content characters followed by a trailing `-` (making the piece exactly `width`
characters long), and the final remainder piece (which is at most `width`
characters) has NO trailing dash. Each split piece occupies its own line, and the
split begins on a fresh line (flush any partially-filled line first).

For example with width 5, the word `"elephant"` becomes `["elep-", "hant"]`.

All other behavior — splitting on single spaces, greedily packing words whose
joined length (single-space separated) is at most `width`, and yielding an empty
list for empty input — must be unchanged. Do not rename the export.
