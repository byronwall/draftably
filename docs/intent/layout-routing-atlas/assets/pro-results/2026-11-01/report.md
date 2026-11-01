# Draftably layout and routing: design and coverage review

**Decision:** build a task-led guide, a source-linked visual atlas, and a complete parameter reference inside the current documentation system. Ship an immediately useful content improvement first, then complete the full atlas. Repair the source/compiler/Editor mismatches separately, with releases and regression proofs. A new layout algorithm, dependency, or documentation framework is not justified by this review.

**Baseline:** `af70d8317797d5a522acffdd604819376a3ec893` · **Review date:** 2026-11-01 · **Mode:** design and coverage review; no repository source changes, commits, pushes, issues, or PRs.

## 1. What the owner should get

A reader should be able to name the kind of change they need, see a controlled example, make the smallest relevant edit, and understand what will survive reopening the file. The atlas should answer questions such as “Can the crossing disappear without moving boxes?”, “Why did the group grow?”, “Why did this knob do nothing?”, and “Will this preview become a rule or a saved arrangement?”

The recommended design has three connected parts:

- **Choose or repair:** a short task-led guide that distinguishes an automatic source recipe, a bounded improvement of current positions, a local refinement, and routing. It links directly from a symptom to an appropriate visual.
- **See the mechanism:** one unchanged graph across all ten file engines, followed by small graph families and one-factor sweeps. Each comparison shows the exact changed lines, fixed conditions, effective values, actual metrics, and a readable drawing. Equal outcomes remain visible.
- **Look up the contract:** the complete control inventory, with defaults by context, applicability, units, range, persistence, limitations, and links back to the visual. The existing DSL reference remains authoritative for spelling.

This package supplies the complete research design, not a proposal to investigate a small pilot. It includes 197 coverage entries, 105 numbered visual families, four justified nonvisual groups, 323 positive `.draft` companions, isolated defect repros, actual Draftably SVG exports, substantial page drafts, and an executable validation companion. The exact current counts and execution results are in `evidence/artifact-counts.json`; `atlas-manifest.json` is the machine-readable cross-reference. Editor action sequences are explicitly distinguished from model executions and browser interactions.

### The decisive findings

1. **The existing implementations offer much more than the current examples teach.** There are ten file engines, eleven Editor algorithms/operations, six built-in recipes, fifteen `ENGINE_PARAMS` keys, and twelve `ROUTING_PARAMS` keys. A table of names and ranges cannot explain their context or interactions.
2. **The supplied engine comparison is reproducible and contains real tradeoffs.** Every engine's local metrics matched its supplied record. Removing the one crossing through boundary alignment adds 81.6% frame area and 48.4% route length; compound spring adds 91.4% area and 11.9% route length. The conservative recommendation can therefore remain the current arrangement.
3. **Some public choices do not mean what their label or persistence path suggests.** The Editor can discard the `fold=never` needed for continuous file ranks; independent sibling recipes can leak settings; source Compare can offer ignored controls or label a value it did not execute.
4. **A routing edit to a file is not necessarily a fixed-geometry experiment.** Recompilation can allocate different channels and group spacing. The frozen atlas fixtures are flat, fully sized and pinned, and use a constant row recipe to suppress automatic flow lanes. Equality of world-space rectangles is checked, not assumed.
5. **The package needs truthfulness and coverage before more algorithms.** Fixing silent settings, validation, diagnostics, and visual comparison claims will improve reader outcomes more directly than expanding the engine menu.

Evidence: `src/dsl/syntax.ts:ENGINES, ENGINE_PARAMS, ROUTING_PARAMS`; `src/dsl/compile.ts:engineArrangement, layoutModel, layoutPass`; `src/dsl/layout-edits.ts:engineAttrs`; `src/state/comparison.ts:candidateSource`; `evidence/engine-reproduction.json`; `evidence/editor/probe-results.json`; `evidence/routing/comparisons.json`.

## 2. Access, scope, and evidence discipline

### Exact source access

`PACKET.md` was read first. The ZIP identifies the exact baseline and says the repository sources are unchanged. All 335 extracted members were byte-compared with the ZIP; the source integrity ledger records no changes or missing members. The packet is sufficient for this review's decisive current-source claims. The requested `src/cli/index.ts` does not exist: the actual entry is `src/cli/main.ts`, which was read. This is a reading-route name mismatch, not a missing implementation.

The review covers the parser, compiler, all four engine implementations and declarations, projection/routing/static scenes, state/persistence paths, public layout/routing/Compare/timeline/brush components, CLI variant generation/ranking/application, documentation rendering, relevant examples, and the associated tests. The detailed complete-versus-targeted files-read ledger is in `evidence/files-read.md`. No claim is made that every unrelated file in the packet was semantically audited.

The ZIP omits historical regression assets and release metadata required by some repository-wide checks. Those omissions do not block the current-source design, but they prevent claiming a clean full release gate. Missing inputs are listed in section 10 and the implementation plan.

### Evidence labels used throughout

