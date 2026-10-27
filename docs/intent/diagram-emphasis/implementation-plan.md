---
title: 'Interactive links and emphasis states — implementation plan'
slug: 'diagram-emphasis'
phase: plan
status: current
last_updated: '2026-10-26'
---

# Interactive links and emphasis states — implementation plan

## Plan at a glance

Ship viewer links first, because Byron wants a good viewer experience with little work. `href=`
already reaches the model, so the first PR adds the mark, the open chip and path resolution. The
`config` line and `check` help follow. Static SVG links come third as a first guess.

Then add states as a paint layer on the existing diff styling, with `--state`. CLI small multiples
and the viewer switcher come last, because both reuse the panel code and the state model.

Each milestone is one PR with a changeset. Milestones that change the DSL (2, 4, 5) update
`docs/DSL.md` and `skills/draftably/SKILL.md` in the same PR.

## Implementation strategy

- **First proof:** a root-relative `path:42` link in a `.draft` under `docs/` opens the editor at
  the line from the viewer.
- **Link seam:** `src/model/link.ts` holds pure functions: the href kind (`url`, `draft`, `file`),
  `path:line:col` parsing, base resolution and the editor URL. The viewer, `check` and the CLI use
  them.
- **Paint seam:** one treatment per object (`same | added | removed | changed | context | focus |
dim`) read by `statusPaint`, `statusSwatch`, `drawnSwatch` and `edgeInk`.
- **Fast local loop:** `pnpm exec vitest run tests/links.test.ts tests/status.test.ts
tests/dsl.test.ts`, then `pnpm draftably open <file>` or `inspect --svg` and `pnpm shoot`.
- **Dependencies:** none outside the repository. The editor is reached by URL scheme only.
- **Rollback:** revert the PR. Files without the new lines draw as before.

## Milestone 1: The viewer opens links

- `src/model/link.ts`: kind, `path:line:col`, editor URL (`vscode://file/<abs>:42:5`; scheme from
  the editor setting, VS Code by default).
- `src/server/file-session.ts`: return the git root of the open `.draft` (walk up to `.git`, else
  its folder) with the session.
- `NodeView.tsx` and `GroupView.tsx`: the ↗ mark at the top-right; the open chip on hover and
  selection. A plain click still selects (Cmd-drag zooms, so no Cmd-click).
- `Inspector.tsx`: "Open link" with the resolved target. `launch.ts`: a `.draft` opens through
  `go`; a URL opens in a new tab as written.
- An example with no server shows file links as text, not as a broken open.

### Desired end state

In `pnpm draftably open` on a fixture under `docs/`, a URL, a `.draft` and a `path:42` link each
open from the chip and the Inspector, and a plain click only selects. Screenshot in the PR.

## Milestone 2: The config line and agent help

- `src/dsl/syntax.ts`: `config key=value …`. Several keys on one line or one per line; a duplicate
  key warns and the last one wins. Keys: `link-base`, `editor`.
- `src/cli/main.ts` `check`: warn on a relative file href that does not exist at the base. Suggest
  the path from the `.draft`'s folder, or a unique filename or suffix match in the repo. Never
  change the link.
- `skills/draftably/SKILL.md`: add `href` for real code and files, write paths from the repo root,
  use `path:line`, and use `config link-base` when the root guess is wrong.

### Desired end state

`check` prints the warning and suggestion with the line for a wrong path, `config editor=cursor`
opens Cursor, and the skill test passes.

## Milestone 3: Links in static SVG

- `src/cli/svg.ts`: the same mark; `<title>` with the target in each `<a>`; `data-id` on each object;
  one `a:hover` CSS rule. File hrefs become relative to the `.draft`'s folder; URLs stay as written.
- `src/lib/svg-export.ts`: wrap linked objects in `<a>` in the copy.

### Desired end state

An SVG saved beside its `.draft` opens its links from a browser, with hover and tooltip. The
viewer's SVG export holds the same `<a>` elements.

## Milestone 4: Emphasis states and `--state`

- `src/dsl/syntax.ts`: `state id "label" ids… rest=dim|plain`; repeated lines append. Unknown IDs
  are errors. Store on `appearance.states` (`types.ts`, `document.ts`, `project.ts`); `translate.ts`
  keeps the lines through viewer edits.
- `src/model/status.ts`: add `focus` and `dim`; dim uses the `.` context look. A pure
  `withState(doc, id)` sets treatments, keeps frames of focused members plain, and focuses edges
  between focused nodes. `src/model/colors.ts` keeps hue for focus and, in a diff, the mark's hue.
- `src/cli/main.ts`: `inspect --svg --state id` and `--png`. Fixture `examples/emphasis.draft`.

### Desired end state

Every state of the fixture has the same `canonicalGeometry` as the plain drawing, `check` reports a
bad ID with its line, and `rest=plain` keeps the rest unfaded.

## Milestone 5: All states as small multiples

- `src/cli/svg.ts`: generalize the `compare` panels from two to N, in a grid toward `aspect`, each
  labelled with its state. One routing pass. `--states` draws states only; error with `compare`.

### Desired end state

A three-state fixture draws one SVG whose panels align object for object; `pnpm shoot` sheet in the
PR.

## Milestone 6: The viewer switches states

- New `src/components/canvas/StateBar.tsx`: chips top-center for All, each state and Grid; hidden
  without states. `[` and `]` in `keyboard.ts` step in file order.
- `src/state/ui.ts` `activeState`, mirrored to `?state=` in `launch.ts`; never written to the file.
- Grid: read-only panels through `src/model/static-scene.ts`. `debug-api.ts` exposes the state.

### Desired end state

Switching changes paint only (no moves in `window.diagramStudio`), reload keeps the state, and
edits still save. Screenshots in the PR.

## Below the cut line

Multi-file sheets and boards, overlays, editing states in the viewer, captions and playback, tags,
per-state camera, a project-wide config file, and rewriting SVG links for any output folder.

## Open work in flight

PR 28 (rich node content plan) adds title icons on the left of `NodeView.tsx`; the link mark sits
top-right. No open PR touches `status.ts` or `src/cli/svg.ts` today; recheck before milestone 3.
