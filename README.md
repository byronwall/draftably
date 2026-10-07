# Diagram Studio

A diagram editor that runs entirely in the browser. Draw a diagram, improve its layout in small
undoable passes, compare layout and routing candidates side by side, scrub through recorded layout
steps, and repair small areas with a layout brush.

Built with SolidJS, TypeScript and Vite. The current diagram saves to the browser; export JSON or
editable SVG to keep a portable copy. There is no server.

## Develop

Use Node 22.21 or later and pnpm 11.

```sh
pnpm install
pnpm dev
```

| Script              | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Start the dev server.                                |
| `pnpm build`        | Typecheck and build the static site into `dist/`.    |
| `pnpm preview`      | Serve the production build.                          |
| `pnpm typecheck`    | Run TypeScript.                                      |
| `pnpm test`         | Run the unit tests and the engine regression suites. |
| `pnpm test:unit`    | Run the Vitest unit tests only.                      |
| `pnpm test:engines` | Run the layout, brush and engine parity suites.      |
| `pnpm format`       | Format with Prettier.                                |

`pnpm build` writes a static site. Publish `dist/` as is; the computation worker sits in
`dist/assets/`. Browser saves belong to the site's origin, so export a diagram before moving hosts.

## Use the editor

| Action                          | Control                                          |
| ------------------------------- | ------------------------------------------------ |
| Create connected steps          | Press **N**, type a title, then press **Tab**.   |
| Improve the current arrangement | Press **L**.                                     |
| Preview a full rebuild          | Press **Shift+L**.                               |
| Compare layouts and routing     | Select **Compare**, or press **Alt+E**.          |
| Inspect recorded layout steps   | Select **Timeline**, or press **Alt+T**.         |
| Adjust a local area             | Press **W** for the layout brush.                |
| Return to Edit                  | Press **Escape** until previews and tools close. |
| Open help                       | Press **?**.                                     |

Comparison candidates all start from the same diagram. Apply one to keep it; Undo restores the
starting diagram. To repair one area, bookmark an early timeline step, keep a later step with
**Keep & brush**, then brush the area back toward the bookmark.

## Project layout

```
src/
  model/       Typed document, graph queries, geometry, labels, routing and edit operations
  state/       Solid stores: document + history, editor, layout, timeline/brush, comparison
  components/  Toolbar, panels, menus, dialogs, canvas scene and comparison views
  engines/     Layout, routing, comparison and brush engines (plain JS with type declarations)
  workers/     The worker that runs engine computations off the main thread
  samples/     Example diagrams shown in the File menu
tests/         Vitest unit tests and the engine regression scripts
reference/v7/  The original release, used by the engine parity test
```

See [Architecture](docs/ARCHITECTURE.md) for how the pieces fit together and
[Checks](docs/CHECKS.md) for what is tested. [Source record](docs/IMPORT.md) describes where the
original release came from; its product notes live in [reference/v7/docs](reference/v7/docs).
