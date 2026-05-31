Make two changes to `parseDuration`, leaving the export name and all other
behavior intact:

1. Support a single leading `-` on the input meaning a negative total. For
   example `"-5m"` must parse to `-300` (the `-` applies to the whole result,
   not just the first component).

2. Instead of silently ignoring components whose unit letter is not one of the
   supported letters (`d`=86400s, `h`=3600s, `m`=60s, `s`=1s), THROW an `Error`
   when any such unknown unit letter is encountered. For example `"5m3x"` must
   throw because `x` is not a recognized unit.

The empty string must still parse to `0`, supported units may still appear in
any order, and a component is still a run of digits immediately followed by a
unit letter.
