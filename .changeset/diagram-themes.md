---
'draftably': minor
---

Diagrams have themes. A `theme` line picks Graphite (the default), Fieldnotes, Signal, Mulberry or
Midnight and can override padding, corner radius, title and annotation fonts, and the canvas, text
and connection colors. Colors come in families with numeric shades from 50 to 950 (`color=blue
shade=800`); `theme-color` lines adjust built-in shades or define new families such as `brand`.
Titles wrap with bundled font metrics, so the viewer, `inspect` and both SVG exports agree, and
exported SVG files embed the fonts they use. Explicit `size` lines are now kept exactly; a title
that no longer fits is reported instead of growing the node. `teal` and `orange` are now their own
colors rather than aliases of `mint` and `amber`.
