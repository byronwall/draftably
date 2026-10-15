# Checks

## Automated

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

| Suite                          | What it covers                                                                                                                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc` (strict, no unused code) | All application code, tests and config.                                                                                                                                                                                                                                             |
| `tests/model.test.ts` (Vitest) | Examples load and round-trip through `normalize`; validation and v1 migration; connected shapes, inserted steps, wrap/ungroup, delete with and without contents, collapse, container resize limits, align, build from a list, copy/paste, layout intent; comparison camera fitting. |
| `tests/dsl.test.ts` (Vitest)   | `.meld` parsing errors with line numbers, formatting that keeps comments, nested layout, pins across content additions, relative placement, relaxed-preference and group-size diagnostics, projection into a valid editor document, and repeatable canonical geometry.              |
| `tests/engine-layout.mjs`      | Layout and routing regressions: 195 assertions and 55 broad cases.                                                                                                                                                                                                                  |
| `tests/engine-sculpt.mjs`      | Timeline and brush regressions: 55 checks.                                                                                                                                                                                                                                          |
| `tests/engine-parity.ts`       | 320 comparisons of the engines against the original release in `reference/v7/` across 13 examples and 11 algorithms. Timing fields are excluded.                                                                                                                                    |

Engine reports are written to the ignored `tmp/verification-current/` folder.

## Browser

The SolidJS rewrite was exercised in Chrome (the Claude desktop browser pane) at 1440 × 900 and
820 × 700, in light and dark themes, through real pointer and keyboard input plus
`window.diagramStudio` for state inspection:

- Startup, restore from browser storage, and examples loaded through the File menu with confirmation.
- Shape drag with snapping, dropping into and out of containers, undo and redo.
- **N**, typing, **Tab** to extend, **Enter** to commit; quick-add buttons; Connect tool with preview.
- Drawing and naming a container, moving it with its contents, collapsing it.
- Inspector edits: label, color, shape, position, pin; edge bends by double-click.
- Copy, paste, paste-a-list into Build from a list, object search.
- Layout pass, previewed rebuild with discard, layout lab (**Alt+L**), routing menu, Reroute.
- Compare: six candidates, grid fitting, overlay with layers, Apply and Undo.
- Timeline: record, scrub, Keep & brush; brush hover preview and a committed stroke.
- Editable SVG export and re-import, PNG conversion.

## Not covered

- Native file pickers and drag-and-drop of files (the import code paths are shared with paste and
  were exercised that way).
- Safari, Firefox, touch input and trackpad gestures.
- A full accessibility audit.

The layout engines are heuristics: they can leave crossings or ordering conflicts and do not
promise a globally optimal drawing.