- **Observed, pinned runtime:** an actual CLI command or model function executed against this baseline. Canonical JSON, SVG, commands, exit codes, hashes and warning records are retained.
- **Observed, supplied:** the attached contact sheet and `engine-variants.json`. These are not new local screenshots. Their metrics were independently reproduced locally.
- **Observed, published UI:** a real interaction with the current hosted site. These observations are dated and kept separate from the pinned source because the deployment may advance.
- **Source-established:** a controlling branch, data flow, or serialization omission was read; a relevant regression test may corroborate it. A browser gesture is not claimed unless recorded as executed.
- **Proposed:** documentation, renderer behavior, tests, and product fixes to integrate. These are not described as already shipped.

Numerical sweep results describe their exact fixture. They are not universal engine rankings, monotonicity guarantees, benchmark claims, or a proof of global optimality. A warning-free `inspect` record is not a claim that no crossing exists: the `check --metrics` quality-warning layer counts more things.

## 3. What exists, and where it is documented

### Inventory reconciliation

`coverage.csv` has one stable entry for each public control/operation at the granularity needed to explain its surface contract. Categorical values are states within a row. Distinct Editor-only states and operations have separate rows when their persistence or execution differs. Three additional rows deliberately describe automatic public behavior—return lanes, wrap lanes, and channel reservations—rather than pretend they are three independent knobs.

| Inventory area | Count and boundary | What the reference must explain |
| --- | --- | --- |
| Layout and file geometry | 78 entries, including six recipes, ten engines, fifteen registry parameters, shared controls, hierarchy/order, refinements, cells/sequence, framing and source comparison panels | Syntax, contextual defaults, effective algorithm, postprocessing, specialized-recipe limitations, and persistence |
| Routing | 27 authored controls/actions plus three derived behaviors | All twelve settings, both endpoint-side choices, feedback/async meaning, target kinds, presets, rerouting and native route editing |
| Editor and CLI | 89 distinct surface controls/operations; Match canvas is consolidated into the aspect entry | Scope/protection/pass controls, preview/commit, Compare, timeline, brush, variant generation/ranking/application and diagnostic/output contracts |
| **Total** | **197 entries: 194 controls/operations and three derived behaviors** | Every row resolves to a visual or a specific nonvisual explanation |

The initial prompt lead of **16 `ENGINE_PARAMS` is not correct for this baseline**. The exported registry contains eleven numeric keys and four categorical/ID keys, totaling fifteen. `direction`, `fit`, minima and scope are outside that registry. The eleventh Editor operation is `separate`, a current-geometry overlap repair; it is deliberately excluded from `ENGINES` and is not accepted as a file engine recipe. Do not change either count simply to match the lead. Sources: `syntax.ts:392–439`; `layout-engine.js:algorithms, defaults`; `layout-edits.ts:engineAttrs`.

One surface duplicate is explicitly reconciled: E010, the Editor's Match canvas aspect state, aliases L030 rather than adding a second canonical aspect control. `atlas-manifest.json` retains that alias and L030 links to the viewport experiment. Other similar-looking controls, such as Layout lab scope and Compare scope, remain distinct because their allowed values, defaults and lifecycle differ.

### Built-in recipes are not interchangeable engine aliases

- **`flow`:** ranks direct children from dependencies, handles feedback, and can fold a long chain. The implicit root uses gap 48; an explicitly written ordinary layout defaults to gap 28. These defaults are not interchangeable.
- **`row` / `column`:** choose a direct-child arrangement axis. Their axes remain row/column even when a general direction or fit search is present. They are valuable controls for reproducible routing experiments.
- **`lanes`:** aligns process ranks across top-level lane groups. It has stricter membership requirements, shared lane dimensions and specialized placement; ordinary position hints inside lanes do not have the same semantics as an ordinary group.
- **`sequence`:** places participant headers and lifelines across the page, with messages in edge declaration order. Participant declaration order and supported root ordering affect columns; grouped participants remain contiguous, and per-group ordering is not applied by the sequence pass. Its geometry pass also handles labels, self-message loops, bands and phases. Ordinary direction, gap and position refinements do not become sequence spacing controls.
- **`cells`:** builds a touching grid or a proportional byte/bit structure. Column count, spans, markers, unit width and ruler states need individual demonstrations. An interior-cell endpoint has different routing consequences from an outer cell or the group frame.

Specialized recipes own more of the final geometry than ordinary layouts. Cells ignore position refinements and use touching slots; lanes can overwrite local positions while equalizing their bands and process ranks; sequence replaces participant coordinates, including authored pins. In ordinary file layouts, pins use parent-content coordinates, so moving the parent can move a pinned child in world space. These contracts must appear beside the applicable recipe, not only in a generic refinement reference.

An Editor preset called **Flow** selects `compound-flow`; `layout root flow` selects a built-in recipe; `engine=flow` selects Directional flow. Put all three spellings and their meanings beside one another. This naming ambiguity is an explanation problem, not a reason to invent three new labels before testing the simpler clarification.

### Complete engine and routing parameter sets

The fifteen engine keys are `rank-gap`, `group-gap`, `node-gap`, `boundary-pull`, `hierarchy-sweeps`, `edge-length`, `repulsion`, `flow-strength`, `alignment`, `compactness`, `grid-strength`, `ordering`, `fold`, `aspect`, and `root`. Shared syntax covers direction, scope, ordinary gap, minima and fit. Every key has a causal paragraph in `page-drafts.md`, exact ranges/defaults/applicability in `coverage.csv`, and a numbered example family.

