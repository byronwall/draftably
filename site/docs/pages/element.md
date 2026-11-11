# Element and viewer

Put an interactive diagram on any web page. The `<draft-diagram>` element sets itself up; the
`mountViewer` API gives you the lifecycle when your application must own it.

```sh
pnpm add @draftably/runtime
```

In React, Solid, Vue or Svelte, use the [framework components](#frameworks) instead. They wrap
this element.

## Add the element

Import the element entry once in your browser application, and `host.css` once per page:

```ts
import '@draftably/runtime/element';
import '@draftably/runtime/host.css';
```

`host.css` holds the rules that must work before the element loads: it reserves the element's
height and hides [slot content](#put-your-content-on-a-node) until the element is defined, so the
page does not shift or flash.

Then add a diagram in HTML:

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element supplies its styles, a 26rem height, a module worker and bundled fonts. It mounts when
added to the page and cleans up when removed. Its shadow root keeps page styles from changing the
drawing or controls. Override its height with ordinary CSS: `draft-diagram { height: 32rem; }`.

All diagrams on a page share a pool of at most four render workers (one fewer than the device's
cores), one stylesheet and one copy of each font. A worker stops after 30 seconds with no work.

### Dark pages

The drawing and the frame follow the page's color scheme. On a dark page, a diagram whose source
has no `theme` line draws dark, in the default theme's dark variant, and the frame goes dark too.
The element reads its own computed `color-scheme`, which it inherits from the page:

| Computed `color-scheme`     | The diagram draws                  |
| --------------------------- | ---------------------------------- |
| `normal` (nothing declared) | Light, also on a dark system       |
| `light`                     | Light                              |
| `dark`                      | Dark                               |
| `light dark`                | Dark while the system prefers dark |

A page that declares no scheme stays light, so a light-only site never shows a dark diagram. A
dark-mode site opts in with one line. To follow the system setting:

```css
:root {
  color-scheme: light dark;
}
```

Or, for a dark-mode class:

```css
:root.dark {
  color-scheme: dark;
}
```

A change of scheme switches the drawing at once, with nothing drawn again.

To keep one diagram light on a dark page, set its scheme:

```css
draft-diagram {
  color-scheme: light;
}
```

A `theme` line in the source wins over the page: `theme drafting` stays light, and
`theme blueprint` stays dark. `renderSvg` draws light unless you pass `colorScheme: 'dark'`.

### Frame colors

The viewer's frame, toolbar and outline read these properties. Set them on the element or any
ancestor; your values win over the defaults, which follow the page's scheme.

| Property              | Light default          | Dark default       | Used for                       |
| --------------------- | ---------------------- | ------------------ | ------------------------------ |
| `--draft-bg`          | `#fff`                 | `#16191e`          | Frame, toolbar and outline     |
| `--draft-ink`         | `#1e293b`              | `#e7eaef`          | Text                           |
| `--draft-border`      | `#cbd5e1`              | `#3d4450`          | Frame and button borders       |
| `--draft-focus`       | `#2563eb`              | `#7fa4e6`          | Focus ring                     |
| `--draft-shadow`      | `rgb(15 23 42 / 0.12)` | `rgb(0 0 0 / 0.4)` | The outline's shadow on focus  |
| `--draft-warning-ink` | `#9a3412`              | `#fdba74`          | Diagnostics text               |
| `--draft-warning-bg`  | `#fff7ed`              | `#431407`          | Diagnostics on a stale drawing |

With Vite, keep the viewer's and the editor's workers beside their packages during development:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] },
});
```

Import the element entry once in your client entry point. Listen before changing `source` to handle
the update result:

```ts
import type { UpdateResult } from '@draftably/runtime/viewer';

const diagram = document.querySelector('draft-diagram')!;
diagram.addEventListener('draft-update', (event: Event) => {
  const result = (event as CustomEvent<UpdateResult>).detail;
  if (result.status === 'error') console.error(result.error.diagnostics);
  else if (result.status === 'committed') console.log('Diagram ready.');
});
diagram.source = 'node api "API"';
```

To let users retry, assign corrected source after an error. The element keeps its last good drawing
when new source is invalid. To remove and restore it, call `diagram.remove()` and append the same
element again; its viewer and worker are cleaned up on removal and created on reconnection. Generate
a fallback SVG during the build with `renderSvg`, then place an `<img>` inside the element as shown
in [Keep an image as a fallback](#keep-an-image-as-a-fallback).

For a page without a bundler, serve the package's full `dist` directory from your origin. Import
`element.js` with a module script. Keep its neighboring worker and module files in place.

## Put your content on a node

Put your own markup on a node with an ordinary child of the element, marked `data-draft-slot`.
The element places it; your framework keeps rendering it, and your page CSS styles it.

```html
<draft-diagram source="…">
  <div data-draft-slot="body:api" class="card">
    <strong>API</strong> 12 ms p95
    <button data-draft-input>Open</button>
  </div>
  <span data-draft-slot="overlay:db" class="badge">3</span>
