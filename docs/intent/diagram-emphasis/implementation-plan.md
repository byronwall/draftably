---
title: 'Interactive links and emphasis states — implementation plan'
slug: 'diagram-emphasis'
phase: plan
status: current
last_updated: '2026-10-26'
---

# Interactive links and emphasis states — implementation plan

## Plan at a glance

Ship links first. `href=` already reaches the model and the CLI SVG, so the first PR only makes a
link visible and makes the browser export keep it. The viewer link control follows as its own PR,
because it touches pointer handling.

Then add states as a paint layer on the existing diff styling, with one CLI flag. Multi-state
output and the viewer switcher come last, because both reuse the panel code and the state model
that the earlier PRs prove.

Each milestone is one PR with a changeset. Milestones 3–5 change the DSL, so each updates
`docs/DSL.md` and `skills/draftably/SKILL.md` in the same PR.

## Implementation strategy

- **First proof:** `pnpm draftably inspect examples/emphasis.draft --svg --state write` matches the
  plain drawing's geometry, and only focused objects keep hue.
- **Primary seam:** One treatment per object (`same | added | removed | changed | context | focus |
dim`) read by `statusPaint`, `statusSwatch`, `drawnSwatch` and `edgeInk`. Diff status and state
  combine there and nowhere else.
- **Fast local loop:** `pnpm exec vitest run tests/status.test.ts tests/dsl.test.ts`, then
  `pnpm draftably inspect <file> --svg > tmp/out.svg` and `pnpm shoot tmp/out.svg tmp/out.png`.
- **Dependencies:** none outside the repository. Browser proof uses `pnpm draftably open` on a copy
  under `tmp/`.
- **Rollback:** revert the PR. States are new lines; a file without them draws as before.

## Milestone 1: Links look like links in SVG

- Add `src/model/link.ts`: the link mark's position and size for a node rect and shape, and the
  href kind (`url`, `draft`, `path`). The canvas and the CLI both use it.
- `src/cli/svg.ts`: draw the mark; add a `<title>` with the title and target inside each `<a>`; add
  `data-id` on every object `<g>`; add one CSS rule in `<defs><style>` that thickens the outline on
  `a:hover`. Absolute URLs get `target="_blank"`.
- `src/components/scene/NodeView.tsx` and `GroupView.tsx`: draw the same mark.
- `src/lib/svg-export.ts`: wrap linked objects in `<a href>` in the copy. Today the browser export
  loses links that `inspect --svg` keeps.
- Test: one focused case in `tests/status.test.ts` or a new `tests/links.test.ts` that the CLI SVG
  holds `<a>`, `<title>` and the mark for a linked node only.

### Desired end state

`inspect --svg` of `examples/checkout.draft` with two `href=` nodes shows the mark,
the tooltip and the hover in a browser; the viewer's SVG export holds the same `<a>` elements.

## Milestone 2: The viewer opens links

- `src/components/scene/NodeView.tsx`: an open chip beside the mark on hover and selection. A plain
  click on the node still selects it (Cmd-drag zooms, so no Cmd-click).
- `src/components/Inspector.tsx`: an "Open link" row with the target.
- `src/state/launch.ts`: a `.draft` href opens in the viewer through `go`; a URL opens a new tab; a
  path opens through the answer to question 2.
- `src/components/canvas/canvas.css`: chip style and hover.

### Desired end state

in `pnpm draftably open tmp/links.draft`, each of the three href kinds opens from
the chip and from the Inspector, and a plain click still only selects. Screenshot in the PR.

## Milestone 3: Emphasis states and `--state`

- `src/dsl/syntax.ts`: `state id "label" ids…`; repeated lines with one ID append. Errors on unknown
  IDs. Store on `appearance.states` in `src/model/types.ts` and `document.ts`.
- `src/dsl/project.ts`: carry states; `translate.ts` keeps `state` lines unchanged on viewer edits.
- `src/model/status.ts`: add `focus` and `dim`; a pure `withState(doc, id)` sets each object's
  treatment, including group frames of focused members and edges between focused nodes.
- `src/model/colors.ts`: dim draws neutral; focus keeps the family. In a diff, hue stays the mark's.
- `src/cli/main.ts`: `inspect --svg --state id` and `--png`.
- Fixture `examples/emphasis.draft`; tests: geometry equal across states, treatment rules, diff +
  state.

### Desired end state

`--state write` and `--state read` draw the fixture with identical
`canonicalGeometry`, `check` reports a bad ID with its line, and the skill test passes.

## Milestone 4: All states as small multiples

- `src/cli/svg.ts`: generalize the `compare` panels from two to N in a grid chosen toward
  `aspect`, labelled with each state's name. One routing pass for all panels.
- `src/cli/main.ts`: `inspect --svg --states` (all, plus an optional plain panel per question 3).
  Error on a file with `compare`.

### Desired end state

the fixture with three states draws one SVG whose panels align object for object;
`pnpm shoot` sheet attached to the PR.

## Milestone 5: The viewer switches states

- `src/state/ui.ts`: `activeState`, mirrored to `?state=` in `launch.ts`.
- New `src/components/canvas/StateBar.tsx`: chips for "All" and each state; `[` and `]` in
  `src/state/keyboard.ts`. The canvas applies `withState` before drawing.
- Grid view: read-only panels through `src/model/static-scene.ts`, like comparison candidates.
- `src/state/debug-api.ts`: expose the active state for browser proofs.

### Desired end state

switching states changes paint only (no node moves in `window.diagramStudio`), the
URL reloads into the same state, and edits still save. Screenshots in the PR.

## Below the cut line

Viewer authoring of states, overlays, multi-file boards, tags, per-state captions and playback,
persisting `edge.emphasis`, and per-state camera. No change to layout or routing.

## Open work in flight

PR 28 (rich node content plan) adds title icons to `NodeView.tsx`. The link mark must sit at the
top-right so it does not collide with a left title icon. No open PR touches `status.ts` or
`src/cli/svg.ts` today; recheck before milestone 3.
