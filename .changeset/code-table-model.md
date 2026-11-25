---
'draftably': patch
'@draftably/runtime': patch
'@draftably/editor': patch
---

Code tables are read once into a table model that the drawing and the Editor share. An alignment you choose in the Editor now stays when the column's values change, and a saved table always reads back to the same cells.
