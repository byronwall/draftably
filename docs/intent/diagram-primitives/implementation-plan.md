---
title: 'Diagram primitives — implementation plan'
slug: 'diagram-primitives'
phase: plan
status: current
last_updated: '2026-10-26'
---

# Diagram primitives — implementation plan

## Plan at a glance

Ship the `cells` recipe in five PRs, smallest useful first:

1. **Sequences**: one row of touching cells, and lines that end on one cell.
2. **Tables**: `columns=`, `direction=down`, `span=`, shared column widths.
3. **Byte layouts**: `unit=`, `ruler=`, split fields, `span=var`.
4. **Image cells**: an image node from PR #28 sits in a cell. Waits for PR #28's milestone 1.
5. **Viewer editing of cells**: drag to reorder, inspector span. Optional.

The first PR carries the two real risks: touching geometry through the compiler, and routing
into one cell. Tables and bytes then change only width rules and drawing. Each PR updates
`docs/DSL.md`, `skills/draftably/SKILL.md`, adds one example and a changeset, as the repository
requires for language changes.

## Implementation strategy

- **Model:** Add `'cells'` to `Algorithm` in `src/dsl/syntax.ts`. `ModelLayout` gains
  `columns`, `unit`, `ruler`. `ModelObject` gains `span` (a number or `'var'`). No new
  statement and no new object type.
- **Geometry:** A new pure function in `src/dsl/cells.ts` takes the cells' titles, spans and
  sizes and returns cell rectangles and the group size. `compile.ts` calls it where it runs the
  `row` and `column` recipes, and treats the group as a fixed block afterwards. Cell titles use
  `titleArea` and `wrapTitle` from `src/model/labels.ts`, so the CLI and viewer agree.
- **Drawing:** `GroupView.tsx` and `src/cli/svg.ts` draw a cell group as one outline with its
  title in a filled header band inside it. A `shape=marker` node draws as a bold divider on
  the seam, with its label just outside the outline. `NodeView.tsx` draws a cell as a square-cornered rectangle that shares borders.
  Keep one flag on the projected group (`cells: true`) in `src/dsl/project.ts`.
- **Routing:** `src/model/routes.ts` gives a cell only the sides on the group's outline, and
  marks the cell group as an obstacle for every other line. A line to an inner cell (M2) is
  the one exception: it enters the outline, runs over the cells, and ends with a dot. Check the existing
  `routing-group-borders` and `open-port` tests first; they show how group interiors behave now.
- **Engines:** The root engines already keep a group's own `layout` recipe. Prove in M1 that
  `compound-flow` and `layered` move a cell group as one block. Do not change `src/engines/`;
  `pnpm test:engines` compares them with the original release.
- **Viewer edits:** In `src/dsl/translate.ts`, a drag on a cell moves its group. A resize on a
  cell writes `size` for the cell. Reorder waits for M5.

### Local loop

`pnpm draftably inspect examples/<file>.draft --svg > tmp/x.svg` and
`pnpm shoot tmp/x.svg tmp/x.png` give a picture in seconds. `pnpm check:fast` runs the unit
tests. No external service, data store or credential is involved. Browser proof uses
`pnpm draftably open examples/<file>.draft` and `window.diagramStudio` geometry.

## Milestone 1: Sequences of touching cells

- `src/dsl/syntax.ts`: accept `layout g cells`, `span=` on nodes inside it, and
  `shape=marker` for a cell. Report `span=` or `marker` outside a cell group.
- `src/dsl/cells.ts` (new): one-row and one-column placement, equal row heights.
- `src/dsl/compile.ts`: call the cells recipe; size the group to its cells with no padding.
- `src/dsl/project.ts`, `src/model/types.ts`: carry the `cells` flag to the scene.
- `src/components/scene/GroupView.tsx`, `NodeView.tsx`, `src/cli/svg.ts`: shared borders,
  outline, header band, marker divider.
- `src/model/routes.ts`: outer-side ports, a solid block, and lines that end at a marker's
  label.