The twelve routing keys are `clearance`, `standoff`, `port-gap`, `edge-gap`, `bend-penalty`, `crossing-penalty`, `shared-penalty`, `parallel-penalty`, `port-stability`, `fanout-penalty`, `passes`, and `corner-radius`. The menu currently has eleven sliders and Compare eleven axes; both omit `standoff`. Source spelling, menu label and Compare label are cross-referenced rather than counted as three algorithms or three different settings.

### Defaults and execution contexts must remain separate

| Context | Actual baseline behavior | Persistence |
| --- | --- | --- |
| No file layout statements | Root built-in flow gap 48; ordinary groups column gap 24; fixed compiler context1100×720 | Source remains unchanged |
| Explicit ordinary file recipe | Gap28 unless specified; auto direction resolves right in the fixed file context; specialized recipes override ordinary behavior | Recipe is replayed on every compile |
| File engine recipe | Cold rebuild, `warmStart:false`, settled solve, maxIterations640, container growth enabled; final compiler packing/refinements can further change geometry | File recipe plus authored refinements |
| New native JSON Editor | Raw default approach tidy; bounded pass settings include maxMove 48, stability 65, iterations 32; raw fold default never | Native settings/document geometry |
| Source-backed Editor rebuild | Proposed recipe is serialized and cold-compiled; soft position preferences in the scope are removed; explicit sizes, pins and nested recipes remain | Keep/Apply writes source |
| CLI `vary` recipe sweep | Changes the requested source attributes but preserves authored soft refinements | Candidate artifacts first; `--apply` later writes recorded edits |
| Native or file warm/pass | Starts from the current coordinates; scope and protection affect movement | Native geometry or file stays/anchors, not a reproducible engine-name-only recipe |
| Routing source variant | Recompiles source; channel/spacing allocation can change shape geometry | Global routing line |
| Pure routing computation | Consumes fixed rectangles; routes can depend on previous routes and finishing stages | Context-dependent; not automatically equivalent to a file source candidate |

Sources: `compile.ts:DEFAULT_CONTEXT, engineArrangement, recipe, layoutModel`; `layout-engine.js:defaults, compute`; `state/layout.ts:runRecipe, runLayout`; `layout-edits.ts:setLayoutRecipe, writeArrangement`; `cli/variants.ts:applyEdits`; `model/routes.ts:computeRoutes`.

Folding is the most consequential default mismatch: raw engine `never` is omitted by the source serializer, while omission is treated as `auto` by the compiler. “Default” labels must name the context until that behavior is repaired.

### Current documentation and live observations

The current system already has the right basic machinery: `content.ts` splits `docs/DSL.md` at `##` headings, auto-discovers Markdown guides, builds navigation/search, and recognizes `draft` fences. `Example.tsx` supports editable source, Copy, Reset, Expand and Playground handoff. `LiveEditor.tsx` already demonstrates changed-line highlighting and a last-good render. Reuse those behaviors.

The published pages were inspected with a real browser:

- `/docs/layout-engines/`: one editable graph and a ten-engine table. Changing compound-flow to boundary-align changed the SVG viewBox from 1060×356 to1277×560 in the untitled live example; labels stayed the same. Expand and Reset worked. This is the same visual mechanism as the supplied titled fixture, with a different frame height because the title is absent.
- `/docs/routing`: two editable diagrams. The first is a broad settings example and the second a crossing repair by ordering. Setting crossing-penalty2000 produced the expected line9 range error; Reset restored the valid source. There are no individual twelve-parameter sweeps.
- `/docs/layout-tools`: a symptom list and persistence/action table; no live action demonstrations were present.
- `/docs/sequence-diagrams`: three editable examples. Adding a self-message between the two messages inserted `load profile` between their visible labels and increased the render height. Reset worked.
- `/docs/swim-lanes`: one editable example. `/docs/cells`: four editable examples. These were inspected, not exhaustively interaction-tested.

The connected local-browser tool timed out; a cloud browser completed these public-site inspections. No claim is made that the native Editor workflows, mobile layouts, all keyboard behavior, or every page interaction were exercised. See `evidence/live-observations.md`.

## 4. What readers should see

### Preserve the supplied fair comparison

All ten file engines used the same graph, labels, grouping and baseline settings, with the engine choice changed for each candidate. The attached sheet has eleven panels because it includes current plus ten attempts; current and the explicit compound-flow attempt are duplicates.

| Engine | Crossings / bends / line length | Frame and area relative to current |
| --- | --- | --- |
| compound-flow | 1 / 12 / 1340 | 1060×402; reference |
| boundary-align | 0 / 9 / 1989 | 1277×606; +81.6% area |
| compound-spring | 0 / 9 / 1499 | 1131×721; +91.4% area |
| tidy | 2 / 11 / 1209 | 1252×372; +9.3% area |
| stress | 2 / 11 / 1240 | 1260×372; +10.0% area |
| force | 1 / 9 / 1831 | 1281×614; +84.6% area |
| flow | 2 / 11 / 1243 | 1252×372; +9.3% area |
| layered | 1 / 12 / 1340 | 1060×402; same canonical geometry as compound-flow |
| tree | 1 / 9 / 1296 | 1252×386; +13.4% area |
| grid | 1 / 11 / 1672 | 1058×650; +61.4% area |

