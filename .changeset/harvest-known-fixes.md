---
'draftably': patch
'@draftably/editor': patch
'@draftably/runtime': patch
---

The Editor draws a mind map's branches and an org chart's reporting lines as the saved file draws them after a rename, reverse, delete or quick extend. It refuses to delete a line that stands in for a table row's `->` line, and says to remove the `->` from the table's body. Timeline links on the chart now carry their edge's `data-id` in the export and the Editor, so a host can find them.
