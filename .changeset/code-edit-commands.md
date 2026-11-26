---
'draftably': patch
'@draftably/editor': patch
---

A Code editor save made while the file is still redrawing now waits for the new version and applies to it, so it no longer writes over a change the file made meanwhile. A pasted table keeps its editor draft when it gets its name from the file, and a save goes to the file the edit was made in while another file opens.