</draft-diagram>
```

- **`body:<id>`** fills a node, in diagram units. It scales and clips with the node and
  takes the place of the drawn title. The title stays the node's accessible name. Nodes only.
- **`overlay:<id>`** covers a node, group or edge on screen, at screen size, with
  `overflow: visible`. Position a badge or a menu in or around it with your own CSS.

Rules:

- **Room.** Layout never measures your content. Give the node room in the source, for example
  `size api width=220 height=auto min-height=110`. Content larger than its node adds a
  `DRAFT_SLOT_OVERFLOW` warning to `diagnostics`.
- **Input.** Slot content takes no pointer input, so a click or a drag goes to the node under it.
  Mark an element `data-draft-input`, at any depth, to give it its own pointer and keys: a
  button, a field or a menu. Shortcuts never fire there, and Escape returns focus to the drawing.
  The wheel over marked content scrolls your content; over other slot content it zooms.
- **Updates.** A target keeps its place in the DOM while its item exists, across source updates and
  camera changes, so focus and a caret survive an update. When an item with focused content goes
  away, focus returns to the drawing. Focus that enters a body brings its node into view.
- **Unknown IDs.** A slot for an ID the drawing does not have shows nothing and adds a
  `DRAFT_SLOT_UNKNOWN` warning. `compare` and `states` drawings repeat items, so slots are off
  there, with the same warning.
- **Zoomed out.** Below a zoom of 0.4, bodies hide and titles show again. Set `detail: 'full'` in
  `options` to keep bodies at every zoom. The anchor layer carries `data-draft-detail="low | full"`
  and `--draft-zoom` for your own rules.
- **Static output.** Exports, the CLI and `renderSvg` never contain your content. A server-rendered
  fallback draws titles.

The element never changes your elements. It assigns each marked child to its target in its shadow
root, so your framework stays the only owner of that DOM. The `anchors` event lists the targets
after each change.

Without the element, `mountViewer` gives the same layer: call `viewer.anchor(['body:api'])`, then
put content in each target the `anchors` event names.

## Change the source

Set the property or the attribute. Both update the drawing:

```ts
const diagram = document.querySelector('draft-diagram')!;
diagram.source = 'node api "Updated API"';
void diagram.updateComplete.then(result => {
  if (result?.status === 'error') console.error(result.error.diagnostics);
});
```

| Attribute | Effect                                                                    |
| --------- | ------------------------------------------------------------------------- |
| `source`  | The `.draft` text. A change redraws the diagram and keeps the camera.     |
| `label`   | The accessible name.                                                      |
| `state`   | A declared [emphasis state](#emphasis-states) to show.                    |
| `outline` | `visible` keeps the item list under the drawing. Default: shown on focus. |

Change them with `setAttribute`, such as `diagram.setAttribute('label', 'Checkout flow')`.

An invalid update keeps the last good drawing and shows its diagnostic. `updateComplete` settles
for the current update, including cancellation or removal. The bubbling `draft-update` event carries
an `UpdateResult` in `event.detail`: `committed`, `error`, `superseded`, `destroyed` or `aborted`.

## Keep an image as a fallback

Put an ordinary image inside the element. It stays visible until the first successful render,
including when JavaScript or the worker cannot load:

```html
<draft-diagram source='node api "API"' label="API diagram">
  <img src="/diagrams/api.svg" alt="The API service." style="max-width:100%;height:auto" />
