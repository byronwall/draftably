# Native SVG runtime

The runtime compiles `.draft` text asynchronously and returns an SVG string. It shares the native compiler and drawing code with the CLI. Image output embeds the bundled fonts used by its theme.

## Render

```ts
import { renderSvg } from '@draftably/runtime';

const result = await renderSvg('node web "Web"\n');
if (result.ok) {
  console.log(result.value.svg);
  console.log(result.value.width, result.value.height);
}
```

The result contains a detached summary with the title, size, viewBox, source item IDs, labels, lines, edge endpoints, emphasis states, and active state. It does not expose the compiled scene or editor document.

Links and raw source metadata are disabled by default. `state` selects a declared emphasis state. `sourceId` labels diagnostic locations. `signal` requests cooperative cancellation; compilation can finish before cancellation is observed because it runs on the current thread.

## Validate

```ts
import { validate } from '@draftably/runtime';

const result = await validate('node web "Web"\n', { sourceId: 'architecture.draft' });
```

Validation runs the asynchronous compiler, including native layout engines. It returns structured diagnostics with stable `DRAFT_*` categories, messages, source lines, optional source IDs, and item IDs. It does not produce SVG.

## Limits and text

Pass positive integer limits to reduce work and output size. Overrides cannot exceed the native ceilings: 300,000 source characters, 1,000,000 UTF-8 source bytes, 500 nodes and groups, 1,200 edges, containment depth 12, and 8,000,000 UTF-8 SVG bytes. The SVG writer checks output bytes as chunks arrive. This does not bound all compiler memory. Validation accepts compile limits only. Invalid limit values throw `RangeError`; a non-string source throws `TypeError`.

XML-invalid source characters and invalid characters decoded from quoted labels return `DRAFT_TEXT_INVALID`. Expected syntax, compilation, limit, and cancellation failures are structured results. Unexpected implementation failures return `DRAFT_INTERNAL` without a stack trace.

## Inline output and fonts

Use `{ target: 'inline', idPrefix: 'checkout-one' }` for each inline instance. Prefixes must match `[A-Za-z][A-Za-z0-9_-]{0,63}`. The host must assign a unique prefix per instance. All SVG IDs, references, and link styles use that prefix.

Image output requires embedded fonts. Inline output can use `fonts: 'host'` with the exact distributed `fonts.css`. Font family names include the identity of the bundled font files and metric table. Embedded font data loads only when rendering needs it.

## Links, accessibility, and source

Links default to `{ mode: 'none' }`. To permit HTTP(S) destinations, use `links: { mode: 'safe', baseUrl: 'https://example.com/docs/' }`. Relative destinations need that host base. Authored `link-base` cannot change this policy. A host `resolve({ itemId, href })` callback can return a replacement or `null`; final HTTP(S) validation always applies. A throwing callback rejects the render promise.

Safe links open in `_self` by default. `target: '_blank'` adds `noopener noreferrer`. Denied links lose their anchor and mark. Their destinations do not appear in tooltips.

`title` and `description` add accessible text to the SVG. They accept plain text and reject XML-invalid characters. `styleNonce` applies a host nonce to the generated style element. The surrounding page must also permit embedded font data, or use host fonts under its CSP.

`includeSource: true` adds recoverable `.draft` source metadata. It can expose comments and paths authored in the source. The default omits this metadata; diagnostic `sourceId` is never included. The source reader accepts legacy metadata and the new namespaced form.

Successful results include runtime, DSL, font, and render-context identities in `provenance`. They describe this result; they are not a public compiled-scene format. The package ships ESM, TypeScript declarations, exact font assets, and a no-bundler browser entry.

The optional viewer is a separate import. See [viewer integration](viewer.md) for mount, update, cleanup, and framework recipes.
