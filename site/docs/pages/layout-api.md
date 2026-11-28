# Layout API

`@draftably/runtime/graph` lays out and routes a graph that your app draws. You give it nodes,
groups and edges as plain data. It gives back a position and size for each box, and a routed line
and label box for each edge. Your app draws them its own way.

```sh
pnpm add @draftably/runtime
```

It uses the same compiler and router as `.draft` files, so a graph draws the same as the file it
equals. It runs in Node and in a browser, with no runtime dependencies.

Already use React Flow, Svelte Flow, elkjs, dagre or Cytoscape.js? [Drop in your graph
layout](#layout-drop-in) shows the one call to change for each, with before and after code.

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
| `fold`      | `auto` (the default) folds a long `flow` into rows when it is much wider than a page. `never` keeps one row.   |
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
- `crosses`: on a blocked line from `route`, the nodes its fallback runs through.

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

### Row ports

A line can start or end at a row inside a box, such as a field in a table card. `sourceAt` and
`targetAt` give the end's distance in pixels down from the box's top edge. The end sits on the
box's left or right side. Without `sourceSide` or `targetSide`, the router picks left or right. A
row port on `top` or `bottom` throws. An end keeps at least 10 px from a corner.

```ts
const HEADER = 46,
  ROW = 26;
const field = (i: number) => HEADER + (i + 0.5) * ROW; // the middle of field i

route({
  nodes: [
    { id: 'jobs', x: 0, y: 0, width: 200, height: HEADER + 3 * ROW },
    { id: 'runs', x: 0, y: 180, width: 200, height: HEADER + 2 * ROW },
  ],
  edges: [
    // Both ends on the right side of two cards in one column.
    {
      source: 'jobs',
      target: 'runs',
      sourceSide: 'right',
      targetSide: 'right',
      sourceAt: field(1),
      targetAt: field(0),
    },
  ],
});
```

Both ends can be on the same side, in one column or in two. Several lines can leave one row:
they share the port and fan out from it.

### Never cross a box

By default a line that finds no clear way still comes back, `blocked: true`, as a fallback line
that can cross boxes. Set `routing: { avoidNodes: 'strict' }` when no line may cross a node. Then a
blocked line has no `points`, an empty `path` and no `label`, and the host decides what to draw,
such as a mark on the card. A line that would run through a node, its rounded corners
included, is blocked too. Every blocked
line lists the nodes its fallback runs through in `crosses`. Group borders are not nodes: lines
still cross them.

### Router-only entry

`@draftably/runtime/route` exports `route` and its types without `layout`, the file language or a
layout engine. It is about 102 KB minified (43 KB gzip), against the whole graph entry's compiler,
fonts and icons. It runs synchronously, with no DOM and no worker.

```ts
import { route } from '@draftably/runtime/route';
```

### Same input, same lines

`route` and `layout` have no randomness and no time limit. The same input always draws the same
lines. `quality: 'auto'` chooses `full` or `quick` from the number of lines and how often the quick
lines conflict, never from time. Pass `quality: 'full'` or `'quick'` to pin it anyway.

### Time

`pnpm bench:route` routes schema-like drawings: 30 cards in five fixed columns, lines from row to
row and from header to header. On a laptop, with a warm engine:

| Lines | `quick` | `full` |
| ----- | ------- | ------ |
| 10    | 13 ms   | 50 ms  |
| 30    | 75 ms   | 530 ms |
| 60    | 370 ms  | 3.1 s  |

`full` grows with lines times conflicts. For a drawing that reroutes as the user works, use
`quick` above about 20 lines, or route off the main thread.

## Synchronous layout

`layoutSync` is `layout` without a promise. The dagre and Cytoscape drop-ins use it. It cannot
run `engine:` arrangements or `fit`; use `layout` for those.

## Routing quality

The router can repair crossings and even out lanes after it routes each line. That pass costs
time that grows with the number of lines and how often they cross.

| `routing.quality` | Effect                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| `auto`            | The default. Routes each line once, then repairs the drawing when that will stay fast. |
| `full`            | Always repairs. Use it for a final export, or when time does not matter.               |
| `quick`           | Never repairs. Lines can cross more often on a dense graph.                            |

With `auto`, a tree of 100 nodes, or a graph of 100 nodes and 127 lines, lays out in about 20 ms
on a laptop. A large graph that flows one way gets planned lanes, so `full` adds little time and
crosses no fewer lines there. A tangled graph, whose lines skip across many ranks, routes each line
with a slower search: a random graph of 200 nodes and 260 lines takes about 2 seconds with `auto`.

## Errors and warnings

`layout` and `route` throw on input they cannot draw, with a message that names the object:
`Node "a" refers to unknown id "nope".` or `Duplicate node or group id "a".` A setting outside its
range throws with the range, such as `Expected gap from 8 to 300; got 500.`

Problems that still draw are in `warnings`.

## Run it off the main thread

Layout and routing run on the calling thread. A tangled graph of a few hundred nodes can take seconds. In a
browser, call `layout` from a Web Worker when your page must stay responsive while it runs. The
input and output are plain data, so they cross `postMessage` unchanged.
