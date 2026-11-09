---
'draftably': patch
'@draftably/runtime': patch
---

`flow` orders the objects in each rank so fewer lines cross. It sweeps down and up the ranks and swaps neighbours while a swap removes crossings, as layered layouts do. A 100-node graph with 127 lines now draws 77 crossings instead of 113.
