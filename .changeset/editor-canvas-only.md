---
'@draftably/editor': patch
'draftably': patch
---

`@draftably/editor` now holds only the editable canvas. It no longer bundles the Mermaid and D2 importers, the import dialogs or the app's panel state, so the package drops from about 20 MB to 1.7 MB unpacked. Importing it no longer reads the window size or writes to localStorage. A mounted editor keeps its canvas shortcuts; app-only shortcuts, such as the command palette, stay in the app.
