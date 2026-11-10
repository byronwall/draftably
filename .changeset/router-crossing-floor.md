---
'draftably': patch
'@draftably/runtime': patch
---

The router skips detours that must cross other lines sooner. It counts the crossings a detour cannot avoid before it scores the detour, so `layout()` on a new 100-node graph with 127 lines takes about 30% less time again, with the same lines.
