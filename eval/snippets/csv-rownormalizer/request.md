Cells may be wrapped in matching double-quotes. When a cell is wrapped this way,
remove the surrounding double-quotes (unquote it) before the existing trimming and
space-collapsing rules are applied. A comma that appears inside such a quoted cell
must NOT split the row — it stays as a literal character inside that cell. Every
existing rule (trimming, collapsing internal space runs, dropping trailing empty
cells) must be unchanged otherwise.
