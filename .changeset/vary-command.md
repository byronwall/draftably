---
'draftably': minor
---

Add `draftably vary`. It tries layout and routing variants that suit the diagram's shape, measures each one (crossings, bends, size, warnings, movement) and ranks them against the file as it is. It writes a contact sheet, one PNG per variant and `variants.json`. `--apply <id>` (or `--apply best`) writes the chosen variant's lines into the file and checks it.

`vary --try key=a,b` sweeps exact settings (two `--try` make a grid; `--try key` alone uses the viewer Compare's steps), `--grid` sweeps the main engines in both directions, and `--scope <group>` varies one group's layout line.

`vary --fit wide|slide|square|page|tall` aims for an image shape, `--prefer compact|stable` changes what ranks first, and `--from <id>` searches around a variant from the last run.
