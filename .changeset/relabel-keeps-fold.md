---
'draftably': patch
---

Labelling or relabelling an edge no longer refolds a long flow. The fold's rows and cuts are planned without edge labels, so every object keeps its row; labels only widen the gaps they need, and a row is added only when the labelled rows run more than a quarter past the canvas.
