# Layout API

`@draftably/runtime/graph` lays out and routes a graph that your app draws. You give it nodes,
groups and edges as plain data. It gives back a position and size for each box, and a routed line
and label box for each edge. Your app draws them its own way.

```sh
pnpm add @draftably/runtime
```

It uses the same compiler and router as `.draft` files, so a graph draws the same as the file it
equals. It runs in Node and in a browser, with no runtime dependencies.

## Lay out a graph

```ts
import { layout } from '@draftably/runtime/graph';

const placed = await layout({
  nodes: [
    { id: 'web', label: 'Web app' },
    { id: 'api', label: 'API gateway' },
    { id: 'orders', label: 'Orders', parent: 'services' },
    { id: 'db', label: 'Postgres', width: 140, height: 60 },
  ],
  groups: [{ id: 'services', label: 'Domain services' }],
  edges: [
    { source: 'web', target: 'api', label: 'HTTPS' },
    { source: 'api', target: 'orders' },
    { source: 'orders', target: 'db', dashed: true },
  ],
  direction: 'right',
});

placed.nodes.api; // { x, y, width, height }
placed.edges.e1; //  { points, path, label, sourceSide, targetSide, blocked }
```

IDs can be any string, such as `1` or `a b`. Results use your IDs, keyed by ID. An edge without
an `id` is `e1`, `e2` and so on, in order.

### Input

