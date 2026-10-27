---
'draftably': minor
---

`vary` prints a line per variant to stderr as it finishes and takes `--budget 60s` to stop trying new variants and rank the ones found. On a `lanes` root, `--grid` and `--try engine=…` now try engines (the lanes stay as `v0`) instead of refusing. `vary --help` prints help instead of reading `--help` as a file.