</draft-diagram>
```

Generate the image with [`renderSvg`](#render-svg) during your build. The element restores its
fallback when disconnected, and adding it again creates a new viewer. Frameworks can render the
element and fallback normally; they do not own its shadow root.

Missing, empty or whitespace-only source keeps the fallback visible. Set `source` when your data
arrives. Clearing it cancels rendering and restores the fallback; `updateComplete` resolves to
`undefined` while no source is present.

## Set a custom policy

Set `options` before you add an element when you need custom execution or link rules. It takes
the same options as `mountViewer`:

```ts
const diagram = document.createElement('draft-diagram');
diagram.options = { label: 'Checkout flow', render: { links: { mode: 'none' } } };
diagram.source = source;
document.querySelector('#diagrams')!.append(diagram);
```

The element mounts once, in a microtask after it connects, so every property you set in the same
task lands before the first draw. `label`, `outline`, `toolbar` and render settings apply without a
new viewer, and keep the camera. Only a new `execution` or `render.fonts` mounts a new viewer.
`options` compares by value, so assigning a new object with the same values does nothing. Set
`render.styleNonce` when your CSP requires a style nonce. Source and options assigned before the
element registers survive its upgrade. Importing the element entry in Node is safe; it registers
and renders only in a browser.

The read-only `viewer` property gives `fit()` and camera control while the element is connected
with source.

## Events and status

Each element dispatches its events as bubbling `draft-<name>` `CustomEvent`s, with the event's
data in `detail`. Listeners on the element survive a new viewer or editor. The **Sent by** column
says which element sends each one.

| Event                | Sent by | `detail`                                                                                                                                                                                                                                             |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draft-update`       | both    | The result of each update, from the first source on. The viewer's is an `UpdateResult`. The editor's is an `EditorUpdate`: a commit has no `value` or `diagnostics`, and a source that does not parse is an `error` with a `DRAFT_PARSE` diagnostic. |
| `draft-anchors`      | both    | `{ anchors }` after each drawing and each change in slot content: `{ slot, id, kind, el }` per target; `[]` before the element goes.                                                                                                                 |
| `draft-render`       | diagram | `{ revision, value, geometry }` after each drawing. The editor draws no standalone SVG; read `editor.geometry()` instead.                                                                                                                            |
| `draft-diagnostics`  | both    | `{ revision, diagnostics, stale }`. The editor's holds a parse error first, then slot warnings.                                                                                                                                                      |
| `draft-camera`       | both    | `{ camera, reason }` after a pan, zoom or fit.                                                                                                                                                                                                       |
| `draft-itemactivate` | diagram | `{ id, kind, input, revision }` when the user picks an item. In the editor a press selects the item: listen for `draft-select`.                                                                                                                      |
| `draft-link`         | both    | `{ itemId, href, target }` when the user opens a link. Call `preventDefault()` to open it yourself. In the editor the link mark opens it, and `target` is `_blank`.                                                                                  |
| `draft-contextmenu`  | both    | `{ id, kind, clientX, clientY }`; `id` is null on the background. Call `preventDefault()` to stop the browser's menu and show your own.                                                                                                              |
| `draft-select`       | editor  | `{ ids, reason }`: the selection changed, by the user (`user`) or through `select()` (`api`).                                                                                                                                                        |
| `draft-change`       | editor  | `{ source }` after each kept edit, undo and redo.                                                                                                                                                                                                    |

```ts
diagram.addEventListener('draft-itemactivate', event => console.log(event.detail.id));
```

The `@draftably/runtime` types add these events to `HTMLElementEventMap`, so `event.detail` needs
no cast. `HOST_EVENTS` from `@draftably/runtime/host` lists every event name. A framework
component's `onLink` or `onContextmenu` prop receives the `detail` with the same
`preventDefault()`, so you can cancel either one without a listener on the element.

The element reflects its state in a `status` attribute: `loading`, `ready` or `error`. Style each
state with ordinary CSS, such as `draft-diagram[status='loading'] { opacity: 0.6; }`. A failed
first update keeps the fallback and shows its diagnostics in the element.

If two copies of the runtime load on one page, the second copy warns once in the console and the
first copy's element stays in use.

## Mount a viewer yourself

`mountViewer` is the API under the element. The viewer owns the children of its host: give it an
empty element, mount after the DOM exists, then call `update` with source text. Each handle owns
its camera and cleanup.

```ts
import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

const host = document.querySelector<HTMLElement>('#diagram');
if (!host) throw new Error('Missing #diagram host');
const viewer = mountViewer(host, { label: 'Checkout diagram' });
void viewer.update(source).then(result => {
  if (result.status === 'error') console.error(result.error.diagnostics);
});
// Call viewer.update(nextSource) when the source changes.
// Call viewer.destroy() when the host is removed.
```

Give the host a height in your stylesheet. The viewer fills that height, follows size changes and
waits to fit while hidden.

In a framework, mount in the mount hook, update in a separate effect and destroy in the cleanup.
Two effects let React Strict Mode run setup, cleanup and setup again without sharing a handle:

