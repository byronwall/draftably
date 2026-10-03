# Application structure

The current app uses SolidJS, TypeScript, Vite, and native JavaScript modules.
It builds to a static `dist/` folder. It has no application server.

## Interface and controllers

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Solid toolbar, canvas, panels, comparison dialog, and application lifecycle. |
| `src/controller-context.ts` | Controller interfaces, listener ownership, timers, and disposal. |
| `src/editor.js` | Committed document, selection, history, editing, SVG rendering, files, and layout actions. |
| `src/explorer.js` | Comparison candidates, grid and overlay presentation, cameras, and Apply. |
| `src/sculpt.js` | Timeline, bookmarks, brush strokes, restore sources, and local holds. |
| `src/document-model.js` | Document creation, validation, normalization, and existing file migration. |
| `src/editor-static.js` | Icons, colors, and shape definitions. |
| `src/sample-catalog.js` | Built-in example data and labels. |
| `src/styles.css` | The retained v7 appearance and responsive rules. |

Solid owns the shell and its lifetime. The existing JavaScript controllers
update the SVG scene and dynamic controls. This keeps the original interaction
rules while separating the application from the standalone HTML build.

The Solid mount loads the editor before the comparison and brush controllers.
Startup errors appear in an alert. Cleanup removes listeners, stops timers and
workers, disconnects the comparison observer, and saves committed data.

The editor exposes `window.diagramStudio` for the existing programmatic API.
Internal feature calls use module imports and the controller context.

## Computation

`src/engines/` contains four independent engine modules:

- Layout: the 11 placement algorithms and their constraints.
- Routing: ports, obstacles, route search, and route diagnostics.
- Explorer: comparison specifications and candidate computation.
- Sculpt: recorded solver states and local brush calculations.

`src/workers/` contains TypeScript entry points for layout, comparison, and
timeline jobs. Vite emits separate worker files. The existing cancellation,
stale-result checks, and local computation fallback remain in the controllers.

## State rules

`D` is the committed diagram. `S` holds editor state and derived rendering data.
Timeline and brush previews use separate geometry. They must not become saved
diagram data until the user keeps a checkpoint or finishes a stroke.

A comparison applies its candidate as one undo entry. A timeline keeps one
checkpoint as one entry. A brush stroke keeps its local movement and holds in
one entry. Camera movement stays separate from node coordinates.

The browser stores the current diagram, interface preferences, and latest
bounded timeline separately. Local holds last for the session. JSON exports
provide portable diagram files; editable SVG also contains diagram metadata.

## Development and checks

Solid component hot replacement is disabled. Source changes reload the page so
controllers bind to a fresh DOM tree. The browser save restores committed work.

TypeScript checks the TS and TSX files. A separate binding check detects missing
names, missing exports, and writes to imported bindings in the retained
JavaScript. It does not fully check JavaScript value types.

Engine tests run against the maintained modules. The parity test loads the
original engines from `reference/v7/` and compares their results. Timing values
and recording creation times are excluded from those comparisons.

See [verification](CHECKS.md) for current results and the scope of browser checks.
