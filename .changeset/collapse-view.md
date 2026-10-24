---
'draftably': patch
---

A collapsed container keeps its title where the open frame had it, with the shape count under the title. In a diagram file, collapsing or expanding is a view change: it no longer runs as an unsaved edit (and no longer shows "That change is not saved to diagram files"), draws at once with quick routes and swaps in full routes from the worker. The frame grows or shrinks over 200ms and revealed shapes fade in, unless the system asks for reduced motion.
