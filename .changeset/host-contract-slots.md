---
'@draftably/runtime': minor
'@draftably/editor': minor
'@draftably/react': minor
'@draftably/solid': minor
'@draftably/vue': minor
'@draftably/svelte': minor
---

Hosts can put their own content on a node. A child of `<draft-diagram>` or `<draft-editor>` marked `data-draft-slot="body:<id>"` fills that node and scales with the drawing; `overlay:<id>` covers a node, group or edge at screen size. Both elements assign marked children to stable targets in their shadow roots and never change the host's DOM, so a framework keeps rendering them, page CSS styles them, and focus and a caret survive a source update. Slot content takes no pointer input unless marked `data-draft-input`; there it takes its own pointer and keys, and no editor shortcut fires. Below a zoom of 0.4 bodies give way to titles (`detail: 'full'` keeps them). An unknown slot adds `DRAFT_SLOT_UNKNOWN` to `diagnostics`, and content larger than its node adds `DRAFT_SLOT_OVERFLOW`. A new `anchors` event lists the targets; `viewer.anchor(slots)` and `editor.anchor(slots)` give the same layer without the element. The four wrappers pass slot content through as `children` or the default slot.

`@draftably/runtime/host.css` holds the rules that must work before the elements load: their heights, hidden slot content, and `pointer-events` for marked content. Import it once per page.

The editor now renders in a shadow root, with its styles adopted there instead of on the page. Its color properties sit on `:host`, so a page value on `draft-editor` wins, and `data-theme="dark"` on the element selects the dark set. A node with a body keeps its ports and resize handles above the body.

Breaking:

| Change                    | Before                                     | After                                         |
| ------------------------- | ------------------------------------------ | --------------------------------------------- |
| `<draft-editor>` DOM      | the editor's DOM in the element's children | in its shadow root; children are slot content |
| Editor styles             | one sheet adopted by the page              | adopted in the element's shadow root          |
| Editor color tokens       | on `.draft-editor`                         | on `:host`; set them on `draft-editor`        |
| Viewer viewport and frame | `overflow: hidden`                         | `overflow: clip`                              |
