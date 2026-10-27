---
'draftably': patch
---

Routing is about twice as fast with identical results (a 28-shape diagram drops from 9.1 s to 3.8 s in `inspect`), which speeds up `check`, `inspect`, `vary` and the viewer's first draw. While dragging in the viewer, quick routes reuse each line's sides from the previous frame instead of searching every line again.
