---
'@draftably/runtime': minor
'@draftably/editor': minor
---

The viewer and the editor share one camera. Both handles have `getCamera`, `setCamera`, `fit(ids?, options?)` and `reveal(id, options?)`, with the camera `{ centerX, centerY, zoom }`, one zoom range (0.02–8), and one set of reasons. `fit` and `reveal` return `moved`, `unchanged`, `missing` or `pending`; a call before the view has a size runs once it has one. `padding`, `minZoom` and `maxZoom` shape them. The `camera` event comes at most once per animation frame, also during a drag, and `<draft-editor>` now dispatches `draft-camera`. Every editor camera write, including pinch and drag-zoom, goes through one path, so each is reported and saved.

Breaking:

| Change                           | Before                                 | After                                 |
| -------------------------------- | -------------------------------------- | ------------------------------------- |
| `MountedEditor.session`          | the internal store                     | removed; use the handle's methods     |
| Editor zoom range                | 0.08–4                                 | 0.02–8                                |
| Camera event reason              | `'user' \| 'resize' \| 'fit' \| 'api'` | adds `'restore'`                      |
| Viewer camera event during a pan | once, on pointer-up                    | at most once per frame                |
| `viewer.fit()`                   | returns nothing; 92 % of the view      | returns a `MoveResult`; 32 px padding |
