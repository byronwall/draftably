---
'draftably': minor
---

`check` reports drawing conflicts as warnings: a line through a box or a group title, overlapping boxes, a label on a box or another label, and a box outside its group. Each warning names the refinement line that caused it and a fix. `check --hints` shows how far each refinement moved its target, and `inspect --json` adds the unrefined `raw` position of every moved node.
