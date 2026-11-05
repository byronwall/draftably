# Add a diagram element

Import the optional element entry once in your browser application:

```ts
import '@draftably/runtime/element';
```

Then add a diagram in HTML:

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element supplies its styles, a 26rem height, a module worker, and bundled
fonts. It mounts when added to the page and cleans up when removed. Its shadow
root keeps page styles from changing the drawing or controls. Override its
height with ordinary CSS: `draft-diagram { height: 32rem; }`.

For Vite, keep the runtime's worker beside its package during development:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: { exclude: ['@draftably/runtime'] },
});
```

The [complete element example](../../integration-examples/element-viewer/README.md)
builds with Vite's default target. The package remains unpublished; use the
packed archive from this branch for a local trial.

## Change the source

Set the property or attribute. Both update the drawing:

```ts
const diagram = document.querySelector('draft-diagram')!;
diagram.source = 'node api "Updated API"';
void diagram.updateComplete.then(result => {
  if (result?.status === 'error') console.error(result.error.diagnostics);
});
```

`state` selects a declared emphasis state. `label` supplies an accessible name.
Changing source or state preserves the camera. An invalid update keeps the last
good drawing and shows its diagnostic. `updateComplete` settles for the current
update, including cancellation or removal. The `draft-update` event carries
committed or error results in `event.detail`.

## Keep an image as a fallback

Put an ordinary image inside the element. It stays visible until the first
successful render, including when JavaScript or the worker cannot load:

```html
<draft-diagram source='node api "API"' label="API diagram">
  <img src="/diagrams/api.svg" alt="The API service." style="max-width:100%;height:auto" />
</draft-diagram>
```

Generate the image with `renderSvg` during your build. The element restores its
fallback when disconnected. Adding it again creates a new viewer. Frameworks
can render the element and fallback normally; they do not own its shadow root.
The element's source is public browser data, as with the imperative viewer.

## Use a custom policy

Set `options` before adding an element when you need custom execution or link
rules. This uses the same `ViewerOptions` as `mountViewer`:

```ts
const diagram = document.createElement('draft-diagram');
diagram.options = { label: 'Checkout flow', render: { links: { mode: 'none' } } };
diagram.source = source;
document.querySelector('#diagrams')!.append(diagram);
```

Replacing `options` or `label` remounts the viewer. Set `render.styleNonce` before
connection when your CSP requires a style nonce. Source and options properties
assigned before custom-element registration survive its upgrade.

The read-only `viewer` property gives access to `fit()`, camera control, and
viewer events while connected. For full lifecycle control, use
[`mountViewer`](viewer.md). Importing the element entry in Node is safe, but
registration and rendering occur only in a browser.

For a page without a bundler, serve the package's full `dist` directory from
your origin. Import `element.js` with a module script. Keep its neighboring
worker and module files in place.
