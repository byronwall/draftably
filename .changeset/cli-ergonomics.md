---
'draftably': minor
---

`check` takes several files or a folder, prints each line with its file, and exits 1 if any file fails (before, it checked only the first file). Every command prints its own help with `--help` instead of running (`open --help` no longer starts a server), and `--version` prints the version. `check --quiet` leaves out info notes. `inspect --png` and `compare --png` print the image size, and `--max-width <px>` caps the image width.
