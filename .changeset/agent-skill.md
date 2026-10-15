---
'draftably': minor
---

Add an agent skill for writing `.draft` diagrams. `draftably skill install` copies it into
`./.claude/skills/draftably` (`--global` for `~/.claude/skills`, `--dir` for another skills folder,
`--force` to replace a copy), and `draftably skill print` prints it. The repository's `skills/`
folder also lets `npx skills add byronwall/draftably` install it.