All ten supplied inspect-style warning counts are zero. That does not erase the reported crossings. Local reproduction: `evidence/engine-reproduction.json` and `evidence/engines/*.json`. Original record: `evidence/engine-variants-supplied.json`; original PNG: `evidence/contact-sheet-supplied.png`.

This graph proves tradeoffs and shared cold behavior. It does not demonstrate every engine's strength. Use the additional flat DAG, hierarchy/forest, disconnected grid, cyclic network, long chain, grouped and nested families. Tree has a meaningful root on a forest; grid needs sparse peers and several aspect targets; compound methods need actual groups; warm tidy needs displaced geometry. Keep the graph and starting context unchanged within each engine comparison.

### A visual is an experiment with an explanation

Each storyboard records the question, control IDs, execution context, exact source or native JSON, changed lines/actions, invariant inputs, intended observation, actual results, warnings, and remaining proof status. The full source accompanies the image. A family may contain subcomparisons with different reference files; the selected reference must not change two unrelated settings by accident.

Required presentation:

- **Shared world scale** for area, displacement and detour comparisons. An independently fitted image can make a larger drawing look smaller. Routing sweeps align world coordinates, not each drawing's route-dependent bounding box.
- **Default and effective values**, not merely requested labels. Low/default/high values are useful teaching points, with units beside the input. They are not always the min/max range.
- **Source diff and full source.** A concise diff explains the cause; Copy/Playground uses the complete valid document. For native operations, show input JSON, exact controls/action sequence, and resulting source or JSON persistence.
- **Metrics plus visual judgment.** Crossings, bends, length, area and movement measure different costs. They are not a scalar proof of quality, and equal metrics do not prove equal paths.
- **Optional targeted overlays.** Mark ports for endpoint choices, the hard obstacle buffer for clearance, a title rectangle and band for header routing, ranks for gap/fold, and motion vectors for bounded passes. Do not draw a decorative overlay on every example.
- **Narrow-screen readability.** Use a selected candidate and baseline toggle at the same scale; keep labels readable through Expand/zoom. A ten-card wall is an index, not the lesson itself.

### Demonstrated routing tradeoffs

All twelve numeric sweep groups have exactly equal compiled node rectangle arrays. Every one of the36 main numeric fixtures also matched the independently executed raw RouteLab route arrays after the constant row-recipe correction.

| Controlled sweep | Actual result | What the caption must say |
| --- | --- | --- |
| crossing cost0/360/1200 | crossings1/1/0; bends6/6/8; length 960/960/1342 | Avoiding one crossing costs382 line units and two bends; low/default are equal here |
| bend cost0/32/100 | bends26/17/14; crossings0/2/2 | Simpler routes can introduce crossings; higher is not automatically better |
| standoff 0/20/40 | measured obstacle distance10/20/10; length 470/490/470 | A soft weighted cost is not a monotonic minimum-distance control |
| clearance4/10/30 in a28-unit corridor | straight360 at 4/10; detour648 with four bends at 30 | A hard buffer can close a corridor while rectangles stay fixed |
| port stability 0/20/150 | bends17/17/18; length 3386/3386/3434 | A cold run still uses its own earlier routes during later repair stages |
| corner radius 0/6/16 | same points and metrics, three different rendered paths | Rendering changes can be real even when route geometry is identical; short segments cap the effective corner |
| edge-gap 4/16/48 in the equal-metrics case | all 1 crossing,6 bends,960 length; middle segment y168/84/168 | Headline metrics alone cannot establish “no effect” |
| grouped channel standoff 0/20/40 | widths1147/1259/1235; heights828; crossings2/1/3 | This is a source recompile:18 node/frame rectangles change, so do not call it frozen routing |

Metric scope matters for specialized drawings: an interior-cell example reports26 router units but draws78 after a52-unit entry extension is appended; sequence message segments also sit outside the raw router report. Use “router-reported length” for that number and inspect the drawn polyline separately. Sources: `src/model/routes.ts:drawRoutes`; `src/cli/variants.ts:draw`.

Evidence: `evidence/routing/results.json`, `evidence/routing/comparisons.json`, original raw probes, and the named SVGs. True no-effect controls—standoff with fixed sides, shared-path cost without overlap, and roomy fan-out—have equal route points and SVG paths across their triplets. These are intentionally retained, not failed examples.

### Actual editor mechanisms, with the right limit

The package includes genuine `LayoutLab.compute`, `SculptLab.journey`, and `SculptLab.dab` output rendered by Draftably's own `renderSvg`. On the common tidy input, the bounded pass moved no node more than48 world units; the cold rebuild and warm settle produced different arrangements. The timeline contains13 frames, with frames 0,6 and12 supplied. Five single-dab brush modes start from the same perturbed native document: protect changes the hold set without moving geometry, while the four movement modes have their own outputs.

