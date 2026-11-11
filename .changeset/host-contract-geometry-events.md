---
'@draftably/runtime': minor
'@draftably/editor': minor
---

Hosts can read where things are drawn and hear more of what the user does. `geometry()` on the viewer and the editor returns every node, group and edge in world units, in the graph API's shapes, one object per revision (`null` for compare and states drawings); `renderSvg` returns the same `geometry` in its `viewBox` units, and the `render` event carries it. Both handles have `ready`. A right-click reports `contextmenu` with the item (cancelable on the element, to replace the browser's menu). The editor adds `select(ids)`, `selection()` and a `select` event with reason `user` or `api`. Listeners hear a commit before `update` resolves.
