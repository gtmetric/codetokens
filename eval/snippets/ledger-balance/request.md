Add an interest bonus to `runningBalance`, keeping every existing rule (start at
0, credits add, debits subtract, a flat 25 overdraft fee subtracted from any
entry that leaves the balance strictly below 0) and the export name unchanged.

New rule: whenever a `credit` entry moves the running balance from strictly below
1000 up to 1000 or more (i.e. the balance immediately before this entry was < 1000
and the balance immediately after this entry, including any overdraft fee, is
>= 1000), add a 1% interest bonus computed on the new (post-credit) balance and
rounded to the nearest integer. This bonus is reflected in the balance reported
for that same entry. The bonus is only applied on the crossing entry — once the
balance is already >= 1000, subsequent credits do not earn it again. Debits never
trigger the bonus.

For example a single `credit` of 1200 from a starting balance of 0 reports 1212
(1200 + round(1200 * 0.01)).
