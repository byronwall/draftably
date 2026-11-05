# Native SVG runtime

The runtime facade compiles `.draft` text asynchronously and returns an SVG image string. It uses the native compiler and the CLI's existing SVG writer. The SVG includes the bundled fonts used by its theme.

## Render

```ts
import { renderSvg } from '../../src/runtime';

const result = await renderSvg('node web "Web"\n');
if (result.ok) {
  console.log(result.value.svg);
  console.log(result.value.width, result.value.height);
}
```

The result contains a detached summary with the title, size, viewBox, source item IDs, labels, lines, edge endpoints, emphasis states, and active state. It does not expose the compiled scene or editor document.

Links are disabled in the SVG. Raw source is not embedded. `state` selects a declared emphasis state. `sourceId` labels diagnostic locations. `signal` requests cooperative cancellation; compilation can finish before cancellation is observed because it runs on the current thread.

## Validate

```ts
import { validate } from 'diagram-studio/src/runtime';

const result = await validate('node web "Web"\n', { sourceId: 'architecture.draft' });
```

Validation runs the asynchronous compiler, including native layout engines. It returns structured diagnostics with stable `DRAFT_*` categories, messages, source lines, optional source IDs, and item IDs. It does not produce SVG.

## Limits and text

Pass positive integer limits to reduce work and output size. Overrides cannot exceed the native ceilings: 300,000 source characters, 1,000,000 UTF-8 source bytes, 500 nodes and groups, 1,200 edges, containment depth 12, and 8,000,000 UTF-8 SVG bytes. The existing writer builds the SVG before the facade checks its byte size, so this limit does not bound temporary serialization memory. Validation accepts compile limits only. Invalid limit values throw `RangeError`; a non-string source throws `TypeError`.

XML-invalid source characters and invalid characters decoded from quoted labels return `DRAFT_TEXT_INVALID`. Expected syntax, compilation, limit, and cancellation failures are structured results. Unexpected implementation failures return `DRAFT_INTERNAL` without a stack trace.

This facade currently emits the existing image-style SVG. Inline namespace, host font mode, safe link resolution, caller-provided title/description, source metadata, and DOM output are not supported yet.
