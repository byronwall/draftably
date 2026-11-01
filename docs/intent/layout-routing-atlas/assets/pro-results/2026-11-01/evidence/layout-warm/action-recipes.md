# Exact warm supplements for VL10, VL12, and VL13

These supplements close a real coverage gap in the preliminary atlas: the cold file fixtures exercise every accepted value, but a cold grid cannot explain attraction from perturbed positions and cold ordering selects the same code branch for both values. The following exact starting documents, settings, and actual native model renders are provided in `layout-warm-validation/`.

## Provenance and repeatable setup

The script `layout-warm-validation/render-warm.mjs` loads the exact baseline through Vite SSR, compiles each starting `.draft`, projects it into a native Diagram, runs **one `LayoutLab.compute` bounded pass**, and exports with the real `renderSvg`. Routing starts with `previous:[]`; these are not screenshots of the UI and do not claim to reproduce its live route-cache history. All rendered node and route coordinates are finite. The loader logged an optional WebSocket binding error in the restricted environment, but module loading and all11 model exports completed successfully with process exit0. Raw output is in `layout-warm-validation/run.log`.

`model-render-results.json` uses the same row shape as the editor model evidence: `document`, `svg`, `geometry`, `visual_ids`, `options`, `report`, and measured metrics. It contains three baseline images and eight result images. Each family also records a shared world rectangle, so an overlay or synchronized crop can preserve world scale.

For UI reproduction, import the named `json/warm-*-before.json` into a fresh plain native `/app/` session. Importing into a source-backed Playground/editor session is not equivalent. Clear session holds, select nothing, set Scope to Whole diagram, and reset the same imported JSON before each variant. Use a1440×1000 viewport and the same camera. Set Approach and the controls below, then press **Preview tidy** once. That button runs the selected approach as a bounded pass; **Preview automatic layout** would be a different experiment. UI execution remains to be captured by Codex; the matching model run is already executed.

Shared controls: directionRIGHT; foldnever; respect arrow directionon; respect Manual markersoff; allow containers to growoff; nodeGap24; rankGap52; edgeLength88; compactness35; numeric aspect1.6; no explicit pins and no fixed IDs. Unchanged settings use `LayoutLab.defaults`. Full exact options are embedded in every result row.

## VL10 — Warm alignment acts strongly only on the near-aligned pair

Starting source: `sources/warm-alignment-start.draft`; starting native file: `json/warm-alignment-before.json`.

The first edge connects A(0,0) to B(260,12); the second connects C(0,240) to D(260,340). All boxes measure164×56. The12-unit offset is inside tidy's alignment region; the100-unit offset is outside it initially. There are no groups or fixed positions in the native pass.

Choose **Local tidy**, Maximum move48, Stay near this arrangement65, Solver effort32. Run Alignment0,55,100 from identical baseline copies. Results are `warm-alignment-0`, `warm-alignment-55`, and `warm-alignment-100` in the JSON/SVG directories.

Observed: changing alignment0→100 changes A/B vertical positions by+2.721/−2.803 respectively, closing their transverse difference by about5.5 units. C/D move only about0.1 unit differently between those variants. The shared spring and collision behavior still moves both pairs, so compare the **difference between coefficient variants**, not before→after alone. Use center guides and a readable crop of the near pair. Do not advertise alignment as an exact constraint.

## VL12 — Grid attraction differs from the same perturbed grid

Starting source: `sources/warm-grid-start.draft`; starting native file: `json/warm-grid-before.json`.

The source gives each of nine disconnected nodes an exact staggered coordinate using stays, then exports those positions into native JSON. It is not a fresh canonical grid. Choose **Soft grid**, Maximum move48, Stay near this arrangement65, Solver effort32. Run Grid attraction0,45,100 from the same baseline.

Observed bounds are454×503,446×504,442×504 respectively. The0→100 comparison moves one node about8.4 units farther vertically. At0 the base grid attraction and other constraints still act. Preserve the original cold grid-strength cards—all three were exactly equal—and place this warm result directly below them. Together the two examples explain why both a no-effect result and a visible attraction effect are correct.

## VL13 — Ordering selects different targets during a bounded pass

Starting source: `sources/warm-ordering-start.draft`; starting native file: `json/warm-ordering-before.json`.

Edges are A→D and B→C. A/B occupy(0,0)/(0,140); C/D occupy(260,0)/(900,140). C/D share a dependency rank but start widely separated horizontally. That breathing room makes the ordering objective visible without assuming that two boxes can pass through each other in an already packed rank.

Choose **Layered + fold**, Maximum move192, Stay near this arrangement0, Solver effort96. Run Within-rank orderingStable andCrossings independently from the same baseline. This is one bounded action, not a settled rebuild; target reordering can be incomplete because the movement disc limits it.

Observed: Crossings moves C47.256 units farther downward and D42.010 units farther upward thanStable, with smaller accompanying x changes. Both outputs remain limited by the192-unit move budget. Do not promise that one bounded pass completes the permutation or reduces routed crossings on every fixture. The cold stable/crossings pair remains exactly equal; this native pass demonstrates the real contextual distinction.

An initially tightly packed symmetric crossed pair produced only subpixel differences because collision separation blocked a rank swap. That is a useful algorithm limitation, not a reason to manufacture a different final ordering. The provided wider starting geometry is the declared input, and its full before image remains visible.

## Expected pin/alignment conflict companion

`sources/expected-diagnostics/align-pin-conflict.draft` pins A at(0,0) and C at(400,100), then requests required y alignment. This is deliberately infeasible. Ordinary `inspect --json` retains both exact coordinates; `check --metrics` and `inspect --json --metrics` return exit1 with “Pins conflict with required y alignment in root. The pins were kept.” SVG export succeeds and shows the retained positions. The raw result is in `diagnostic-results.json`, with the actual SVG at `svg/align-pin-conflict.svg`.

Use this with VL23 and VL26 as an **expected diagnostic**, not a positive example or a product defect. The four positive alignment fixtures were also strengthened to give C width120/height96 while A remains164×56, making center alignment visibly different from edge alignment.
