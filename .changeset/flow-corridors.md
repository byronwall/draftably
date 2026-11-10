---
'draftably': minor
'@draftably/runtime': minor
'@draftably/editor': minor
---

A large `flow` (40 or more forward lines) now lays out and routes like a layered layout: each line that skips ranks gets its own corridor between the boxes of the ranks it passes, and every forward line follows a planned route, out of the bottom (or right) of its source and along its own track in each gap. `layout()` on a new 100-node graph with 127 lines takes about 20 ms instead of 280 ms, with fewer crossings and bends, and full routing of the same graph about 0.1 s instead of 2.6 s. A flow whose ranks cross more than twice per line keeps the router's searched routes, which cross less there. Smaller diagrams draw as before.
