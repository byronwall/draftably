---
'draftably': minor
---

Add `draftably vary`. It tries layout and routing variants that suit the diagram's shape, measures each one (crossings, bends, size, warnings, movement) and ranks them against the file as it is. It writes a contact sheet, one PNG per variant and `variants.json`. `--apply <id>` (or `--apply best`) writes the chosen variant's lines into the file and checks it.
