---
'draftably': patch
---

`vary --try direction` works on a file with no `layout` line. `check` no longer warns about a cell
marker, and `check --metrics` counts every warning that it prints. The parser now refuses
attributes that had no effect: `kind`, `detail` and `priority` on nodes and groups, `importance` on
edges, and `kind=data`. The hosted Editor no longer offers Export PDF.
