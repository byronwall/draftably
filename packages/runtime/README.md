# @draftably/runtime

Render `.draft` diagrams to SVG in Node or a browser, or show them in an interactive
`<draft-diagram>` element. No runtime dependencies, DOM shim or install scripts. Needs Node 22.21
or later.

```sh
pnpm add @draftably/runtime
```

```ts
import { renderSvg } from '@draftably/runtime';

const result = await renderSvg('node api "API"');
if (result.ok) console.log(result.value.svg);
```

```ts
import { layout } from '@draftably/runtime/graph';

// Positions, routed lines and label boxes for a graph your app draws.
const placed = await layout({
  nodes: [{ id: 'a' }, { id: 'b' }],
  edges: [{ source: 'a', target: 'b' }],
});
```

```ts
import { route } from '@draftably/runtime/route';

// Lines only, between boxes your app placed: the router without the layout engine.
const { edges } = route({
  nodes: [
    { id: 'a', x: 0, y: 0, width: 200, height: 124 },
    { id: 'b', x: 260, y: 40, width: 200, height: 98 },
  ],
  edges: [{ source: 'a', target: 'b', sourceAt: 85, targetAt: 59 }], // rows, down from each top
  routing: { avoidNodes: 'strict' }, // a line with no clear way comes back blocked, not drawn
});
```

For a schema resize, pass the last result as the second argument to `route`.

```ts
const routing = { quality: 'full', avoidNodes: 'strict' } as const;
const previous = route({ nodes, edges, routing });
const resized = route({ nodes: resizedNodes, edges, routing }, previous);
```

Set both sides and row offsets on each line. Reuse supports unlabelled lines between rectangular cards with explicit full or quick quality. Keep the result in the worker that called `route`. The router checks moved lanes and repairs invalid ones. A crowded drawing can still need a fresh quality comparison. A graph edit, an unsupported input, or a copied result uses ordinary routing.

For full-quality row schemas, opt into the experimental compact grid with
`route({ ...graph, resize: 'compact' }, previous)`. It tries direct connections and
separates unrelated shared runs. It compares small drawings with a fresh route.
For larger drawings, check its [measured quality and resize times](../../docs/intent/route-speed/COMPACT.md).

```ts
import '@draftably/runtime/element';
import '@draftably/runtime/host.css'; // once per page: heights and slot rules before the element loads
// <draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

## Docs

- [Render SVG](https://draftably.dev/docs/render-svg): options, validation, inline output, links
  and limits
- [Layout API](https://draftably.dev/docs/layout-api): lay out and route a graph your app draws
- [Drop in your graph layout](https://draftably.dev/docs/layout-drop-in): replace the layout in
  React Flow, Svelte Flow, elkjs, dagre or Cytoscape.js with one changed call
- [How embedding works](https://draftably.dev/docs/embed-concepts) and the [API reference](https://draftably.dev/docs/api-reference): the element, `mountViewer`, fallback
  images and SSR
- [Embed diagrams](https://draftably.dev/docs/embed): every route, including framework components
