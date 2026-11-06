---
'@draftably/runtime': minor
'@draftably/react': minor
'@draftably/solid': minor
'@draftably/vue': minor
'@draftably/svelte': minor
---

The viewer's item outline is now visually hidden by default. Screen readers keep it, and it appears over the bottom of the drawing while it holds keyboard focus. Set `outline: 'visible'` in `mountViewer`, `outline="visible"` on `<draft-diagram>`, or the `outline` prop on `DraftDiagram` to keep it on screen.
