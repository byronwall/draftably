---
'draftably': minor
'@draftably/runtime': minor
'@draftably/editor': minor
---

Code range labels now sit outside the box's right edge, just above a leader from a dot inside the edge, all at the same x. The labels count as part of the node, so layouts, lines and bounds keep clear of them. A line that leaves a labeled range on the right leaves along its leader, and no line crosses a label or a leader. `labels=inside` on the code node keeps the labels in the column inside the box.
