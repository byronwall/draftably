---
'draftably': minor
'@draftably/runtime': minor
'@draftably/editor': minor
---

Draw org charts: `layout root orgchart root=<id>` places people top down, with one bus line per manager and no arrowheads. Rows of leaf reports stack into columns while the chart is wider than `fit=` asks (`leaves=auto|stack|split|row`). `role=assistant` hangs a report beside its manager's stem, and `role=vacant` draws an open role with a dashed outline.
