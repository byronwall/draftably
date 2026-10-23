---
'draftably': minor
---

`flow` keeps a loop along its direction: only the edge that closes the loop runs backwards,
instead of the whole loop collapsing into one column or row. A long run of ranks in `flow` or
`engine=layered` now folds into rows (or columns) that each read from the start once it is wider
than the canvas and more than three times longer than it is deep. `fold=never` keeps one line.
