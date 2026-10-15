# Architecture

Diagram Studio is a SolidJS single-page app. All state lives in the browser; computation-heavy work
runs in a Web Worker. The code is split into three layers, each depending only on the ones below it.

```
components/  →  state/  →  model/  →  engines/
                   ↘  dsl/  ↗
cli/  →  dsl/
```

## model/ — pure data and operations

Plain TypeScript with no DOM or Solid dependencies, so it is unit tested directly.

| File              | Responsibility                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `types.ts`        | The `Diagram` document and everything in it.                                                                      |
| `document.ts`     | `normalize` validates any input (files, storage, clipboard) and migrates v1 files.                                |
| `graph.ts`        | Lookups and hierarchy: children, ancestors, collapsed containers, selection roots.                                |
| `edits.ts`        | Every document change: add, connect, wrap, delete, align, paste, intent, … Each mutates the document it is given. |
| `geometry.ts`     | Rectangles, rounding and SVG path helpers.                                                                        |
| `labels.ts`       | Text measurement, wrapping and label placement.                                                                   |
| `routes.ts`       | Ports, edge-label placement and the call into the routing engine.                                                 |
| `static-scene.ts` | A read-only scene for comparison candidates.                                                                      |
| `samples.ts`      | The example catalog backed by `src/samples/*.json`.                                                               |

## state/ — reactive application state

Each module owns one concern and exposes signals plus the actions that change them.

| File                        | Responsibility                                                              |
| --------------------------- | --------------------------------------------------------------------------- |
| `document.ts`               | The committed diagram store, selection, undo/redo and browser persistence.  |
| `editor.ts`                 | Tool, drag feedback, inline editing and camera helpers. Never saved.        |
| `scene.ts`                  | Derived drawing data: visible graph, rectangles and memoized routes.        |
| `actions.ts`                | Editor operations used by the UI; each wraps a model edit in one undo step. |
| `commands.ts`               | Named commands shared by toolbar, menus and shortcuts.                      |
| `keyboard.ts`, `pointer.ts` | Global shortcuts, clipboard and canvas gestures.                            |
| `layout.ts`                 | Layout passes, previews, the layout lab's settings and checkpoints.         |
| `sculpt.ts`                 | The layout timeline and the layout brush.                                   |
| `comparison.ts`             | Compare: candidates, cameras, overlay layers and Apply.                     |
| `files.ts`                  | Import, image embedding and JSON / SVG / PNG export.                        |
| `ui.ts`, `toast.ts`         | Panels, menus, dialogs and status messages.                                 |

### Rules

- **Every saved change is one undo step.** `transact(label, fn)` snapshots the document, applies
  `fn` through Solid's `produce`, and records the step only if something changed.
- **Previews never touch the document.** Layout animation, timeline scrubbing and brush strokes
  draw from temporary geometry in `scene.ts`. Keeping a step or finishing a stroke commits it.
- **Finish pending work before an edit.** Modules register `onBeforeEdit` handlers to commit an
  inline label, accept a layout preview, close a timeline or finish a drag.
- **Camera movement is not an edit.** It saves with the document but never creates undo steps.

## dsl/ and cli/ — diagram files

`dsl/` reads, formats and compiles `.draft` files (see [Diagram files](DSL.md)). It is pure
TypeScript shared by the browser and the command line.

| File              | Responsibility                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `syntax.ts`       | Source lines with comments, the formatter, and the validated model.                         |
| `compile.ts`      | Layout recipes and refinements for one fixed render context; diagnostics with lines.        |
| `translate.ts`    | One committed editor edit as source changes: declarations, `near`/`pin`/`size` refinements. |
| `source-edits.ts` | Helpers that add, change and remove single statements.                                      |
| `project.ts`      | A compiled scene as an editor `Diagram`, and the canonical geometry the CLI prints.         |

`server/file-session.ts` owns one open file: it serves the source with a content revision,
watches its folder (so rename-based saves are seen), streams changes as server-sent events, and
writes saves atomically. A save based on an older revision is refused with 409, and invalid
source with 422. `state/file-session.ts` is the browser side: it detects a session at startup,
switches browser storage off, and projects each valid revision into the document. While a file is
open, `commit` in `state/document.ts` hands every edit to the session, which translates it, shows
the recompiled result and saves it; undo and redo walk source versions instead of snapshots.

`cli/` is the `pnpm draftably` command. `scripts/draftably.mjs` rebuilds it with `vite build --ssr` when a
source file is newer than `dist-cli/`.

## components/ — the interface

Components read state and call actions; they hold only local UI state. The canvas renders the
diagram declaratively with `scene/NodeView`, `GroupView` and `EdgeView`. The same components draw
comparison candidates through `scene/StaticScene`, so the editor and Compare always match.

Styles are plain CSS. Design tokens and shared controls are in `styles/app.css`; each larger
component imports its own stylesheet. Light and dark themes switch through `data-theme` on the
document element.

## engines/ and workers/

The layout, routing, comparison and brush engines are self-contained, deterministic JavaScript
from the original release, with `.d.ts` files describing their public APIs. `pnpm test:engines`
compares their output with the original release in `reference/v7/` across all examples.

`lib/engine-tasks.ts` runs layout, comparison candidates and timelines in a single module worker
(`workers/engine.worker.ts`). Tasks can be cancelled; if the browser blocks workers they run on
the main thread instead.

## Storage

| Key                              | Contents                                        |
| -------------------------------- | ----------------------------------------------- |
| `diagram-studio-v5`              | The current diagram (older keys are read once). |
| `diagram-studio-v5-ui`           | Which side panels are open.                     |
| `diagram-studio-v7-last-journey` | The most recent layout timeline.                |

Brush holds and the clipboard last for the session only.

## Scripting

`window.diagramStudio` exposes a small API (get/set, layout, compare, timeline, brush, export,
diagnostics) for automated browser checks and the console. The app does not use it.
