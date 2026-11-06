---
'draftably': patch
---

SVG exports name the drawing for screen readers: the root `<svg>` has `id="draft-svg"`, `role="img"` and `aria-labelledby` pointing at its title. Layout and embedded source are unchanged.
