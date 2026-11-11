---
title: 'Host contract — one contract for every framework'
slug: 'host-contract'
phase: plan
status: proposed
last_updated: '2026-11-10'
---

# One host contract for every framework

This plan sets the design goal in
[ARCHITECTURE.md](../../ARCHITECTURE.md#design-goal-one-host-contract-thin-framework-bindings).
It starts from five PRs by joshuafcole for Callsheet, a Solid app that embeds Draftably:
byronwall/draftably#498, #499, #500, #501 and #502.

**Sources.** A first plan, then two independent architecture reviews (a clean Opus agent and a
GPT 6.1 Sol thread, each designing blind before reading the plan), and an audit of the four
framework packages. Every fact below was checked against `main` at `a8f6247b`.

## Facts

| Fact                                                                                                                                                                                                                                     | Evidence                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@draftably/editor` bundles its own Solid. Its published entry is `mount.tsx`.                                                                                                                                                           | `scripts/build-editor.ts:87-111` has no `external`.                                            |
| `@draftably/runtime` has no Solid. The viewer renders in a worker by default.                                                                                                                                                            | `scripts/build-runtime.ts:18-22`, `src/runtime/viewer.ts:437`                                  |
| There are two renderers. The string renderer (`runtime/svg-renderer.ts`) serves `renderSvg`, the viewer, Markdown, the CLI and exports. The Solid scene (`components/scene/`) serves the editor and Compare.                             | `src/runtime/render.ts:1`, `src/components/canvas/Canvas.tsx:5-8`                              |
| The viewer copies the SVG through a tag allowlist without `foreignObject`, and replaces the whole SVG on every update.                                                                                                                   | `viewer.ts:93-97`, `viewer.ts:652`                                                             |
| The viewer camera is `{ centerX, centerY, zoom }` in world units, zoom 0.02–8. The editor camera is `{ x, y, k }` (screen offset of the world origin), zoom 0.08–4, saved in the document.                                               | `viewer.ts:15`, `viewer.ts:318`, `src/model/types.ts:246`, `src/state/session/editor.ts:39-40` |
| The viewer emits `camera` only on pointer-up during a pan. The editor emits nothing; pinch and drag write `doc.camera` directly.                                                                                                         | `viewer.ts:505`, `src/state/session/pointer.ts:189,469,477`                                    |
| The editor already has `fitView`, `fitRects`, `revealObject` and `centerSelection`, with a 42 px pad. #500 adds a second camera module with a 40 px pad.                                                                                 | `editor.ts:159-224`                                                                            |
| `MountedEditor.session` already makes the whole internal store a public type.                                                                                                                                                            | `src/editor/mount.tsx:38`                                                                      |
| `<draft-editor>` passes only `source` and `onChange` to `mountEditor`. No wrapper can set `storageKey`, `openLink`, `confirm`, `onInteract` or a style nonce.                                                                            | `src/editor/element.ts:47-55`                                                                  |
| `<draft-diagram>` dispatches only `draft-update`. Its `camera`, `itemactivate`, `link`, `diagnostics` and `render` events are reachable only through `el.viewer.on`, and those listeners are lost when the element re-mounts its viewer. | `src/runtime/element.ts:203,231,128-152`                                                       |
| `<draft-diagram>` re-mounts its viewer, and loses the camera, on every `options` set and on every `label` or `outline` change. A React parent that passes `options={{ … }}` re-mounts it on every render.                                | `element.ts:102-105,150-152`                                                                   |
| `<draft-diagram>` uses shadow DOM; `<draft-editor>` does not. Host CSS does not reach into the viewer.                                                                                                                                   | `element.ts:59-71`, `editor/element.ts:47`                                                     |
| The canvas supports a context menu, but `mountEditor` does not pass it on.                                                                                                                                                               | `Canvas.tsx:27`, `mount.tsx:68`                                                                |
| Geometry is published in one shape today: the graph API's `LayoutResult` (`Box`, `PlacedBox`, `EdgeOut`). `renderSvg` returns items without boxes.                                                                                       | `src/graph-api/core.ts:77-117`, `src/runtime/types.ts:65-93`                                   |
| With `compare` or `states`, one ID is drawn in more than one panel.                                                                                                                                                                      | `svg-renderer.ts:585-592`                                                                      |
| Item IDs match `[A-Za-z_][A-Za-z0-9_.-]*`, so they never contain `:`.                                                                                                                                                                    | `src/dsl/syntax.ts:477`                                                                        |
| An editor resize replaces the whole `size` line with an exact width and height.                                                                                                                                                          | `src/dsl/translate.ts:758-770`                                                                 |
| A host source update ends local undo: undo cannot step past it.                                                                                                                                                                          | `src/state/session/file-session.ts:840-843`                                                    |

## The common problem

There is no neutral way for a host to **address an item**: to find where it is, frame it, put
content on it, or hear what the user did to it. Each Callsheet PR cuts its own hole through the
editor's Solid internals: camera methods on `session` (#500), a Solid `Component` prop (#501), and
the Solid scene with the internal `Diagram` (#502). The published packages cannot carry these holes:
the editor bundles a second Solid, and the viewer has no Solid at all.

The same gap shows up in every framework package, because they all wrap the custom elements, and
the elements expose less than the handles behind them.

| Capability                        | React                     | Solid              | Vue                   | Svelte             | Root cause                                  |
| --------------------------------- | ------------------------- | ------------------ | --------------------- | ------------------ | ------------------------------------------- |
| Element and handle                | `ref`                     | `ref`              | `expose`              | **none**           | Svelte wrapper has no bind or ref.          |
| Viewer events other than `update` | via ref                   | via ref            | via ref               | **none**           | The element dispatches only `draft-update`. |
| Editor options                    | **none**                  | **none**           | **none**              | **none**           | The element passes only `source`.           |
| New `options` object              | **re-mount every render** | re-mount on change | re-mount on change    | re-mount on change | The setter always re-mounts.                |
| Flow edge component               | `DraftablyEdge`           | —                  | **none** for Vue Flow | write it yourself  | Only React got one.                         |
| Adding one event today            | edit                      | edit               | edit                  | edit               | Each wrapper lists events by hand.          |

#498 and #499 are plain fixes, not contract work.

## Options

Five approaches were scored. Dimensions come from the owner's goals (least code per framework,
parity, few future requests) and from the failure modes found in code.

| Dimension                                          | A. Merge PRs as written | B. Callbacks in the renderers (`mount(el)`, plan v1) |                                   C. Target registry + a portal helper per framework |      **D. Target registry + named slots on both elements** | E. Display list; each framework draws |
| -------------------------------------------------- | ----------------------: | ---------------------------------------------------: | -----------------------------------------------------------------------------------: | ---------------------------------------------------------: | ------------------------------------: |
| Lines per framework for host content               |                       2 |                                                    6 |                          6: a portal helper, about 15–40 lines; Svelte has no portal |                              **10**: children pass through |                    3: a renderer each |
| Host context, reactivity and CSS reach the content |                       3 |                                    3: separate roots | 5: context yes, but host CSS does not reach a portal inside the viewer's shadow root | **10**: content stays a light-DOM child of the host's tree |                                     9 |
| Content keeps its identity across `update(source)` |                       6 |                       2: the viewer replaces the SVG |                                                                                    9 |                                                      **9** |                                     7 |
| Works on the viewer's worker and sanitizer path    |                       1 |                       1: `foreignObject` is stripped |                                                                                    9 |                                                      **9** |                                     6 |
| New events or content kinds need no wrapper change |                       2 |                                                    5 |                                                                                    8 |                                                     **10** |                                     3 |
| Editor rework needed                               |                       9 |                                                    8 |                                                                                    8 |                 **4**: the editor moves into a shadow root |                                     1 |
| Internal types made public                         |                       1 |                                                    8 |                                                                                    9 |                                                      **9** |                                     4 |

**Choice: D.** The editor rework is a one-time cost. The other options cost code in every framework
package for every future capability. C was the choice of both reviews. It fails one fact they missed:
`<draft-diagram>` renders in shadow DOM, so host CSS (Tailwind classes, theme rules) does not style
content portalled into it. Named slots solve that, and need no portal at all.

**Gate: passed on 2026-11-10.** D needed three proofs before the slots step. Each ran with real
mouse and keyboard input in Chromium, Firefox and WebKit (Playwright 1.64).

1. **Slots in an anchor layer work in all three browsers.** A prototype element replaced its whole
   SVG on every update, as the viewer does, and kept one stable target per item. Each target held a
   named `<slot>`. `body:` content filled its box and scaled with the camera. `overlay:` content
   stayed in screen space and did not scale. Content moved with an update, and content for a removed
   item drew nothing. Host CSS styled the content. An input inside it took typing, and
   `composedPath()` showed the element its `data-draft-input` marker. `document.elementFromPoint`
   found the content, and empty space passed through to the SVG.
2. **All four frameworks pass `slot` through.** React 19.2, Solid 1.9, Vue 3.5 and Svelte 5.57 each
   rendered static `slot="overlay:a"` and dynamic ``slot={`body:${id}`}`` children in a keyed list.
   They kept them correct through a move, a relabel, an add and a remove. Every framework passed
   every check in every browser, with no compiler or console warnings. Svelte needed nothing
   special.
3. **The editor works in a shadow root after one small fix.** The built editor passed every check in
   light DOM: select, drag, Delete, undo, `N` with typing, inline edit, `C Enter Tab Enter`, and
   connect by dragging from a port. In a shadow root, three failed. An event from inside a shadow
   root reaches `document` with its target changed to the host, and `document` lookups cannot see
   inside. Six call sites read the page instead of the editor's own root. With them changed, every
   check passed in all three browsers, with the editor's CSS copied into the root:

   | Call site                                                                | Today                                          | Change                                       |
   | ------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------- |
   | `editor/mount.tsx:19`                                                    | `e.target`                                     | `e.composedPath()[0]`                        |
   | `state/canvas-keyboard.ts:66,243,251`                                    | `e.target`                                     | `e.composedPath()[0]`                        |
   | `state/canvas-keyboard.ts:111`                                           | `target === document.querySelector('.canvas')` | `target.matches('.canvas')`                  |
   | `state/canvas-keyboard.ts:170`                                           | `document.querySelector('[data-id=…]')`        | `target.closest('.canvas').querySelector(…)` |
   | `state/session/sculpt.ts:826`                                            | `e.target`                                     | `e.composedPath()[0]`                        |
   | `state/session/pointer.ts:689,738`, `components/canvas/StateBar.tsx:102` | `document.elementFromPoint`                    | `getRootNode().elementFromPoint`             |

   The handlers that Solid delegates already see the real target, so clicks and drags worked
   unchanged. Two of these lines also misbehave today with two editors on a page (from the code; not
   run): line 111 treats only the first editor's canvas as a canvas, and line 170 focuses the first
   shape with that ID on the page, which can be in the other editor.
   `pointer.ts:274` reads `document.activeElement` for the app's title field, which the embedded
   editor does not render.

The slots step also needs these, which the spike showed:

- The editor build injects its CSS into `document.head` (`scripts/build-editor.ts:49-54`). The element
  must put the same CSS into its shadow root instead.
- A guard keeps the fix: a test that fails on `document.elementFromPoint`, `document.activeElement`,
  `document.querySelector` or a bare `e.target` in a document-level listener under
  `src/components/canvas`, `src/components/scene`, `src/state` and `src/editor`.

## Two ways in: Draftably draws, or the host draws

The graph API (`@draftably/runtime/graph`, in runtime 0.3.0) already serves a host that draws
everything itself. `layout(graph)` takes nodes, groups and edges and returns each box, each routed
line as points and SVG path data, the side where each line ends, and each label's box. A node can
carry a size that the host measured. `route(graph)` routes lines between boxes the host placed. It
runs synchronously, so lines can follow a drag. The input and output are plain data, with no DOM
and no framework, so this path needs no framework code at all (`src/graph-api/core.ts:29-117,398,435`).

| A host that wants                                                 | Uses                     | Draftably draws | The host draws           |
| ----------------------------------------------------------------- | ------------------------ | --------------- | ------------------------ |
| Draftably's look, pan and zoom, editing, and content on items     | the elements, with slots | the diagram     | slot content             |
| Its own look and components, with Draftably's layout and routing  | `layout`, `route`        | nothing         | everything               |
| A flow library (React Flow, Svelte Flow, elkjs, dagre, Cytoscape) | the drop-ins             | nothing         | nodes; lines from `path` |

**What it settles for Callsheet.**

- **#502.** If Callsheet wants every shape in its own Solid tree, `layout` gives the boxes and lines.
  No Solid scene, `draw` or `measureText` export is needed.
- **#501.** A host that draws its own nodes measures them and passes `width` and `height`. That path
  needs no `min-height`. Layout still never measures host content: the host gives numbers.

**What it does not cover.**

1. **`.draft` text.** Callsheet writes `.draft` files. The graph API takes a graph, and no public
   call returns a `LayoutResult` for a `.draft` source. Add `layout({ draft })` to the graph API. It
   returns a `LayoutResult` with each item's label, shape and style, which is the data `geometry()`
   returns. One function closes the gap, with no new shape.
2. **The look.** A host that draws must draw shapes, group bands, labels, arrowheads and colors.
   The result's `draft` field opens the same graph in the viewer when the host wants Draftably's
   look.
3. **Fonts.** Draftably sizes a box without a size from its own font metrics. A host with other
   fonts passes sizes.
4. **Editing, the camera and accessibility.** These stay with the elements. Callsheet's editor (#500)
   still needs the element path.
5. **Views the graph input cannot state.** States, compare, panels, emphasis and icons draw through
   the elements, or through `layout({ draft })`.

A host chooses by who draws. Both paths are framework-neutral. A Solid scene in the host's tree
(#502) is a third renderer for one framework, and neither path needs it.

## The contract

### Types (in `@draftably/runtime`, shared by the viewer and the editor)

```ts
import type { Box, PlacedBox, EdgeOut } from '@draftably/runtime/graph';

/** World units at the centre of the viewport. Independent of the viewport size. */
export interface Camera {
  centerX: number;
  centerY: number;
  zoom: number;
}
export type CameraReason = 'user' | 'api' | 'fit' | 'resize' | 'restore';
export type ItemKind = 'node' | 'group' | 'edge';
/** `pending`: the viewport has no size yet; the latest call runs once it has one. */
export type MoveResult = 'moved' | 'unchanged' | 'missing' | 'pending';

/** The graph API's shapes, in world units, for the drawing now committed. */
export interface Geometry {
  revision: number;
  frame: Box; // everything drawn: heading, legend, notes, footnotes
  bounds: Box; // shapes, lines and labels only
  nodes: Record<string, PlacedBox>;
  groups: Record<string, PlacedBox>;
  edges: Record<string, EdgeOut>;
  /** Set for `compare` and `states`: each panel's offset. IDs above are the first panel's. */
  panels?: { id: string; x: number; y: number }[];
}

export interface FrameOptions {
  /** Screen pixels kept clear, for example under a host panel. */
  padding?: number | { top: number; right: number; bottom: number; left: number };
  minZoom?: number;
  maxZoom?: number;
}

export interface Anchor {
  slot: string;
  id: string;
  kind: ItemKind;
  mode: 'body' | 'overlay';
  el: HTMLElement;
}

export interface HostEvents {
  render: { revision: number; geometry: Geometry };
  diagnostics: { revision: number; diagnostics: readonly Diagnostic[]; stale: boolean };
  camera: { camera: Camera; reason: CameraReason }; // at most once per animation frame
  anchors: { anchors: readonly Anchor[] }; // after the DOM commit
  itemactivate: { id: string; kind: ItemKind; input: 'pointer' | 'keyboard' };
  hover: { id: string | null; kind?: ItemKind };
  contextmenu: {
    id: string | null;
    kind?: ItemKind;
    clientX: number;
    clientY: number;
    preventDefault(): void;
  };
  select: { ids: readonly string[]; reason: 'user' | 'api' }; // the viewer never fires it
  link: { itemId: string; href: string; target: '_self' | '_blank'; preventDefault(): void };
  change: { source: string }; // the editor only
}

export interface DiagramHandle {
  getCamera(): Camera;
  setCamera(camera: Camera): void;
  fit(ids?: readonly string[], options?: FrameOptions): MoveResult; // no ids: the whole frame
  reveal(id: string, options?: FrameOptions): MoveResult; // least move; zooms out only if needed
  geometry(): Geometry | null; // null before the first commit
  /** Plain-DOM hosts only. The elements set this from their slotted children. */
  anchor(slots: readonly string[]): void;
  on<K extends keyof HostEvents>(type: K, listener: (event: HostEvents[K]) => void): () => void;
  destroy(): void;
}

export interface ViewerHandle extends DiagramHandle {
  update(source: string, options?: UpdateOptions): Promise<UpdateResult>;
  focusItem(id: string): boolean;
}

export interface EditorHandle extends DiagramHandle {
  source(): string;
  update(source: string): Promise<UpdateResult>; // the viewer's result union
  select(ids: readonly string[]): void;
  selection(): readonly string[];
}
```

`renderSvg` adds `geometry: Geometry` to a successful result. `MountedEditor.session` leaves the
public type; `EditorHandle` replaces it. The packages are 0.x, so this ships as a minor change with
no shim.

### Elements

- Both `<draft-diagram>` and `<draft-editor>` have an `options` property that takes every mount
  option, including `styleNonce`, `openLink`, `confirm`, `storageKey` and `onInteract`.
- Setting `options` re-mounts only when a field that needs it changes. A new object with the same
  values does nothing.
- Both re-dispatch every `HostEvents` type as a bubbling `draft-<type>` `CustomEvent`. Listeners on
  the element survive a re-mount.
- `el.viewer` and `el.editor` stay the handles.
- Both render in a shadow root, and both expose named slots.

### Slots

A host puts content on an item with an ordinary child of the element:

```html
<draft-diagram source="…">
  <div slot="body:api">…</div>
  <!-- fills node api, scales with the diagram -->
  <span slot="overlay:db">3</span>
  <!-- a badge at db, stays at screen size -->
</draft-diagram>
```

- **`body:<id>`** fills the item's box, in world space. It scales and clips with the item, sits over
  the shape and under the editor's ports and handles, and replaces the title. Nodes and groups only.
- **`overlay:<id>`** sits at the item's top-right corner in screen space. It does not scale or clip.
  Any item kind.
- The element watches its children's `slot` attributes and creates one `<slot>` per name inside a
  stable target element. The target keeps its identity while the item exists, across source updates
  and camera moves. A camera move changes only a CSS transform.
- A slot for an ID the drawing does not have, or for a `compare` or `states` drawing, shows nothing.
- Slot content stays in the host's tree. It keeps the host's framework, context, reactivity, CSS
  and event handlers.

### Input

- By default a slot target has `pointer-events: none`. The pointer selects, drags and edits the
  item underneath.
- A host element marked `data-draft-input` takes its own pointer and keyboard input. Draftably starts
  no gesture and runs no shortcut from inside it.

### Lifecycle

- One commit installs geometry, camera and anchors, then notifies listeners, then resolves
  `update`. A superseded update installs nothing.
- `anchors` fires after each commit, after a change in slotted children, and with `[]` before
  `destroy` detaches the targets.
- A host call made inside a listener runs after the current batch of listeners. A listener that
  throws does not stop the others, as `viewer.ts:268-273` already does.
- `fit` and `reveal` before the viewport has a size return `pending` and run the latest call once
  it has one.

### Server rendering and exports

- The server sends the `svg` fallback, which draws titles. Slot content appears after the element
  is defined.
- `@draftably/runtime/viewer.css` hides slotted children until then:
  `draft-diagram:not(:defined) > [slot], draft-editor:not(:defined) > [slot] { display: none }`.
- Exports, the CLI and `renderSvg` never contain host content.

### Layout input

- `size id height=auto min-height=N` (from #501) reserves room. Layout never measures a slot.
- An editor resize that changes only the width keeps `height=auto min-height=`. A height drag writes
  an exact height and drops the floor.

### Framework packages

Each package holds the same five things. Only the idiom differs.

| Piece                                                                                       | React       | Solid      | Vue                   | Svelte               |
| ------------------------------------------------------------------------------------------- | ----------- | ---------- | --------------------- | -------------------- |
| Component props: `source`, `state`, `label`, `outline`, `svg`, `options`                    | props       | props      | props                 | props                |
| Element access                                                                              | `ref`       | `ref`      | `expose({ element })` | `bind:element` (new) |
| Events: one typed `on` map, `{ camera, select, … }` → `draft-<name>` listeners, in one loop | `on`        | `on`       | `on`                  | `on`                 |
| Children pass through into the element, for slots                                           | `children`  | `children` | default slot          | `children` snippet   |
| Load the editor in the browser only                                                         | `useEffect` | `onMount`  | `onMounted`           | `$effect`            |

The existing `onUpdate` / `onChange` props stay as named shortcuts. A new event, method, option or
slot kind adds no lines to any of them.

### Invariants

1. One world coordinate space: layout units equal viewBox units equal geometry units, for the
   viewer, the editor and `renderSvg`.
2. One camera shape, one zoom range and one reason union for both handles. The editor converts
   `{ x, y, k }` at its edge and keeps it internal.
3. A slot target keeps its identity while its item exists.
4. Layout never measures host content.
5. Without a host, every diagram draws correctly, with titles in place of bodies.
6. No public type names `Diagram`, `DiagramSession`, `VisibleGraph`, Solid or font internals.
7. A wrapper adds no behavior that plain DOM cannot reach.

## What to do with each PR

| PR                          | Verdict                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #498 canvas click activates | Merge as written.                                                                                                                                                                                                                                                                                                                                                               |
| #499 memoize `viewerFrame`  | Merge as written. `createScene` runs inside the session's root. The gain is smaller than stated, because `Frame.tsx` and `TextHits.tsx` already memoize their reads.                                                                                                                                                                                                            |
| #500 editor camera API      | Keep the change that sends every camera write through `setCamera` (`pointer.ts:189,469,477`). Rebuild the rest on the handle (step 2), folded into the existing `fitRects` and `revealObject`, with the viewer's camera shape.                                                                                                                                                  |
| #501 node content           | Hold `min-height` until three fixes land: diamonds return before the floor (`compile.ts:1027`), the second cells path drops it (`compile.ts:~3546`), and a resize drops it (`translate.ts:758`). Replace `nodeContent` with `body:` slots.                                                                                                                                      |
| #502 Solid host entry       | Close. Land its scene fixes as one PR: `fill="none"` on lines, text anchors, `LinkMark` without `state/`, and `NodeView` and `Lifelines` importing from `runtime/svg-renderer`, not `cli/`. Do not export `measureText`: host bodies use host fonts and CSS, and it would freeze `model/fonts.ts`. For shapes drawn in Callsheet's own tree, point to the graph API's `layout`. |

## Order of work

Each step is one PR in a stack.

1. Merge #498 and #499. Land the #502 scene fixes and the fixed `min-height`.
2. **Element parity.** `options` on both elements, the no-change guard, `draft-<name>` re-dispatch,
   listeners that survive a re-mount, Svelte `bind:element`, the generic `on` map in all four
   wrappers. This fixes the parity gaps above on its own.
3. **Spike** the three gate items. Done: all three passed (see Gate above).
4. **One camera.** Shared `Camera`, zoom range, reasons, `fit(ids)`, `reveal`, `MoveResult`, one
   event per frame. Remove `MountedEditor.session` from the public type.
5. **Geometry.** `geometry()` and `renderSvg(...).geometry` in the graph API's shapes, and
   `layout({ draft })` in the graph API with the same result.
6. **Events.** `select`, `hover`, `contextmenu` on both handles.
7. **Slots.** The six root-lookup fixes and their guard, the editor's CSS in its shadow root, the
   editor in a shadow root, the anchor layer in both elements, children pass-through in the
   wrappers, `data-draft-input`, the `:not(:defined)` rule. The root-lookup fixes can land first, on
   their own.
8. **Flow edges.** Svelte Flow and Vue Flow edge components that match React's `DraftablyEdge`.
9. Prove each framework with `scripts/prove-frameworks.ts`: a body slot that reads host context
   and host CSS, survives a source update, and takes input with `data-draft-input`; two instances
   with separate shortcuts; a failed update; the server fallback; a strict CSP.

## Considered and not chosen

- **Callbacks in the renderer (plan v1).** The viewer's sanitizer strips `foreignObject`, and every
  update would destroy and re-mount the host content.
- **A portal helper per framework (both reviews).** It works, but host CSS does not reach the
  viewer's shadow root, and Svelte has no portal. It is the fallback if the spike fails.
- **Occurrence keys for every drawn item (Sol).** Geometry carries `panels` instead. Slots stay off
  in `compare` and `states`. Add keys only if a host needs content in those views.
- **Named regions inside an item (Sol).** `body` fills the box. Add regions when a host needs content
  beside the title.
- **`worldToClient` and `clientToWorld` helpers (Sol).** Overlay slots cover the first use. Add them
  when a host draws its own layer.
- **A display list that each framework draws (both reviews).** A third renderer, and its drawings
  could drift from the other two. A host that wants to draw uses the graph API, and draws its own
  look, not a copy of Draftably's.

## Open questions for Callsheet

1. Do you use the published `@draftably/editor`, or build from `src/` on your own Solid? #501 and
   #502 only work as written in the second case.
2. Why do you want the scene in your own tree: one Solid in the bundle, reactivity per node, or your
   own handlers on shapes? Slots and events cover the last two. If you want to draw every shape
   yourself, `layout` from `@draftably/runtime/graph` gives the boxes and lines with no Solid at
   all. Would `layout({ draft })` meet that need?
3. Must node bodies take input (buttons, fields)? `data-draft-input` assumes yes.
4. Do you need selection sync both ways, or only events from Draftably?
5. Can `min-height` live in the user's saved `.draft` file?
