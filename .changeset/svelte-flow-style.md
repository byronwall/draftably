---
'@draftably/runtime': patch
'draftably': patch
'@draftably/react': patch
---

`layout({ svelteFlow })` keeps each node's CSS `style` string and takes Svelte Flow's own `Node` and `Edge` types. Before, it spread a style string into an object, and Svelte Flow lost the node's style. The `@draftably/react` README now links to the drop-in layout guide.