Eleven additional native model renders demonstrate alignment, grid attraction and within-rank ordering from three declared starting arrangements. Every value restarts from its family's identical native document and runs one bounded pass. In the alignment fixture, changing 0→100 closes the near pair's transverse difference by about 5.5 world units relative to the zero-strength result; in the perturbed grid fixture, the largest corresponding coordinate difference is about 8.4 units. Warm ordering changes its targets and resulting movement, but the bounded pass does not complete the permutation. The cold grid-strength and ordering fixtures remain equal and are retained. Together with the thirteen editor/timeline/brush renders, these make **24 native model renders**. Exact options, starting JSON, metrics and geometry hashes are in `evidence/layout-warm/model-render-results.json`; `scripts/render-layout-warm.mjs` reproduces all eleven supplemental outputs.

These model renders are not screenshots of the Editor controls or proof of save/reopen UI behavior. Their JSON baseline, options and script are supplied. The full editor action recipes specify the source-backed/native distinction, selection, viewport, scope, holds, reference and one-dab action so Codex can run the browser proofs. This is more reproducible than a video whose stroke duration is unknown.

## 5. Documentation design choice

Scores are editorial assessments from 1 to5, not measured usability-study results. Coverage, causal understanding and repair choice receive equal weight.

| Design | Coverage / causality / repair choice | Decision |
| --- | --- | --- |
| Expanded reference tables plus one large gallery | 5 / 2 / 2 | Reject as the main design: exhaustive names still hide applicability, scale and context |
| New all-controls interactive playground | 5 / 4 / 3 | Reject: duplicates existing Editor/Compare and creates another state/persistence system |
| Task-led guides + focused atlas + full reference | 5 / 5 / 5 | Build: uses the current Markdown system and keeps one question per comparison |

### Navigation and page boundaries

Keep `/docs/layout-engines`, `/docs/routing`, `/docs/layout-tools`, and existing diagram-kind slugs. Add guides under `site/docs/pages/` and explicitly register their sidebar groups in `site/docs/content.ts`; otherwise auto-discovered pages fall into Language. Avoid duplicate guide/reference slugs: `ordered()` gives DSL pages precedence.

Recommended layout group:

1. **Choose a layout** — the four kinds of change, graph-family selection, common ten-engine comparison and cold/warm distinction.
2. **Layout atlas** — index by question/control, linking to focused families rather than one page with hundreds of live editors.
3. **Layout engines** — the canonical engine names, all 15 parameter contracts, applicability, effective file defaults, and links to sweeps.
4. **Layout recipes** — flow/row/column, scope/inheritance, direction/order/fold/fit and framing; links to lanes/sequence/cells.
5. **Routing** — twelve parameters, fixed-geometry comparisons, cost tradeoffs and full defaults/ranges.
6. **Ports and lanes** — endpoint sides, title bands, feedback, automatic returns/wraps, channel space and native-only bends.
7. **Fix a drawing** — symptom-first selection of a small control and the next inspection step.
8. **Layout tools / Compare / Timeline and brush** — current geometry, protection/scope, preview/persistence, experiment fairness and local repair.

The proposed page drafts are substantial copy, not headings awaiting research. They cover the mechanisms, ranges, defaults, failures, source snippets, CLI run sheet and current limitations. Codex should keep editorial Integration notes out of published reader prose and remove limitation callouts only after the corresponding fix is verified.

### Minimal renderer, justified by a real limitation

One focused `AtlasExample.tsx`, a small manifest and a tiny Markdown dispatch extension are sufficient. It should reuse `draw`, `Example`, `Zoom`, source highlighting and Playground URLs. It needs a baseline/selected variant, shared scale, changed lines, effective settings, evidence status, metrics and optional authored overlays. An HTML preview companion in this package demonstrates the presentation with actual SVGs; it is a research artifact, not a proposed second product framework.

Lazy computation is necessary before integrating hundreds of examples. `Docs.tsx` currently awaits preparation of all drafts on the next page; it also warms all pages' drafts. `Example.tsx` caches prepared drawings. This is a source-established scaling risk, not a measured performance regression in the current site. Split families into focused pages and compute selected/nearby variants on demand. Static verified fallback SVGs allow the explanatory page to appear before an expensive diagram finishes.

Accessibility requirements belong in the component acceptance criteria: real labels, keyboard selectors, explicit baseline/effective-value text, meaningful focus after reset/expand, no color-only differences, reduced-motion behavior for timeline demonstrations, source/error availability at narrow width, and a readable textual takeaway for every picture. Do not put ten editable textareas in one narrow viewport.

## 6. Ranked product gaps: separate from documentation work

Ranks are reader-impact priorities, not security severities. No issue or PR was created. Stable recommendation IDs link these findings to `recommendations.md` and the plan.

### Priority1 — trust, persistence and finite geometry

**LR-007: save the intended folding choice.** Observed module/CLI reproduction: an explicit never-fold twelve-node chain measures2540×56. UI never writes omission, which compiles identically to explicit auto at 812×336; projected settings after omission can still report never. Explicit UI auto writes `fold=auto`. Fix serialization against effective file defaults. Source: `layout-edits.ts:engineAttrs`, `layout-engine.js:defaults`, `compile.ts` fold paths. Evidence: `evidence/editor/probe-results.json` and corresponding SVGs.

**LR-008: isolate independent scope settings.** Observed: swapping only sibling recipe statement order changes the second group's gap 120→24 and width 1064→776; total width 2236→1948. `engineArrangement` carries the preceding solve's mutated document settings into the next scope. Build each scope's settings from the intended defaults/inheritance/own attributes. Preserve legitimate ancestor inheritance while removing sibling leakage. Source: `compile.ts:656–715`. Evidence: scope-settings repro pair and `evidence/layout/focused-probes.json`.

