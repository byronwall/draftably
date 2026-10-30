---
'draftably': minor
---

New `note "…"` statement: a sentence on the diagram that never moves the layout. Without `near=` it sits in the frame under the subtitle; `note "…" near=id side=below|above|left|right` places it beside an object in free space after layout. Notes wrap at 280px (`width=` changes that) and draw in the viewer, `inspect --svg` and exports. `check` warns `note-overlap` when an anchored note has no clear spot.
