---
'draftably': minor
'@draftably/runtime': minor
'@draftably/editor': minor
---

`size id width= height=auto min-height=N` puts a floor under a node's auto height, for a host that puts more than the title in a node. It works for boxes, diamonds and `cells` members, and an editor resize that changes only the width keeps `height=auto` and the floor. The editor's scene draws its lines unfilled and its labels centred without the editor's stylesheet, and its link marks no longer load the editor's state.
