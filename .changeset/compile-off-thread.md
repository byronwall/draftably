---
'draftably': patch
---

After an edit in a diagram file, the viewer compiles and routes the new version in a long-lived engine worker instead of on the page, and keeps quick routes on screen until it arrives. A drag no longer freezes the page for the layout and routing of the whole file.
