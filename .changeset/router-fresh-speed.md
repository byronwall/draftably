---
'draftably': patch
'@draftably/runtime': patch
'@draftably/editor': patch
---

The router draws the same lines faster. It tries candidate paths best first, builds a side's detours only when they can still win, and stops scoring a path once it has lost. `layout()` on a new 100-node graph with 127 lines takes about 40% less time.
