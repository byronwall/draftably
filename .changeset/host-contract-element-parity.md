---
'@draftably/runtime': minor
'@draftably/editor': minor
'@draftably/react': minor
'@draftably/solid': minor
'@draftably/vue': minor
'@draftably/svelte': minor
---

The elements are the host contract. `<draft-diagram>` and `<draft-editor>` mount once, in a microtask after they connect, and take every mount option through `options`. A new options object with the same values does nothing; callbacks, `label`, `outline`, `toolbar` and render settings apply live, and only `execution`, `render.fonts` or `storageKey` mount anew. Both dispatch every event as a bubbling `draft-<name>` event that survives a re-mount, reflect `status="loading | ready | error"`, and warn once when a second copy of the runtime loads. `@draftably/runtime/host` exports `HOST_EVENTS`, and the event types are in `HTMLElementEventMap`. Every framework package builds its event props from `HOST_EVENTS`, takes `options` on the editor, re-exports `renderSvg`, and gives the element (Svelte adds `bind:element`).

The editor works inside a shadow root: it finds its own root instead of the page. A press on the page outside every editor, or removing an editor, stops it taking shortcuts.
