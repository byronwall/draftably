---
'draftably': patch
---

A packed drawing (`compound-flow` or `layered` with groups) no longer flattens into a strip. When it is wider than the canvas and more than five times longer than it is deep, its longest group folds into rows, one group at a time, so the groups keep their order; only when no group can fold do the groups wrap into rows like text. A group that only receives lines, such as an upstream API, now sits beside the group that calls it instead of in a rank of its own past it. `fold=never` on the root engine keeps one line.
