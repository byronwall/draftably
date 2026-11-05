# @draftably/runtime

Render `.draft` source to SVG in Node or a browser. The package has no runtime dependencies, DOM shim, or install scripts.

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

Requires Node 22.21 or later. Browser ESM is checked in Chromium. Cancellation on the calling thread is cooperative. A host must choose worker or process isolation for an enforced deadline.

See the [runtime guide](https://github.com/byronwall/draftably/blob/main/docs/integrations/runtime.md) and [consumer examples](https://github.com/byronwall/draftably/tree/main/integration-examples).
