---
title: 'Host contract — review of the Callsheet PRs and plan'
slug: 'host-contract'
phase: plan
status: proposed
last_updated: '2026-11-10'
---

# One host contract for every framework

This plan sets the design goal in [ARCHITECTURE.md](../../ARCHITECTURE.md#design-goal-one-host-contract-thin-framework-bindings).
It starts from five PRs by joshuafcole for Callsheet, a Solid app that embeds Draftably:
byronwall/draftably#498, #499, #500, #501 and #502.

## The common problem

Callsheet asks for three things:

1. **Steer the camera** and hear when it moves (#500).
2. **Draw its own node bodies**, such as a status line or a progress bar (#501).
3. **Draw diagrams in its own tree**, with the compiler's geometry and text measurement (#502).

Each PR solves its need for the Solid editor only. None of them works for a React, Vue, Svelte or
plain-DOM host, and none works in the read-only viewer. The root cause is that Draftably has no
framework-neutral host contract. Today:

| Fact                                                                                                                                       | Effect                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@draftably/editor` bundles its own Solid (`scripts/build-editor.ts`).                                                                     | A Solid `Component` that a host passes in (#501's `Body`) runs on the editor's Solid, not the host's. Context, owners and cleanup do not connect.                       |
| The viewer camera is `{ centerX, centerY, zoom }`; the editor camera is `{ x, y, k }`.                                                     | #500 adds a second public camera shape. A host that uses both needs two code paths.                                                                                     |
| The viewer has `fit()`, `focusItem()` and a `camera` event on its handle. #500 puts `fitTo` and `reveal` on `editor.session`.              | Host calls reach into the session store, which is an internal Solid object.                                                                                             |
| The viewer draws with the string renderer (`runtime/svg-renderer.ts`); the editor draws with Solid scene components (`components/scene/`). | Host content added to one renderer is missing from the other. #502's black edge wedges come from this: the scene depended on `canvas.css`, the string renderer did not. |
| `renderSvg` returns markup and an item list, but no geometry.                                                                              | A host that needs node boxes or edge paths must import compiler internals (#502).                                                                                       |

## Decision

Four approaches were scored on framework reach, framework lines per capability, render parity,
runtime isolation, internals made public and Callsheet's needs.

| Approach                                      | Reach | Lines per framework | Render parity | Host runtime | Internals public | Callsheet |
| --------------------------------------------- | ----: | ------------------: | ------------: | -----------: | ---------------: | --------: |
| A. Merge the PRs as written                   |     2 |                   2 |             4 |            3 |                2 |         9 |
| B. Repeat A for every framework               |     9 |                   0 |             2 |            7 |                1 |         9 |
| C. Neutral contract; wrappers map it          |     9 |                   8 |             7 |            9 |                8 |         7 |
| D. C first, a Solid extra only on proven need |     9 |                   8 |             7 |            9 |                7 |         8 |

**Choice: D.** Runtime isolation and lines per framework decide it. Because the editor bundles Solid,
a Solid-typed extension point is wrong even for a Solid host. B is not possible without a second
scene renderer for React and Vue.

## The contract

### Handles

`ViewerHandle` and `MountedEditor` get the same members:

| Member                                  | Effect                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getCamera()`, `setCamera(camera)`      | `Camera` is `{ centerX, centerY, zoom }`, the viewer's shape. It does not depend on the canvas size, so a saved view survives a resize. The editor converts at its edge. |
| `fit(ids?, options?)`                   | Frame the whole drawing, or only `ids`. Replaces #500's `fitTo`.                                                                                                         |
| `reveal(id, options?)`                  | Bring one item into view with the least move (#500's logic).                                                                                                             |
| `onCamera` option, `draft-camera` event | `{ camera, reason }`, with one reason union: `'user' \| 'api' \| 'fit' \| 'resize'`.                                                                                     |
| `geometry()`                            | JSON: `bounds`, item boxes by ID, edge paths and label boxes.                                                                                                            |

The methods live on the handle, not on `session`. The session stays internal.

### Node slots

```ts
nodeBody: {
  draws(id: string): boolean;
  mount(el: HTMLElement, props: { id; width; height; selected }): {
    update(props): void;
    destroy(): void;
  };
}
```

Draftably creates a `foreignObject` the size of the node with `pointer-events: none`, then calls
`mount`. A plain-DOM host uses this directly. This is the shape #501 asks about in its open
question. Both renderers implement the slot: the Solid scene in the editor and the string renderer
in the viewer. The CLI and exports draw the title, as #501 already does.

Each framework package turns a component into `mount`, in about 15 lines:

| Framework | Adapter                                                                   |
| --------- | ------------------------------------------------------------------------- |
| React     | `createPortal` per slot from state, so the body keeps the host's context. |
| Solid     | A signal of slots and `<Portal mount={el}>`, on the host's own Solid.     |
| Vue       | A ref of slots and `<Teleport :to="el">`.                                 |
| Svelte    | `mount(Component, { target: el, props })` and `unmount`.                  |

### Layout input

`size id height=auto min-height=N` from #501 stays the only way a host changes geometry. Layout
never measures a slot.

### Runtime additions

- `renderSvg` adds `geometry` to its result, the same JSON as `geometry()`.
- `@draftably/runtime` exports the compiler's text measurement (`measureText`, `wrapLines`), so a
  host can size a slot body to match.

## What to do with each PR

| PR                          | Verdict                             | Reason                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #498 canvas click activates | Merge as written.                   | A neutral fix in the editor.                                                                                                                                                                                                                                                                                            |
| #499 memoize `viewerFrame`  | Merge as written.                   | Internal. `createScene` runs inside the session's `createRoot`, so the memo has an owner.                                                                                                                                                                                                                               |
| #500 editor camera API      | Keep the logic; change the surface. | Move the methods to the `MountedEditor` handle, use the viewer's camera shape and reason union, and rename `fitTo` to `fit(ids)`. Then add `fit(ids)` and `reveal` to the viewer.                                                                                                                                       |
| #501 node content           | Split.                              | Merge `min-height` alone; it is neutral and already updates the skill. Rebuild `nodeContent` as the `mount` slot above, in the editor and the viewer.                                                                                                                                                                   |
| #502 Solid host entry       | Do not merge as written.            | Split out the scene fixes (`fill="none"`, text anchors, `LinkMark` without `state/`) as one PR; they help every renderer. Replace the entry with `geometry` and text measurement in the runtime. It pins `dsl/`, `model/`, `engines/` and `components/scene/` to a public Solid package, and React and Vue get nothing. |

## Open questions for Callsheet

1. What does a Solid scene in your own tree give you that the viewer with slots, `geometry()` and
   `draft-camera` does not? Reactivity per node, your own event handlers on shapes, or no second
   Solid in the bundle? The answer decides whether the Solid exception in approach D is needed.
2. Do your node bodies need your app's context (store, router)? If yes, the wrappers use portals,
   as in the table above, not a separate root per slot.

## Order of work

1. Merge #498, #499 and `min-height`. Land the scene fixes from #502.
2. Align the camera contract on both handles (#500 reworked).
3. Add `geometry` to `renderSvg` and the handles.
4. Add node slots to the editor and the viewer, then the four wrapper adapters. Prove each wrapper
   with `scripts/prove-frameworks.ts`.
5. Ask the questions above before any framework-native entry.
