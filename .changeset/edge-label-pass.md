---
'draftably': patch
---

Edge labels are placed together once every route exists, instead of one by one as routes are
drawn. A label keeps clear of lines drawn after it, of other edges within 8px, and of other labels
within its own height; labels that have a clean spot are placed first, then one repair sweep
moves each to its best spot given the rest. On an upright segment a label can shift off-centre
to clear a parallel line while its own line still crosses it.
