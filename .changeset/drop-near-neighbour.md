---
'draftably': patch
---

A node dropped in the viewer keeps the place it was dropped. It is saved `near` a neighbour it lines up with, and a node under another in a layout that reads down is saved below it, not beside the node across the gap. When that `near` would draw it somewhere else, the drop saves a `stay` at the exact point instead, and the saved message offers "Keep exact position".