- `src/dsl/translate.ts`: a cell drag moves the group.
- `examples/prompt-request.draft`, `docs/DSL.md`, `skills/draftably/SKILL.md`, a changeset.
- Tests: a few cases in `tests/dsl.test.ts` (touching rectangles, equal heights) and one
  routing case (line ends at the marker, crosses no cell).

### Desired end state

- `inspect --svg` of `examples/prompt-request.draft` shows touching cells, the title
  in the header band, and a line that ends at the `cp` marker on its seam. The viewer draws the same geometry. The example also compiles under
  `layout root engine=layered`. `pnpm check` passes.

## Milestone 2: Tables

- `src/dsl/cells.ts`: `columns=N` grid in row order, `span=N`, column width is the widest cell,
  row height is the tallest cell.
- `src/dsl/syntax.ts`: `columns=` and `direction=` on the cells layout.
- Schema entities first: `columns=2` gives name and type cells; a line leaves the left or right
  cell of its row. General grids with header rows and spans follow in the same PR.
- `src/model/routes.ts`: a line to an inner cell crosses the cells in its way, drawn on top,
  and ends with a dot at the target cell's edge. A cell with a free side always uses it.
- `examples/billing-schema.draft`: two entity tables and foreign-key lines between rows.
- Docs, skill, changeset; one test for column widths with a spanning cell.

### Desired end state

- the schema example draws aligned columns, and each foreign-key line ends on its
  row. A line to the middle cell of a 3×3 grid crosses one cell and ends with a dot.

## Milestone 3: Byte layouts

- `src/dsl/cells.ts`: with `unit=`, each unit has a fixed width; `span=` counts units; a field
  that crosses a row end splits into two pieces; `span=var` fills the row with broken ends.
- `src/dsl/syntax.ts`: `unit=byte|bit`, `ruler=offset|bits|none`.
- `GroupView.tsx` and `src/cli/svg.ts`: the ruler between the header band and the
  first row, in the annotation font.
- `examples/png-chunk.draft` and `examples/tcp-header.draft`.
- Docs, skill, changeset; one test for a field split across rows.

### Desired end state

- the TCP header matches the RFC 9293 figure field for field, and the PNG chunk
  shows a variable data field between fixed fields.

## Milestone 4: Image cells (after PR #28 milestone 1)

- Allow `shape=image` nodes as cells. The cell takes the image node's `size`.
- In the viewer, open the image from the cell with PR #28's inspector once it exists.
- One example: a sequence of screenshots for a flow.

### Desired end state

- a cell group with two image cells draws the same in the CLI and the viewer, and
  static exports embed a preview capped at the cell's size, as PR #28 plans.

## Milestone 5: Viewer editing of cells

- Drag a cell along its group to write `order g …`. Inspector field for `span=`.
- Browser proof with real pointer input; follow `debug-ui-event-flow` if click and drag clash.

### Desired end state

- reordering a cell in the viewer writes one `order` line and the file reopens the
  same.

## Below the cut line

- A `.dot` importer (Byron: cover DOT's features, do not import files).
- Row spans, per-cell text alignment, hex offsets per row, gap markers.
- Cell contents beyond one title: lists, mixed fonts, nested tables.
- Bit-level rulers with custom start offsets, hex dumps, endianness marks.

## Work in flight

Open PR #28 touches only planning files, so it does not collide. Sibling sessions on
`plan-grouping` and `fold-small` may change `compile.ts` group sizing and folding. Start M1
after those merge, or rebase M1 on them; `cells.ts` keeps the new code apart to make that easy.

## Open spikes

1. **Routing into a cell (M1, M2).** Output: can `routes.ts` end a line at a marker or mid-row
   cell, and cross cells to an inner cell, without a new router mode? Fallback: end the routed
   line at the outline over the target and draw the last stretch straight to it.
2. **Engines and fixed blocks (M1).** Output: do `compound-flow` and `layered` keep a cell
   group's inner positions? Fallback: compile lays cells out after the engine, inside the
   group's final rectangle.
