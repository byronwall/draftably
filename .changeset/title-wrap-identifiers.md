---
'draftably': patch
---

Node titles no longer break in the middle of a word. A long identifier breaks where its parts meet (`annotation` / `Commands`, `src/` / `viz/`, `code-` / `annotations.md`), and a node without a `size` grows wider, up to twice its default width, so a word with no such break (`installed?` in a diamond) stays whole.