**LR-009/LR-010: reject unsafe cell counts and nonfinite sequence bands.** Observed: fractional columns reach `Array(cols)` and fail; fractional span exports a null width; an empty sequence band exports null geometry and misleading tiny metrics without warnings. Require integral structural counts, validate group/participant requirements, and guard finite geometry before export. A located source diagnostic is preferable to a runtime allocation error or invalid SVG. Sources: `syntax.ts:number, cells/sequence validation`; `cells.ts:layoutCells`; `compile.ts:sequenced`.

**LR-011/LR-012: make source Compare experiments truthful.** Observed source-module probes show ignored source controls for direction/protection/growth/flow strength in selected contexts, and edgeGap1 labeled as1 but normalized/serialized/executed as4. Native candidates reject the out-of-range value. Source rebuild/routing calls bypass the native candidate path and its validation. Use one capability/validation decision before dispatch; hide unsupported axes and show effective settings. Never synthesize a non-source candidate and later serialize it lossily. Sources: `state/comparison.ts:candidateSource, generate`; `explorer-engine.js:candidate`; `layout-edits.ts:engineAttrs`.

### Priority2 — incomplete contracts and inaccessible or ignored choices

**LR-013: carry source diagnostics into Compare.** `compileCandidate` returns no source-diagnostic list and `report:null`; cards cannot explain every compiler issue. Return a separate diagnostics field, preserve warnings, and block error-level candidates. A source compiler result should not receive a fabricated solver report.

**LR-014: release fixed ports with real source edits.** The native path clears sides; the source routing path only rewrites the global routing line. The checkbox can leave fixed `from`/`to` attributes intact. Either implement and show those edits or disable the control for that context. The existing checkbox is not evidence that the file variant used automatic ports.

**LR-015: qualify comparison equality.** `vary` fingerprints coarse geometry in4-unit bins and omits corner radius. Actual radius 0/6/16 SVGs differ although each can be tagged same-as-current. Use exact route/render signatures when claiming visual equality, or explicitly say “same coarse geometry.” Retain repeats in exact sweeps. Equal dimensions, equal route metrics, equal point arrays and equal rendered paths are different facts.

**LR-016: stop teaching cold ordering as an effective crossing fix.** Cold file rebuilds take the same layered ordering branch for stable and crossings; the paired file renders are equal. Document the warm distinction and current limitation. A future file ordering semantic change is an Explore item with explicit acceptance cases, not a fictional before/after screenshot.

**LR-017 (Explore): resolve the group-gap contract.** The parser permits values up to 180; the compound/layered packing path caps its drawing-wide common gap at 96. The controlled 96/120/180 fixture renders identically. One candidate policy is to cap only the traffic-derived contribution, then take the maximum of that contribution and the requested gap. Another is to constrain and document the supported range for this path. Evaluate the policy against the compound packing corpus before changing behavior. Document the current traffic floors and drawing-wide coupling now; do not promise an exact independent per-group distance.

**LR-018: diagnose accepted-but-ignored specialized settings.** Root minima are accepted but unused; sequence rewrites ordinary gap/direction/position geometry; ruler/unit-width without unit are ignored and can evade validation; an outside-scope tree root is accepted. Fail unsafe numeric inputs, and give located unsupported-setting diagnostics for harmless-but-ignored combinations. Define the policy before expanding syntax.

**LR-019/LR-020: expose and explain routing accurately.** Add the already-public `standoff` setting to the menu and Compare. Correct “Shapes never move” in source mode, the title-band description, the fanout capacity exemptions, the soft standoff promise, and the passes budget. These are mostly content/label corrections; a fixed-geometry Compare mode is separate optional product work.

**LR-021: do not advertise unsavable file gestures.** Native bend insertion/removal, label offsets, container padding and some container layout settings lack file translation. Disable or explain unsupported controls before the gesture, and link to the supported source alternative. New waypoint syntax is not required to finish the atlas.

### Priority3 — clarity and durability

Explain that preview can be implicitly accepted before another ordinary edit; Tidy positions uses the current approach, not necessarily the tidy engine; timeline inherits a scope; brush holds are session constraints rather than durable pins; `vary --scope` does not make explicitly requested routing settings local; and CLI vary preserves refinements that Editor rebuild removes. Explain the recommendation guard rather than relabeling the current winner “best algorithm.” These are specific content/persistence improvements, not a general website audit.

Keep fractional sweep/rounding policy deliberate, reject duplicate order members, clarify group-fold scope, and verify group endpoints/participant ordering in sequence. These smaller boundary cases can follow the finite-geometry and common persistence fixes. Source details and isolated inputs are retained in the supplemental audit evidence.

## 7. Terminology and external research

External sources constrain terminology; Draftably source determines implementation behavior and defaults.

