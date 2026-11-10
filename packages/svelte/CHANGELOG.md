# @draftably/svelte

## 0.2.1

### Patch Changes

- Updated dependencies [544be76]
- Updated dependencies [2f625b2]
- Updated dependencies [da6799e]
- Updated dependencies [dbf251a]
- Updated dependencies [f170a08]
- Updated dependencies [9260ac2]
- Updated dependencies [7259d8c]
- Updated dependencies [1ff30f9]
- Updated dependencies [e8754d1]
- Updated dependencies [3eba208]
- Updated dependencies [b4a84ab]
  - @draftably/runtime@0.3.0
  - @draftably/editor@0.3.0

## 0.2.0

### Minor Changes

- 13e3bd5: Add `@draftably/editor`: the diagram editor as `mountEditor()` and a `<draft-editor>` element. Drag boxes and lines, and get the `.draft` source back on every edit. Any number of editors can share a page. Each framework package adds `DraftEditor` under its `/editor` subpath.
- 16c24d2: Add `DraftDiagram` for Svelte: the `<draft-diagram>` element with Svelte props, an update callback, and an `svg` prop for server rendering.
- fdb759b: The viewer's item outline is now visually hidden by default. Screen readers keep it, and it appears over the bottom of the drawing while it holds keyboard focus. Set `outline: 'visible'` in `mountViewer`, `outline="visible"` on `<draft-diagram>`, or the `outline` prop on `DraftDiagram` to keep it on screen.

### Patch Changes

- fe01bb5: The guides for every package moved to draftably.dev/docs, and each package README now links there. The Emphasis states page draws each state live.
- Updated dependencies [3b77f78]
- Updated dependencies [fe01bb5]
- Updated dependencies [ba5f518]
- Updated dependencies [81e76a8]
- Updated dependencies [13e3bd5]
- Updated dependencies [b05bb95]
- Updated dependencies [a0786b0]
- Updated dependencies [fdb759b]
  - @draftably/runtime@0.2.0
  - @draftably/editor@0.2.0
