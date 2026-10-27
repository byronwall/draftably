---
'draftably': minor
---

Add `draftably set <file> <id> key=value…` (change a declaration: `label=` or any attribute, `key=` removes it), `rm <file> <id>…` (remove nodes, groups or edges with their edges, refinements and state mentions; a group's members move to its container) and `mv <file> <old> <new>` (rename an id everywhere). Each rewrites the file through the formatter and runs `check`.
