---
'draftably': patch
---

Engine layouts no longer depend on how objects are named: where the connections leave a choice, file order decides, so renaming an id no longer moves it (or the groups around it). A scope's `order` line now overrides file order under engines too; before, `order` did nothing under `engine=layered`.
