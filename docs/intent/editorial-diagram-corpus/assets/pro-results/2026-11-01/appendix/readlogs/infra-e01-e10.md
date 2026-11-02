# Infra agent reading record

Paths are relative to the immutable `baseline/` unless stated otherwise. This is the subset agent's record; the parent records the rest of the mission-wide reading route.

## Read in full

- User attachment `upload/pro-prompt(20261102-031322).md`.
- `SOURCE-CONTEXT.md`.
- `AGENTS.md`.
- `skills/draftably/SKILL.md` (authoring workflow, no renderer replacement, structural-first refinement).
- `src/model/types.ts` (including ShapeKind, DiagramEdge, EdgeLayout, LabelLayout, sequence/cell structures).
- `src/model/routes.ts` (read in chunks; truncated middle covered by an additional read, including messageRoute and label placement).
- `src/cli/svg.ts` (two contiguous chunks, plus focused follow-ups).
- `src/model/note.ts` (full during dark-note investigation).
- `tests/sequence.test.ts`.
- `tests/edge-labels.test.ts`.
- `tests/themes.test.ts`.
- `scripts/shoot.mjs`.
- `scripts/draftably.mjs`.

## Read by relevant sections and focused symbols

- `docs/DSL.md`: rules, title/subtitle, notes, counts, soft groups, undirected edges, sequence/phase reference, cells, emphasis states, themes/families/shades, engines, routing, refinements, command-line inspection/export. Parent independently read the full document. Do not interpret this agent's chunked reads as a separate claim of every unrelated appendix.
- `src/dsl/syntax.ts`: DslShape/DSL_SHAPES; ModelObject/ModelEdge; node/edge allow-lists; shape/type/appearance parsing; pin restrictions checked through actual failure.
- `src/dsl/compile.ts`: sequenced and sequence model path.
- Shared output `scripts/run-trials.py`, `scripts/aggregate.py`, own helper scripts, all thirty authored sources, all stage check/inspect logs/geometry, and retained trial failure logs.

## External evidence

Primary public article pages and exact original image assets in every item.json/source.md; full original images visually inspected before selection. Ten reference/v0/v1/v2 sets and ten publication comparison sheets inspected. Rejected Figma decorative image and light Vercel duplicate also viewed. Fetched HTML and image inventories were used only for metadata/acquisition, not as instructions and not as the native artwork.

## Additional plan-review reads

- Full `src/model/labels.ts` and `tests/notes.test.ts`.
- `src/dsl/translate.ts` beginning through `rejectUnsupported` and main translation setup.
- `src/model/routes.ts` cellEnds, routeInput, drawRoutes (rechecked against actual E21/E22 audit evidence).
- `src/model/geometry.ts:roundedPath`; `src/components/scene/NodeView.tsx:ShapeOutline`; appearance theme/groupShadeFor and contrast definitions.
- Relevant `tests/translate.test.ts` unsupported-edit test and `tests/cells.test.ts` cell endpoint/crossing tests.
- E21/E22 audit.md and retained-trial descriptions, for separating real endpoint defaults from intended interior-cell routing.