| Field       | Meaning                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `nodes`     | `id`, `label`, `parent` (a group ID), `shape` (`box`, `pill`, `circle`, `diamond`, `text`), `width`, `height`. |
| `groups`    | `id`, `label`, `parent`, `arrange`, `direction`, `gap`. A group holds the nodes and groups that name it.       |
| `edges`     | `id`, `source`, `target`, `label`, `dashed`, `sourceSide` and `targetSide` (`left`, `right`, `top`, `bottom`). |
| `arrange`   | How the top level is arranged: `flow` (the default), `row`, `column`, `lanes`, `sequence` or `engine:<name>`.  |
| `direction` | `right` or `down`. Without one, `flow` picks the direction that fits best.                                     |
| `gap`       | Space between boxes in pixels.                                                                                 |
| `fit`       | The shape to aim for: `wide`, `slide`, `square`, `page` or `tall`.                                             |
| `routing`   | Router settings, as in [Routing](#routing), and `quality`.                                                     |

A node without a size fits its label in Draftably's fonts. Give a size when your app draws the
label in another font, or measures its nodes first. A size is kept within 40–1200 by 24–1200
pixels; the result's `warnings` say when one was changed.

The arrangements and engines are the ones the [Language](#overview) describes. See
[Layout engines](#layout-engines) for the `engine:` names.

### Output

| Field      | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| `nodes`    | `{ x, y, width, height, parent? }` by node ID.                                         |
| `groups`   | The same, by group ID. A group's box holds its title band and its members.             |
| `edges`    | By edge ID. See below.                                                                 |
| `bounds`   | The box round everything drawn.                                                        |
| `quality`  | `full` or `quick`: the router mode that drew the lines.                                |
| `warnings` | Messages about the result, such as a changed size or a line that found no clear way.   |
| `draft`    | The `.draft` file this graph equals. Open it in the viewer, or pass it to `renderSvg`. |

Each edge has:

- `points`: the line from the source's outline to the target's. Draw the arrowhead at the last
  point.
- `path`: SVG path data for the same line with Draftably's rounded corners.
- `label`: the label's box, or `null`. Draw a backing behind the text: other lines can pass under
  a label.
- `sourceSide` and `targetSide`: the sides the line leaves and enters.
- `blocked`: `true` when the router found no clear way and drew a fallback line.

## Route lines only

When your app places the nodes itself, `route` draws only the lines. Nodes stay where your app
put them.

```ts
import { route } from '@draftably/runtime/graph';

const { edges } = route({
  nodes: [
    { id: 'a', x: 0, y: 0, width: 120, height: 60 },
    { id: 'b', x: 400, y: 0, width: 120, height: 60 },
  ],
  groups: [],
  edges: [{ source: 'a', target: 'b', label: 'calls' }],
});
```

Group boxes and node shapes are obstacles, as in a `.draft` drawing. Give a group its `label` so
lines keep out of its title band. `route` runs synchronously.

## React Flow and Svelte Flow

Pass your React Flow nodes and edges under `reactFlow`. You get them back in the same shape, under
the same key:

```tsx
import { layout, route } from '@draftably/runtime/graph';
import { DraftablyEdge } from '@draftably/react/flow';

const edgeTypes = { draftably: DraftablyEdge };

// After React Flow has measured the nodes (`useNodesInitialized`):
const { reactFlow } = await layout({ reactFlow: { nodes: getNodes(), edges } });
setNodes(reactFlow.nodes);
setEdges(reactFlow.edges);

<ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} />;
```

- Nodes get a `position`, relative to their parent for sub-flows, and a `width` and `height`.
  A node that React Flow measured keeps its measured size.
- A node with `type: 'group'`, or one that another node names in `parentId`, is a group.
- Edges keep their fields and get `type: 'draftably'` (unless they have a type) and
  `data.draftably`: the routed `path`, `points` and `label` box. `DraftablyEdge` draws them, with
  the edge's `label` on a white backing and React Flow's `markerEnd`.
- An edge's `sourceHandle` or `targetHandle` named `left`, `right`, `top` or `bottom` fixes that
  side. `animated: true` draws the line dashed.
- Draftably chooses where each line meets its node, so hide the handle dots with
  `.react-flow__handle { opacity: 0 }` unless users connect nodes by dragging.

To route the lines again while a user drags nodes, call `route` with the nodes where they are now:

```tsx
const onNodesChange = changes => {
  const next = applyNodeChanges(changes, nodes);
  setNodes(next);
  const { reactFlow } = route({ reactFlow: { nodes: next, edges }, routing: { quality: 'quick' } });
  setEdges(reactFlow.edges);
};
```

`route` reads each node's measured size, so it skips a node, and keeps its edges' last routes,
until React Flow has measured it.

Svelte Flow nodes and edges have the same shape. Pass them under `svelteFlow`, and draw
`data.draftably.path` in a custom edge with `BaseEdge`:

```svelte
<script>
  import { BaseEdge } from '@xyflow/svelte';
  let { data, markerEnd } = $props();
</script>

<BaseEdge path={data.draftably.path} {markerEnd} />
```

`integration-examples/react-flow` is a complete React Flow app that does all of this.

## Switch from elkjs, dagre or Cytoscape

Each of these keeps the call your code already makes and the shape it already reads.

**elkjs.** Replace `new ELK()` with `new DraftablyELK()`. `layout(graph, { layoutOptions })` takes
the same ELK JSON and returns it the way elkjs does. Node `x` and `y` are relative to the parent.
Edge `sections` and edge labels are relative to the edge's `container`, which is set on each
edge. You can also call `layout({ elk: graph })`.

```ts
import { DraftablyELK } from '@draftably/runtime/graph';

const elk = new DraftablyELK();
const placed = await elk.layout(graph);
elk.warnings; // ELK options that draftably did not use
```

A node with `children` is a group. `elk.direction` (all four), `elk.spacing.nodeNode`,
`elk.layered.spacing.nodeNodeBetweenLayers`, `elk.port.side` and `elk.algorithm` (`layered`,
`force`, `stress`, `mrtree`, `rectpacking`) are read. A hyperedge becomes one line per source and
target. Other options are listed in `warnings`. Ports keep their side, not their position.

**dagre.** Build the graph with graphlib as before, and call `dagreLayout(g)` where you called
`dagre.layout(g)`. It writes `x` and `y` (centres), `width` and `height` to each node, `points`
(and a label's `x` and `y`) to each edge, and `width` and `height` to the graph. Clusters set with
`setParent` are groups. `rankdir` (`TB`, `BT`, `LR`, `RL`) and `ranksep` are read. Like
`dagre.layout`, it runs synchronously.

```ts
import { dagreLayout } from '@draftably/runtime/graph';

dagreLayout(g); // where you called dagre.layout(g)
```

**Cytoscape.js.** Register the layout once, then run it by name. It places nodes, with compound
parents as groups. Cytoscape draws the edges itself; the routed lines are on `layout.result` for
an app that draws its own.

```ts
import cytoscape from 'cytoscape';
import { draftablyLayout } from '@draftably/runtime/graph';

cytoscape.use(draftablyLayout);
cy.layout({ name: 'draftably', direction: 'right' }).run();
```

`layoutSync` is the synchronous `layout` that `dagreLayout` and the Cytoscape layout use. It cannot
run `engine:` arrangements or `fit`; use `layout` for those.

ELK and dagre do not fold a long drawing into rows, so their adapters set `fold: 'never'`, and
groups flow in the drawing's direction. Pass `fold` to any keyed call to choose.

## Routing quality

The router can repair crossings and even out lanes after it routes each line. That pass costs
time that grows with the number of lines and how often they cross.

| `routing.quality` | Effect                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| `auto`            | The default. Routes each line once, then repairs the drawing when that will stay fast. |
| `full`            | Always repairs. Use it for a final export, or when time does not matter.               |
| `quick`           | Never repairs. Lines can cross more often on a dense graph.                            |

With `auto`, a graph of 100 nodes lays out in about a second on a laptop, and a sparse one in a
third of that. A dense graph of that size gets `quick` routes, which cross about a fifth more
often than `full` ones.

## Errors and warnings

`layout` and `route` throw on input they cannot draw, with a message that names the object:
`Node "a" refers to unknown id "nope".` or `Duplicate node or group id "a".` A setting outside its
range throws with the range, such as `Expected gap from 8 to 300; got 500.`

Problems that still draw are in `warnings`.

## Run it off the main thread

Layout and routing run on the calling thread. A large graph can take most of a second. In a
browser, call `layout` from a Web Worker when your page must stay responsive while it runs. The
input and output are plain data, so they cross `postMessage` unchanged.
