# Element and viewer

Put an interactive diagram on any web page. The `<draft-diagram>` element sets itself up; the
`mountViewer` API gives you the lifecycle when your application must own it.

```sh
pnpm add @draftably/runtime
```

In React, Solid, Vue or Svelte, use the [framework components](#frameworks) instead. They wrap
this element.

## Add the element

Import the element entry once in your browser application:

```ts
import '@draftably/runtime/element';
```

Then add a diagram in HTML:

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element supplies its styles, a 26rem height, a module worker and bundled fonts. It mounts when
added to the page and cleans up when removed. Its shadow root keeps page styles from changing the
drawing or controls. Override its height with ordinary CSS: `draft-diagram { height: 32rem; }`.

With Vite, keep the runtime's worker beside its package during development:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: { exclude: ['@draftably/runtime'] },
});
```

The [element example](https://github.com/byronwall/draftably/tree/main/integration-examples/element-viewer)
builds with Vite's default target and shows source updates, error recovery, fallback and removal.

For a page without a bundler, serve the package's full `dist` directory from your origin. Import
`element.js` with a module script. Keep its neighboring worker and module files in place.

## Change the source

Set the property or the attribute. Both update the drawing:

```ts
const diagram = document.querySelector('draft-diagram')!;
diagram.source = 'node api "Updated API"';
void diagram.updateComplete.then(result => {
  if (result?.status === 'error') console.error(result.error.diagnostics);
});
```

| Attribute | Effect                                                                                        |
| --------- | --------------------------------------------------------------------------------------------- |
| `source`  | The `.draft` text. A change redraws the diagram and keeps the camera.                         |
| `label`   | The accessible name.                                                                          |
| `state`   | A declared [emphasis state](#emphasis-states) to show.                                        |
| `outline` | `visible` keeps the item list under the drawing. By default it shows only while it has focus. |

Change them with `setAttribute`, such as `diagram.setAttribute('label', 'Checkout flow')`.

An invalid update keeps the last good drawing and shows its diagnostic. `updateComplete` settles
for the current update, including cancellation or removal. The `draft-update` event carries
committed or error results in `event.detail`.

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

Replacing `options`, `label` or `outline` remounts the viewer. Set `render.styleNonce` before
connection when your CSP requires a style nonce. Source and options assigned before the element
registers survive its upgrade. Importing the element entry in Node is safe; it registers and
renders only in a browser.

The read-only `viewer` property gives `fit()`, camera control and viewer events while the element
is connected with source.

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

The viewer compiles in a module worker, served from the same origin as a module-relative asset. A
restrictive CSP must allow that worker. A worker that does not start or times out returns an
update error; the viewer does not switch to main-thread compilation by itself. Set
`execution: { mode: 'main' }` only for known small inputs, or when you pass a host link resolver,
because worker messages cannot carry functions.

The viewer embeds the fonts it uses and waits for them to load before it commits a drawing. A
blocked font returns an error and keeps the previous drawing. To use host fonts, import
`@draftably/runtime/fonts.css` and set `render: { fonts: 'host' }`.

### Camera and keyboard

The viewer zooms with the wheel, pans with a background drag, and has zoom and fit buttons. While
its viewport has focus, `+`, `-` and `f` zoom and fit. **Fit diagram** shows the whole diagram with
a margin, capped at actual size. Your camera changes stay through source updates and resizes;
call `fit()` or update with `{ camera: 'fit' }` for a new overview.

The outline is a numbered list of item buttons, one for each node, group and edge. Screen readers
and keyboard users always have it. By default it is visually hidden: press Tab from the viewport
and it shows over the bottom of the drawing while it has focus. Selecting an item centers it at
actual size or larger. Set `outline: 'visible'` to keep the list under the drawing:

```ts
mountViewer(host, { label: 'Checkout diagram', outline: 'visible' });
```

## Static rendering and SSR

Render an SVG during the build and show it as an ordinary image. To make it interactive, keep the
image as a sibling fallback and mount into an empty sibling after hydration. Hide the image only
after an update returns `committed`, and keep it on error, so a failed worker or font still leaves
a useful page. Frameworks must not reconcile children inside the viewer host.
