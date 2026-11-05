# @draftably/runtime

Render `.draft` source to SVG in Node or a browser. The package has no runtime dependencies, DOM shim, or install scripts.

Start with [Use Draftably in your project](https://github.com/byronwall/draftably/blob/main/docs/integrations/README.md)
for package installation and complete element, SVG, and Markdown examples.

```ts
import { renderSvg, validate } from '@draftably/runtime';

const result = await renderSvg('node api "API"\n');
if (result.ok) console.log(result.value.svg);
else console.error(result.diagnostics);

await validate('node api "API"\n');
```

Image output embeds its used fonts. Links and source metadata are disabled by default. Inline output needs a unique `idPrefix`:

```ts
const result = await renderSvg(source, {
  target: 'inline',
  idPrefix: 'checkout-one',
  description: 'The web app calls the API and saves an order.',
});
```

To use exact host fonts, import `@draftably/runtime/fonts.css` and set `fonts: 'host'` with inline output. Copy the full `dist` directory for a no-bundler browser module; its font chunk and CSS font files use relative paths.

## Interactive viewer

For automatic setup, import `@draftably/runtime/element` once and use
`<draft-diagram source='node api "API"'></draft-diagram>`. It supplies styles,
default sizing, updates, and cleanup. Put an image inside it for a static
fallback. See the [element guide](https://github.com/byronwall/draftably/blob/main/docs/integrations/element.md)
for the complete Vite configuration and source update example.

The optional `/viewer` entry mounts an independent, read-only viewer. Its default module worker and embedded fonts keep compilation off the main thread and visuals self-contained:

```ts
import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

const viewer = mountViewer(document.querySelector('#diagram')!, { label: 'Checkout flow' });
void viewer.update(source).then(result => {
  if (result.status === 'error') console.error(result.error.diagnostics);
});
// Call viewer.destroy() when the host is removed.
```

Give the host a height. The viewer requires an empty host and owns its children. Worker startup, timeout, and font failures return an error and preserve the last good drawing. The viewer does not fall back to main-thread compilation. Select `execution: { mode: 'main' }` for known small inputs or a host-provided link resolver. To use host fonts, import `@draftably/runtime/fonts.css` and set `render: { fonts: 'host' }`.

Read the [viewer integration guide](https://github.com/byronwall/draftably/blob/main/docs/integrations/viewer.md) for lifecycle, accessibility, framework, and SSR recipes.

Requires Node 22.21 or later. Browser ESM is checked in Chromium. Cancellation on the calling thread is cooperative. A host must choose worker or process isolation for an enforced deadline.

See the [runtime guide](https://github.com/byronwall/draftably/blob/main/docs/integrations/runtime.md) and [consumer examples](https://github.com/byronwall/draftably/tree/main/integration-examples).