- Official ELK documentation explains the layered family and separates phases such as cycle breaking, layering, crossing minimization and placement. That phase-oriented explanation is a useful documentation precedent. Draftably's layered/compound heuristics are not an ELK integration. [ELK layered reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html); [official phase overview](https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html).
- Gansner, Koren and North distinguish stress majorization from gradient-based alternatives. Draftably's `stress` uses gradient-style descent steps; call it Stress descent and do not inherit the paper's convergence guarantee. [Graph Drawing by Stress Majorization](https://graphviz.org/documentation/GKN04.pdf).
- Wybrow, Marriott and Stuckey distinguish orthogonal route search from subsequent path positioning/nudging. Their optimality result belongs to their formulation and objective; it does not prove Draftably's bounded grid/candidate search and greedy finishing globally optimal. [Orthogonal Connector Routing](https://people.eng.unimelb.edu.au/pstuckey/papers/gd09.pdf).
- Official libavoid documentation distinguishes shape-buffer distance, cost penalties and nudging distance. That supports the explanatory separation of clearance, preference and final spacing, without importing libavoid names/defaults or claiming it is a Draftably dependency. [Adaptagrams routing API](https://www.adaptagrams.org/documentation/namespaceAvoid.html).

The source also shows that tree uses a spanning/BFS-style hierarchy and subtree spacing, not a claim to a specific Buchheim tidy-tree implementation. Compound spring is an original heuristic, not CoSE. No external algorithm claim is used to substitute for reading the shipped code. Current primary sources were opened during this review; long quotations were not needed.

## 8. Exclusions and nonpublic flags

Exhaustive public coverage does not mean promoting every implementation flag into the product.

| Item | Documentation destination | Reason |
| --- | --- | --- |
| Router quick, previous-route input | Contributor/interaction notes; user sees provisional drag versus settled routing | Execution context, not an authored file option |
| Router facing, titleBands | Contributor tests; user mechanism diagrams for their visible behavior | Internal default-on switches, no public toggle |
| Router window | Contributor performance notes only | Search-window optimization, not a routing style |
| Router tidy, jogs | Contributor finishing pipeline; brief user outcome explanation | Internal finishing switches; router tidy is distinct from layout tidy |
| Compiled row/lane/toOffset/flow metadata | Contributor model docs plus automatic-lane visuals | Derived scene data, not legal source attributes |
| Raw compute options such as fixedIds, warmStart, settle | Contributor API; public controls that use them are already inventoried | Do not invent DSL counterparts |
| Legacy radial→tree and compact→layered aliases | Migration/contributor note | Raw settings normalization accepts them; file syntax rejects them |
| camelCase in-memory versus kebab-case file names | One cross-reference column | Different spellings of the same setting, not extra public choices |
| Font/theme padding, long labels, color/theme choices | Cross-link appearance/type docs; freeze them in atlas experiments | Geometry-affecting inputs are represented by graph families, but a full appearance atlas is outside this layout/routing mission |
| Ordinary file management, unrelated exports, search and general app usability | Existing appropriate guides | Included only when necessary to enter a native/source mode or reproduce a layout operation |
| Graphviz minlen, named channel statements, spline router selector, per-edge routing costs | Nowhere as current Draftably options | They do not exist in the public baseline grammar |

The four nonvisual groups cover Compare artifact export, timeline archives, CLI work/output controls, and inspection serialization. Their contract is demonstrated with the existing drawing plus source/JSON/file-list evidence; an additional geometry picture would imply a nonexistent layout choice. Each row still has a specific explanation and reproduction step.

## 9. What exactly to build

The separate implementation plan gives files, tests, dependencies, acceptance criteria and the main failure mode for every milestone. Its completion contract is countable:

- Every exported engine/parameter registry key is represented, with all supported categorical states and meaningful numeric samples.
- Every curated public UI/CLI operation has a stable entry and exact action recipe or nonvisual justification.
- Every positive source companion parses, compiles to finite geometry and exports through the actual renderer. The ten defect repros and one expected infeasible-constraint diagnostic remain isolated from that gate. After the fixes, defect repros must assert the intended located diagnostics or valid finite behavior; the pin/alignment conflict should continue to retain the pins and report the conflict.
- Frozen comparisons assert world-space rectangle equality; equality captions distinguish metrics, geometry, route points and rendered paths.
- Source-backed previews/Apply/Keep round-trip through fresh compiler output and reopening; file-only and native-only capabilities are visible before use.
- All page drafts and example references are integrated, not merely the initial ten-engine gallery. All original evidence remains available to Codex.
- Mobile/keyboard proofs demonstrate the minimal atlas presentation, and a complete checkout passes the repository's release gates before shipping.

The first milestone is useful without renderer work: replace misleading copy, add the context table and repair guide, publish the fair engine tradeoff and two frozen routing comparisons using ordinary live examples, and update the bundled agent skill. Later milestones complete the fixture contract, product correctness, minimal renderer, all atlas pages and proofs. There is no outside-demand or adoption gate.

## 10. Verification, limitations, and open decisions

### Checks actually run

The retained command ledger gives exact paths/outputs and distinguishes source probes from UI actions. The final positive-companion ledger records **323 sources, 969 successful check/inspect/SVG commands, 17 frozen routing subcomparisons with identical rectangles, and 13 complete validated page fences**. An assembly extraction issue caught during QA was corrected before the final fence run. All final packaged sources match the successful-command hashes in `evidence/final-cli-reproduction.json`.

- Dependencies installed with `pnpm install --frozen-lockfile` using a workspace store after the sandboxed network attempt failed. Runtime: Node 24.22.1 and pnpm 11.25.0; the repository requests pnpm 11.9.0. The lockfile bytes remained unchanged.
- CLI help, full positive fixture compilation, metrics checks, SVG exports, exact geometry/path comparisons, all ten supplied-engine reproductions, focused invalid-input/persistence/Compare probes, native layout/timeline/brush model renders, and every complete `draft` fence in the page draft were executed. Exact final counts are in the ledgers.
- `pnpm check:fast`: TypeScript and ESLint completed; formatting failed on 253 unchanged packet files, so the chained unit step did not run. No autoformat was applied.
- `pnpm test:unit`:59 files passed, one skipped, five failed in the initial sandbox run;413 tests passed,6 failed,8 skipped. Failures include omitted corpus/release fixtures and loopback listening restrictions. Re-running only the two loopback-dependent suites with permitted networking passed all 10 tests.
- `pnpm site:build`: exit0 and25 pages generated. It emitted bundle-size advice and a Vite WebSocket EPERM message during page-generation setup; this was not silently treated as a pristine build log.
- The first actual CLI `vary` radius sweep reached measurement and then failed PNG export while Chrome was unavailable. After obtaining a verified stable Chrome Headless Shell 156.0.8078.80, the **unmodified CLI completed the full radius 0/6/16 sweep**, including four PNGs, the contact sheet and `variants.json`. Every requested radius retains the misleading same-as-v0 coarse-geometry tag despite different visible corner paths. `CHROME_PATH` points to a workspace wrapper adding the container-required `--no-sandbox`; compiler/router/source code is unchanged. Evidence: `evidence/cli-vary-radius/`.
- Browser installation through the pinned and runtime Playwright package archives initially failed. A stable official Chrome Headless Shell download succeeded. The completed **offline artifact viewer** was exercised across all 109 groups and all source/native variants with no JavaScript errors, equal paired viewBoxes, working search and byte-exact original-SVG downloads. Desktop and390px viewport screenshots were inspected; the narrow document has no page-level horizontal overflow. This proves the delivered viewer, not the native Editor UI or the repository's `pnpm prove:site` gate. Evidence: `evidence/preview-qa/`.
- The repository's existing `scripts/shoot.mjs` also produced a three-panel radius PNG from the actual SVGs. Only its browser executable selection was adapted to the available stable binary; the screenshot script and renderer were unchanged. Evidence: `evidence/cli-vary-radius/corners-existing-shoot.png`.
- Public-site engine edit/Expand/Reset, routing error/Reset, sequence edit/Reset, and the listed lesson inspections were executed with a real browser.

`pnpm check` and the full engine-parity/release gate were not claimed as passing. The packet lacks `reference/v7/source/*-engine.js`, `.changeset` metadata, the `srcly-release/v0.draft` quality corpus file, and the two heldout growth fixtures named in test failures. Formatting configuration should be checked in the complete repository before diagnosing the253-file result as a source problem. See `evidence/checks/` for unabridged logs.

### Essential open decisions

These are bounded integration choices with recommendations, not reasons to stop the mission:

1. **Cold file ordering:** keep current behavior explicitly documented now; explore a genuine stable-versus-reorder semantic only with a fixture proving a useful difference and a deliberate release.
2. **Group spacing:** explore whether to honor larger requested gaps by capping only traffic-derived expansion, or constrain the contract to the current packing behavior. Verify the selected policy against the compound packing corpus before release; document the current cap and shared drawing-wide behavior immediately.
3. **Unsupported specialized controls:** reject unsafe values; prefer explicit warnings for harmless accepted controls until a compatibility policy is chosen. Do not silently add new sequence spacing or root-minimum semantics.
4. **Fixed-geometry source Compare:** the atlas can ship with verified pinned flat fixtures. A product mode that freezes arbitrary current nested geometry is optional Explore work after current source capability defects are repaired.
5. **Sequence group endpoints/empty bands:** reject or define them explicitly; do not publish their current nonfinite/ambiguous behavior as a supported feature.

No owner clarification is required to start or complete the recommended documentation work. Codex should use the original artifacts, verify against a complete checkout, reconcile later main-branch changes, and integrate the small releases in the dependency order specified.

## Deliverable map

- [coverage.csv](coverage.csv): complete inventory and source/visual cross-reference.
- [visual-atlas.md](visual-atlas.md): numbered storyboard, exact sources, invariants, metrics and status.
- [atlas-preview.html](atlas-preview.html): readable offline comparison of actual SVG evidence.
- [page-drafts.md](page-drafts.md): substantial destination-labeled proposed copy.
- [implementation-plan.md](implementation-plan.md): independently useful milestones and exact acceptance tests.
- [recommendations.md](recommendations.md): stable Build/Explore/Defer/Avoid decisions.
- `examples/`, `renders/`, `evidence/`, `scripts/`, `atlas-manifest.json`, and `run-atlas.py`: complete companions and reproduction material in the ZIP.

**Access status:** decisive current source available at the exact baseline; all supplied source members unchanged. **Files read:** recorded in `evidence/files-read.md`. **Checks run:** above and in the command ledger. **Remaining limits:** repository-wide omitted fixtures/configuration and unexecuted editor UI recipes are explicit; no missing source was replaced by an invented claim.
