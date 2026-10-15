---
'draftably': patch
---

`draftably open` now uses the first free port from 5180 instead of failing or sharing a port with
another `localhost` server. An explicit `--port` that is already in use, on IPv4 or IPv6, is an
error, and `--port 0` picks any free port. The `Viewer:` line always shows the actual URL.
