# @draftably/runtime

## 0.3.0

### Minor Changes

- 544be76: `layout` and `route` from `@draftably/runtime/graph` take React Flow and Svelte Flow graphs under `reactFlow` and `svelteFlow`, and return them in the same shape: nodes with positions relative to their group and sizes, edges with routed paths and label boxes in `data.draftably`. `route` routes the lines again where the nodes are now, so lines follow a dragged node.
- da6799e: Add `@draftably/runtime/graph`: lay out and route a graph your app draws. `layout()` takes plain nodes, groups and edges with any IDs, and returns each box's position and size, each edge's routed line and label box, and the equal `.draft` file. `route()` routes lines between boxes your app placed. `routing.quality` chooses between full and quick routing; `auto` keeps large graphs near a second.
- dbf251a: Add drop-ins for other layout libraries to `@draftably/runtime/graph`: `DraftablyELK` takes and returns ELK JSON like elkjs's `ELK` class, `dagreLayout(g)` lays out a graphlib graph in place like `dagre.layout(g)`, and `draftablyLayout` registers a Cytoscape.js layout. `layoutSync` lays out without a promise, and `fold: 'never'` keeps a long drawing in one row.
- f170a08: A large `flow` (40 or more forward lines) now lays out and routes like a layered layout: each line that skips ranks gets its own corridor between the boxes of the ranks it passes, and every forward line follows a planned route, out of the bottom (or right) of its source and along its own track in each gap. `layout()` on a new 100-node graph with 127 lines takes about 20 ms instead of 280 ms, with fewer crossings and bends, and full routing of the same graph about 0.1 s instead of 2.6 s. A flow whose ranks cross more than twice per line keeps the router's searched routes, which cross less there. Smaller diagrams draw as before.
- 9260ac2: `flow` lines each object up with what it connects to in the rank before, and widens a gap between ranks until each line that turns in it has its own lane. Trees and dense graphs draw with far fewer crossings and bends, and route several times faster: a 63-node tree has no crossings and lays out in about 0.3 s instead of 5 s. The router's grid search is also about a third faster, with the same routes.

### Patch Changes

- 2f625b2: Route lines faster, with the same routes as before. The router skips line pairs that are too far apart to meet, compares segments as plain numbers, scores a candidate against other lines only while it can still win, and counts totals once per pass. A 100-node chain routes about 7 times faster, a 60-node tree and a 100-node DAG about 5 times faster, and a node with 16 children about 2.4 times faster.
- 7259d8c: `flow` orders the objects in each rank so fewer lines cross. It sweeps down and up the ranks and swaps neighbours while a swap removes crossings, as layered layouts do. A 100-node graph with 127 lines now draws 77 crossings instead of 113.
- 1ff30f9: The router skips detours that must cross other lines sooner. It counts the crossings a detour cannot avoid before it scores the detour, so `layout()` on a new 100-node graph with 127 lines takes about 30% less time again, with the same lines.
- e8754d1: The router draws the same lines faster. It tries candidate paths best first, builds a side's detours only when they can still win, and stops scoring a path once it has lost. `layout()` on a new 100-node graph with 127 lines takes about 40% less time.
- 3eba208: Route fresh graphs faster with the same drawings. The router reuses crossing bounds for each port pair and counts crossings once per search grid line.
- b4a84ab: `layout({ svelteFlow })` keeps each node's CSS `style` string and takes Svelte Flow's own `Node` and `Edge` types. Before, it spread a style string into an object, and Svelte Flow lost the node's style. The `@draftably/react` README now links to the drop-in layout guide.

## 0.2.0

### Minor Changes

- 3b77f78: Add a diagram element with automatic viewer setup and cleanup
- b05bb95: Add the optional read-only viewer with an owned module worker, accessible controls, and packed React, Solid, and browser proofs.
- a0786b0: Add the portable native SVG runtime with TypeScript declarations, exact font assets, Node and browser ESM consumers, and a packed-artifact proof.
- fdb759b: The viewer's item outline is now visually hidden by default. Screen readers keep it, and it appears over the bottom of the drawing while it holds keyboard focus. Set `outline: 'visible'` in `mountViewer`, `outline="visible"` on `<draft-diagram>`, or the `outline` prop on `DraftDiagram` to keep it on screen.

### Patch Changes

- fe01bb5: The guides for every package moved to draftably.dev/docs, and each package README now links there. The Emphasis states page draws each state live.
- ba5f518: A line that runs between two sides, such as a container wall and a box or two container walls, now runs midway between them. Before, it could hug one side. Two lines on one side of a box, pill or circle now sit evenly about the side's middle more often, also when one of them is a straight line to another box.
