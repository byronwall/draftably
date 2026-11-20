---
'draftably': patch
'@draftably/editor': patch
---

Copy image in the editor puts only a PNG on the clipboard. Pasting gives the rendered diagram and never SVG markup as text. Copy SVG markup still copies the markup.
