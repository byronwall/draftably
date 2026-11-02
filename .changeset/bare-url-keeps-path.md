---
'draftably': patch
---

An unquoted URL such as `href=https://example.com/path` now keeps its path. Before, the `//` started a comment and `check` reported nothing.