```tsx
import { useEffect, useRef } from 'react';
import { mountViewer, type ViewerHandle } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

export function DraftDiagram({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef<ViewerHandle | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const viewer = mountViewer(host.current, { label: 'Diagram' });
    current.current = viewer;
    return () => {
      viewer.destroy();
      if (current.current === viewer) current.current = null;
    };
  }, []);
  useEffect(() => {
    void current.current?.update(source);
  }, [source]);
  return <div ref={host} className="diagram-host" />;
}
```

### Worker and fonts

The viewer compiles in a module worker, served from the same origin as a module-relative asset. All
viewers on a page share a small pool of them. A restrictive CSP must allow that worker. The element's styles are a
constructable stylesheet, so a strict `style-src` needs no nonce for them. A worker that does not start or times out returns an
update error; the viewer does not switch to main-thread compilation by itself. Set
`execution: { mode: 'main' }` only for known small inputs, or when you pass a host link resolver,
because worker messages cannot carry functions.

The viewer embeds the fonts it uses as `data:` URLs and waits for them to load before it commits
a drawing, so a CSP needs `font-src data:`. A blocked font returns an error and keeps the
previous drawing. To serve fonts from your origin instead, import `@draftably/runtime/fonts.css`
and set `render: { fonts: 'host' }`. [Strict CSP](#strict-csp) has a complete policy.

### Camera and keyboard

The viewer zooms with the wheel, pans with a background drag, and has zoom and fit buttons. While
its viewport has focus, `+`, `-` and `f` zoom and fit. **Fit diagram** shows the whole diagram with
a margin, capped at actual size. Your camera changes stay through source updates and resizes;
call `fit()` or update with `{ camera: 'fit' }` for a new overview.

### Find where things are

`geometry()` returns where every node, group and edge is drawn, in world units, in the
[graph API's shapes](#layout-api): a `Box` per node and group, and per edge its points, its SVG
path and its label box. `frame` is the whole drawing, with the heading and legend; `bounds` holds
the shapes and lines only. It is `null` before the first drawing, and for `compare` and `states`
drawings, which draw an item more than once.

```ts
const g = diagram.viewer!.geometry();
const api = g?.nodes.api; // { x, y, width, height, parent? }
```

The object is the same until the next drawing, whose `revision` it carries; the `render` event
brings the new one. `renderSvg` returns the same `geometry` with a successful result, in the SVG's
`viewBox` units. `ready` resolves after the first drawing or failure, then after each later one.

### Steer the camera

The viewer and the editor share one camera: the world point at the centre of the view, and a
zoom from 0.02 to 8. The same call moves both the same way.

```ts
const viewer = diagram.viewer!;
viewer.fit(['api', 'db']); // frame these items; no ids frames the whole drawing
viewer.reveal('queue'); // the least move that shows it; zooms out only if it does not fit
viewer.fit(undefined, { padding: { top: 16, right: 16, bottom: 16, left: 320 } }); // a side panel
const camera = viewer.getCamera(); // { centerX, centerY, zoom }, to save and restore
viewer.setCamera(camera);
```

`fit` and `reveal` return `moved`, `unchanged` or `missing` (no such item). Before the viewport
has a size or a drawing, they return `pending` and run the latest call once it has both.
`padding` (screen pixels, default 32), `minZoom` and `maxZoom` (default 1 for `fit`) shape both.

The `camera` event (`draft-camera` on the element) comes at most once per animation frame, also
during a drag, with a `reason`: `user`, `api`, `fit`, `resize`, or `restore` when the editor
brings a saved or undone view back.

The outline is a numbered list of item buttons, one for each node, group and edge. Screen readers
and keyboard users always have it. By default it is visually hidden: press Tab from the viewport
and it shows over the bottom of the drawing while it has focus. Selecting an item centers it at
actual size or larger. Set `outline: 'visible'` to keep the list under the drawing:

```ts
mountViewer(host, { label: 'Checkout diagram', outline: 'visible' });
```

`detail: 'full'` keeps [slot bodies](#put-your-content-on-a-node) at every zoom; the default,
`'auto'`, hides them below a zoom of 0.4.

## Static rendering and SSR

Render an SVG during the build and show it as an ordinary image. To make it interactive, keep the
image as a sibling fallback and mount into an empty sibling after hydration. Hide the image only
after an update returns `committed`, and keep it on error, so a failed worker or font still leaves
a useful page. Frameworks must not reconcile children inside the viewer host.
