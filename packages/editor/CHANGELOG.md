# @draftably/editor

## 0.3.0

### Minor Changes

- f170a08: A large `flow` (40 or more forward lines) now lays out and routes like a layered layout: each line that skips ranks gets its own corridor between the boxes of the ranks it passes, and every forward line follows a planned route, out of the bottom (or right) of its source and along its own track in each gap. `layout()` on a new 100-node graph with 127 lines takes about 20 ms instead of 280 ms, with fewer crossings and bends, and full routing of the same graph about 0.1 s instead of 2.6 s. A flow whose ranks cross more than twice per line keeps the router's searched routes, which cross less there. Smaller diagrams draw as before.

### Patch Changes

- 2f625b2: Route lines faster, with the same routes as before. The router skips line pairs that are too far apart to meet, compares segments as plain numbers, scores a candidate against other lines only while it can still win, and counts totals once per pass. A 100-node chain routes about 7 times faster, a 60-node tree and a 100-node DAG about 5 times faster, and a node with 16 children about 2.4 times faster.
- 1ff30f9: The router skips detours that must cross other lines sooner. It counts the crossings a detour cannot avoid before it scores the detour, so `layout()` on a new 100-node graph with 127 lines takes about 30% less time again, with the same lines.
- e8754d1: The router draws the same lines faster. It tries candidate paths best first, builds a side's detours only when they can still win, and stops scoring a path once it has lost. `layout()` on a new 100-node graph with 127 lines takes about 40% less time.
- 3eba208: Route fresh graphs faster with the same drawings. The router reuses crossing bounds for each port pair and counts crossings once per search grid line.

## 0.2.0

### Minor Changes

- 13e3bd5: Add `@draftably/editor`: the diagram editor as `mountEditor()` and a `<draft-editor>` element. Drag boxes and lines, and get the `.draft` source back on every edit. Any number of editors can share a page. Each framework package adds `DraftEditor` under its `/editor` subpath.

### Patch Changes

- fe01bb5: The guides for every package moved to draftably.dev/docs, and each package README now links there. The Emphasis states page draws each state live.
- ba5f518: A line that runs between two sides, such as a container wall and a box or two container walls, now runs midway between them. Before, it could hug one side. Two lines on one side of a box, pill or circle now sit evenly about the side's middle more often, also when one of them is a straight line to another box.
- 81e76a8: `@draftably/editor` now holds only the editable canvas. It no longer bundles the Mermaid and D2 importers, the import dialogs or the app's panel state, so the package drops from about 20 MB to 1.7 MB unpacked. Importing it no longer reads the window size or writes to localStorage. A mounted editor keeps its canvas shortcuts; app-only shortcuts, such as the command palette, stay in the app.
