---
'draftably': minor
---

The legend can now explain line styles with `legend line dashed "meaning"` and `legend line solid "meaning"`. The key runs left to right under the drawing and wraps only when it passes the drawing's width. `check` warns `legend-missing` when a legend leaves an accent color without a row, and notes `legend-lines` when dashed and solid lines appear with no line row. A diff legend counts shapes and lines apart: `5 added · 5 lines`, not `10 added`.
