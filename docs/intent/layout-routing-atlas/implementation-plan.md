# Layout and routing atlas implementation plan

Deliver complete visual documentation for the reviewed 198-entry scope.
Use the [summary](summary.md), [dispositions](dispositions.md), and [current-main addendum](current-main-addendum.md).
The [preserved Pro plan](assets/pro-results/2026-11-01/implementation-plan.md) supplies detailed fixtures, file targets, and proof cases.
All original reports and companions are linked in the [asset index](assets-index.md).

## Delivery order

| Milestone                   | Concrete work                                                                                                                                                                                                                       | Acceptance and main failure mode                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1: accurate guides         | Expand the existing layout, routing, and tools reference. Add `choose-a-layout.md` and `fix-a-drawing.md` under `site/docs/pages/`; register navigation in `site/docs/content.ts`. Update the bundled skill with DSL documentation. | Readers can choose recipe, pass, refinement, or routing. Show contextual defaults, engine tradeoffs, current limits, and persistence. Avoid publishing proposed fixes as current behavior.                                 |
| M2: coverage contract       | Create a compact authored manifest for controls, states, examples, contexts, and expected warnings. Read accepted keys from real registries. Import positive fixtures separately from defect repros.                                | Every one of the 198 entries resolves to a visual or justified nonvisual recipe. Missing keys, stale source/render links, and invalid positive geometry fail clearly. Keep source, route, and rendering equality distinct. |
| M3: valid specialized input | Repair structural count validation and finite cells/sequence output in `src/dsl/syntax.ts`, `cells.ts`, and `compile.ts`. Use the isolated Pro repros as data.                                                                      | Fractional structural counts and empty sequence bands receive located diagnostics or defined finite behavior. Protect valid cells, lanes, and sequences. Define harmless ignored-input policy separately.                  |
| M4: faithful file defaults  | Repair folding serialization in `src/dsl/layout-edits.ts` and independent scope settings in `compile.ts`.                                                                                                                           | Explicit folding choices survive fresh compilation. Swapping sibling layout statements preserves geometry; legitimate ancestor inheritance remains. Test omitted and explicit defaults separately.                         |
| M5: truthful Compare        | Align source candidate capabilities, validation, effective labels, diagnostics, and fixed-port translation in `src/state/comparison.ts` and comparison controls.                                                                    | Offered experiments execute their stated changes. Releasing fixed ports changes source attributes or is unavailable. Coarse fingerprints do not claim identical rendered curves.                                           |
| M6: focused presentation    | Add a small `AtlasExample` only where ordinary examples cannot provide shared scale, selected comparisons, source differences, and lazy computation. Reuse current drawing, zoom, and Playground links.                             | Baseline and candidate share world scale. Keyboard and narrow-screen use remain clear. Opening a page does not prepare hundreds of active editors.                                                                         |
| M7: full content            | Integrate the page drafts and all 105 original visual families, four nonvisual groups, and the added directed/Arrow family. Cover recipes, engines, parameters, ports, lanes, refinements, Compare, timeline, brush, and CLI.       | Every entry and supported categorical state has a reachable explanation. Numeric examples show units, defaults, applicability, and useful samples. Keep no-effect results and exact source.                                |
| M8: bounded control choices | Add supported standoff access. Resolve the group-gap cap and ignored specialized-control policy through measured cases.                                                                                                             | Explanations match effective behavior. Any geometry change receives a focused PR, regression checks, and changeset. New cold ordering semantics remain optional research.                                                  |
| M9: integration proof       | Run source, CLI, browser, docs, skill, and release checks in the complete checkout. Record exact results and update artifacts with changed behavior.                                                                                | Verify preview, Keep/Apply, saved source, fresh compile, and reopening. Model output alone cannot prove an editor lifecycle.                                                                                               |

M1 is independently useful. M2 can proceed beside it.
M3–M5 can ship as focused fixes. M6 depends on the content and coverage contracts.
M7 completes the documentation; it need not wait for optional behavior changes.
Apply M9 to each release and to the complete atlas.

## First milestone inputs

Use the preserved ten engine sources in `assets/pro-results/2026-11-01/examples/engines/`.
Keep their graph, labels, sizes, and routing settings fixed.
Explain the area and route-length costs beside the crossing counts.

Start routing lessons with clearance and corner-radius comparisons.
Use the frozen `clearance-{4,10,30}.draft` and `corner-radius-{0,6,16}.draft` companions.
Show a source-routing counterexample where channel allocation moves shapes.
Add the omitted/true/false directed examples from [the addendum](current-main-addendum.md).

Map Pro's substantive page drafts to the existing reference and new task pages.
Remove editorial integration notes from published prose.
Keep a current-limit explanation until the related behavior fix passes its proof.

## Required proof

- Compare exact public registry key sets with the coverage contract, not only their counts.
- Compile every positive example and standalone page fence; assert finite geometry and valid SVG frames.
- Isolate the ten defect repros and the deliberate pin/alignment diagnostic from positive examples.
- Assert identical world-space rectangles for every comparison described as frozen routing.
- Keep geometry, route points, rendered paths, compiler diagnostics, and quality warnings distinct.
- Replay editor actions with exact starting documents, scope, selection, and session state.
- Run `pnpm check`, `pnpm site:build`, and the relevant `pnpm prove:site` and editor proofs.
- Update `skills/draftably/SKILL.md` with DSL reference changes; add the required changeset for shipped files.

Use existing screenshot tooling and attach evidence to each visible-change PR.
If the work becomes several independent PRs, use the repository's real gh-stack workflow.

## Optional and excluded work

Explore true frozen-geometry source Compare and meaningful cold ordering only with concrete acceptance cases.
Defer new waypoint and label-offset DSL syntax.
Avoid a new layout dependency, engine rewrite, Cartesian image wall, or documentation framework.
