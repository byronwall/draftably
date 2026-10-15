# Diagram Studio

A static diagram editor built with SolidJS and Vite. Draw a diagram, compare
layout candidates, inspect a layout timeline, and adjust small areas with a
layout brush. Apply changes as single undoable edits.

The app preserves the final Diagram Studio v7 workflows. It runs in the browser
and saves the current diagram on the same browser origin. Export JSON to keep
a portable copy. No account or application server is required.

## Run

Use Node 22.21 or later and pnpm 11.9.0.

```sh
pnpm install
pnpm dev
```

## Build a static site

```sh
pnpm build
pnpm preview
```

Publish the contents of `dist/` to a static host. Keep the `assets/` folder beside
`index.html`; it includes the computation workers. The app has no server routes.
Serve the build over HTTP or HTTPS.

Browser saves belong to the site's origin. Export a diagram before moving to a
different host. JSON, editable SVG, and PNG exports remain available in the editor.

## Use the editor

| Action | Control |
| --- | --- |
| Create connected steps | Press **N**, type a title, then press **Tab**. |
| Improve the current arrangement | Press **L**. |
| Preview a full rebuild | Press **Shift+L**. |
| Compare layouts and routing | Select **Compare**, or press **Alt+E**. |
| Inspect recorded layout steps | Select **Timeline**, or press **Alt+T**. |
| Adjust a local area | Press **W** for the layout brush. |
| Return to Edit | Press **Escape** until previews and temporary tools close. |
| Open help | Press **?**. |

Comparison candidates use the same starting diagram. Switch between Grid and
Overlay, inspect a candidate, and select Apply to keep it. Undo restores the
starting diagram.

To repair one area, bookmark an early timeline step. Keep a later step with
**Keep & brush**, then restore the area toward the bookmark.

## Check

```sh
pnpm typecheck
pnpm test:app
pnpm test:engines
pnpm build
```

The application check protects comparison fitting. The engine suites include
the original layout and brush assertions. They also
compare migrated results with the original engines across all 13 examples.
Generated reports and browser captures belong in the ignored `tmp/` folder.

See [current verification](docs/CHECKS.md) for browser coverage and limits.

## Source and product history

The planned CLI uses Changesets and GitHub Actions for npm releases.
See [release setup](docs/RELEASING.md) for package activation and npm configuration.

- `src/` contains the current application, components, controllers, engines, and workers.
- `tests/` contains the engine checks and example fixtures.
- [Application structure](docs/ARCHITECTURE.md) describes the current modules and state rules.
- [Source record](docs/IMPORT.md) identifies the final ChatGPT release and its checksum.
- [v7 intent and research](reference/v7/docs/INTENT-DUMP.md) records the product decisions and research references.
- [v7 parameters](reference/v7/docs/PARAMETERS.md) describes the layout, routing, comparison, and brush controls.
- [v7 release guide](reference/v7/docs/CHANGES-v7.md) explains the timeline and local restore workflow.

`reference/v7/` preserves the complete final release. Its code map and test reports
describe that release. The production build includes only the current app.
