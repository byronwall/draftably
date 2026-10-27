---
'draftably': minor
---

`draftably open` reuses a viewer that already serves the folder: it prints that viewer's URL and exits instead of starting a second one. `open --status` lists running viewers (URL, folder, version, pid), and `open --replace` stops a viewer, for example one left from an older version, and starts this one. Viewers register in `~/.draftably/viewers`.
