# Ranked recommendations: layout, routing and documentation

**Baseline:** `af70d8317797d5a522acffdd604819376a3ec893` · **Review date:** 2026-11-01.

**Recommended direction:** integrate task-led guides, a complete reference and a source-linked visual atlas into the existing documentation system. Repair misleading persistence, validation and comparison behavior in small, separately reviewable changes. Complete coverage does not require a new layout dependency, a second playground or a new documentation framework.

This is a decision ledger for Codex integration. The recommendation IDs are stable and match [implementation-plan.md](implementation-plan.md). **Build** means implement in the scheduled core milestones; **Explore** means resolve a bounded semantics or feasibility question with explicit evidence before a behavior change; **Defer** means keep the current limitation clear and omit the extension from this program; **Avoid** means exclude the approach from this mission. Priorities describe reader impact and correctness: **P1** protects trust, valid output or the core delivery contract; **P2** completes important behavior and explanations; **P3** is optional or a deliberate scope boundary. ID order is not an execution dependency order.

The inventory contains **197 canonical entries: 194 controls/operations and three derived public behaviors**, mapped to **105 visual families and four justified nonvisual groups**. Counts and completion are checked from [coverage.csv](coverage.csv), [atlas-manifest.json](atlas-manifest.json) and [artifact-counts.json](evidence/artifact-counts.json), rather than inferred from a contact sheet. The twelve numeric routing sweeps, all ten supplied engine results and focused compiler/persistence probes are actual pinned executions. Native gesture recipes and model executions are labeled separately; this ledger does not turn a source reading or model probe into a browser claim.

## Top ten gaps: documentation response versus behavior change

This ranking combines likely reader harm, reproducibility and the breadth of affected workflows. Documentation can explain a limitation immediately; it cannot make a broken persistence path or invalid geometry correct.

| Rank | Gap and concrete evidence | Documentation response | Behavior response | Recommendations |
| --- | --- | --- | --- | --- |
| 1 | **The folding choice does not round-trip.** Serializing `never` drops the attribute; an explicit 2540×56 chain recompiles to 812×336. Explicit `auto` is written and reaches that same folded result. | Distinguish raw engine and effective file defaults; retain a baseline-limit callout. | Serialize the intended file semantics and prove fresh-compile/reopen parity. | LR-007, LR-002, LR-024 |
| 2 | **Accepted input can yield invalid geometry.** Fractional columns throw `Invalid array length`; fractional span and an empty sequence band export null coordinates/dimensions. | Explain supported structural counts and isolate known defect repros. | Reject unsafe structural values with located diagnostics and require finite geometry before export. | LR-009, LR-010 |
| 3 | **Sibling scope settings leak.** Swapping only two layout statements changes group B width 1064→776 and its node gap 120→24. | Explain intended ancestor inheritance and the observed baseline defect. | Construct scope settings independently of the previous sibling solve. | LR-008 |
| 4 | **Compare can label an experiment it did not run.** A source cell requested as edge gap 1 executes 4; selected source axes also produce identical source because they are ignored. | State execution context and effective values beside every comparison. | Share validation before dispatch and expose only faithfully representable source capabilities. | LR-011, LR-012 |
| 5 | **One “layout” vocabulary hides several workflows.** Cold source recipes, warm/pass geometry, local hints and routing have different inputs and persistence; three public uses of “Flow” select different things. | Put the task/context guide before parameter tables and cross-reference exact spellings. | No new algorithm or wholesale renaming is required. | LR-001, LR-002, LR-022 |
| 6 | **Source Compare loses important context.** Compile diagnostics are not returned as a structured candidate field; release-fixed-ports changes native candidates but leaves file attributes unchanged. | State the current limitation before the control is used. | Carry source diagnostics and implement concrete edge edits or disable the unsupported checkbox. | LR-013, LR-014 |
| 7 | **Visual equality and coverage are easy to overclaim.** Rounded-corner SVGs share a coarse geometry key; equal edge-gap headline metrics conceal different paths; supplementary counterexamples can be bundled but omitted from galleries. | Explain the exact equality claim and retain equal outcomes. | Enforce coverage mappings, per-subcomparison references, exact geometry/path evidence and separate warning ledgers. | LR-004, LR-005, LR-015, LR-028 |
| 8 | **Routing labels overpromise.** Source recompile changes 18 objects in the channel example; standoff distances are 10/20/10 at 0/20/40; passes 1 still runs finishing; title bands and roomy fans have special rules. | Replace incorrect claims with the observed mechanisms and matched examples. | Add the existing public standoff setting to menu/Compare; keep arbitrary frozen source Compare separate. | LR-019, LR-020, LR-030 |
| 9 | **Specialized recipes silently accept ineffective settings.** Sequence overwrites ordinary controls; root minima do nothing; proportional-cell modifiers without `unit` evade validation. | Publish applicability at the point of use, including honest no-effect examples. | Diagnose unsupported combinations; decide new semantics separately. | LR-018, LR-016, LR-017 |
| 10 | **Some enabled gestures cannot persist in a file.** Container direction/padding snap back after projection; native waypoints and label offsets have no `.draft` translation. Preview can also be accepted by a subsequent ordinary edit. | Explain mode and commit boundaries before the action. | Disable unsupported file controls or translate the subset with a faithful existing source representation. | LR-021, LR-022, LR-031 |

Evidence for ranks 1, 4 and 6 is in [editor probe results](evidence/editor/probe-results.json); ranks 2 and 3 in [focused layout probes](evidence/layout/focused-probes.json); rank 10 in [persistence results](evidence/editor/persistence-results.json); routing and equality cases in [routing comparisons](evidence/routing/comparisons.json). These records retain the pinned execution path and do not assert unperformed mouse/keyboard actions.

## Stable recommendation ledger

### LR-001 — Build the task-led guides, reference and focused atlas

**Classification:** Build · **Priority:** P1 · **Milestone:** M1, completed through M7. **Coverage:** all canonical rows. **Visuals:** VL01–VL46 where assigned, V-R01–V-R24, V-E01–V-E36 and NV-E01–NV-E04.

**Evidence and consequence.** The parser and public surfaces already expose substantially more choices than a names/ranges table can explain. The audits distinguish cold recipes, current-geometry operations, refinements and routing; choosing the wrong category can discard useful placement or change a different property. Existing `site/docs/content.ts`, `Docs.tsx`, `Example.tsx` and `LiveEditor.tsx` already supply discovery, editable source and handoff mechanisms.

**Proposed change and boundary.** Publish “Choose where the change belongs,” “Choose a layout” and “Fix a drawing,” linked to the canonical DSL reference and individual atlas families. Preserve existing useful slugs. M1 ships useful prose and selected existing live examples; completion still includes the entire inventory and drafts, without an adoption gate. The page drafts are proposed copy, not a claim that these pages already exist.

**Acceptance.** Every symptom in the guide reaches a specific applicable control and figure; every inventory row reaches a reference section; all complete embedded sources compile; current limitations are visible before the affected workflow. A reader can follow the guide from symptom to edit to persistence without consulting contributor internals.

### LR-002 — Name defaults by context and distinguish all three Flow meanings

**Classification:** Build · **Priority:** P1 · **Milestone:** M1. **Coverage:** L001, L007, L013, L017–L041; R001–R012; E001, E003–E009, E034–E038. **Visuals:** VL01, VL15–VL19, VL34, V-E01, V-E04–V-E08, V-E17.

**Evidence and consequence.** An omitted root recipe uses flow/gap 48; an ordinary group uses column/gap 24; an explicit ordinary recipe defaults to gap 28. File engines are cold settled rebuilds; native defaults describe a bounded pass. The Editor preset Flow chooses compound-flow, `layout root flow` is built-in flow, and `engine=flow` is Directional flow. Sources: `compile.ts:recipe, engineArrangement, DEFAULT_CONTEXT`; `layout-engine.js:defaults`; `src/components/LayoutLab.tsx`; `coverage.csv`.

**Proposed change and boundary.** Add a compact context table, exact source/UI spelling map, effective-default notes and applicability links. Explain the current group-gap traffic floor/cap and file ordering limits now. Do not resolve a serializer defect by pretending one default applies universally.

**Acceptance.** Omitted/explicit recipe examples display their actual values. Flow's three meanings each resolve to the correct source/operation. The default marker in every numeric figure is the actual context default, even when Compare's convenient sweep steps differ.

### LR-003 — Preserve the fair ten-engine comparison and add graph families

**Classification:** Build · **Priority:** P1 · **Milestone:** M7. **Coverage:** L007–L016; E033, E075, E076, E078, E079. **Visuals:** VL01, VL43–VL45, V-E16, V-E32, V-E34.

**Evidence and consequence.** Every supplied engine metric reproduced locally. Boundary alignment removes one crossing with 81.6% more frame area and 48.4% more route length; compound spring adds 91.4% area and 11.9% length. Layered and compound-flow have equal canonical geometry on that graph. Tidy and flow share dimensions but have different routes. [Engine reproduction](evidence/engine-reproduction.json) and [supplied record](evidence/engine-variants-supplied.json) establish fixture-specific tradeoffs, not a universal ranking.

**Proposed change and boundary.** Keep all ten engines on the identical grouped-services input, at common world scale. Supplement it with forest, cyclic/disconnected network, nested and long-chain families. Preserve repeated results and separate current-plus-ten attempts from ten distinct engines. The existing contact sheet remains original evidence, not a newly generated screenshot.

**Acceptance.** Source hashes prove only the engine choice changes within each fair comparison. All ten choices remain accessible; full labels and changed routes are readable; area/length costs accompany crossing improvements. Graph-family guidance never attributes a strength that the supplied fixture does not demonstrate.

### LR-004 — Make registry and surface coverage an executable contract

**Classification:** Build · **Priority:** P1 · **Milestone:** M2. **Coverage:** all rows, including L076–L078 and derived R017–R019. **Visuals:** all mapped families and the four nonvisual groups.

**Evidence and consequence.** The baseline has fifteen `ENGINE_PARAMS`, not the prompt's initial lead of sixteen, and twelve `ROUTING_PARAMS`. Source comparison panels and Editor-only operations sit outside those registries. A count-only check would miss such choices or double-count Match canvas as another aspect control. Sources: `syntax.ts:ENGINES, ENGINE_PARAMS, ROUTING_PARAMS`; public UI/CLI inventories; [manifest](atlas-manifest.json).

**Proposed change and boundary.** Add a lightweight manifest validator: registry keys must map to canonical controls; each supported categorical state needs a fixture/recipe; numeric controls need default/range/applicability and meaningful samples; curated public operations need a visual or explicit nonvisual justification. Keep aliases and derived behavior types explicit. This is a coverage test, not a generated product-configuration framework.

**Acceptance.** Removing one registry mapping, categorical state, valid figure reference or public action recipe fails a focused check with the missing ID. All 197 canonical entries resolve. The six frozen routing construction templates are deliberately classified; no public choice is hidden behind a raw file count.

### LR-005 — Preserve complete fixtures and their execution evidence

**Classification:** Build · **Priority:** P1 · **Milestone:** M2. **Coverage:** all source-backed examples and native action starting states. **Visuals:** every actual-render family.

**Evidence and consequence.** The routing suite alone supplies 98 real source/SVG pairs and twelve verified frozen sweeps. Initial pinned examples still received automatic flow lanes until a constant row recipe removed that confound. The final QA also found fifteen valid supplemental files omitted from visible variant lists. [Routing results](evidence/routing/results.json), [layout results](evidence/layout/results.json) and the manifest show why “files exist” is weaker than reproducible visual coverage.

**Proposed change and boundary.** Keep full valid sources, input hashes, exact commands, exit status, geometry, route data, SVGs, metrics and categorized diagnostics. Isolate expected-failure repros. Expose counterexamples in the appropriate galleries, with per-file comparison references and exact native entry recipes. Do not rewrite intentional warnings out of evidence to make the suite look uniformly clean.

**Acceptance.** A clean artifact replay finds every referenced input and reproduces finite geometry/SVG for every positive fixture. Expected failures assert their documented category. Hash checks catch stale sources; no metric or warning record can be attached to a different input. Recipe-only and actually executed states remain distinguishable.

### LR-006 — Add one small comparison renderer and compute lazily

**Classification:** Build · **Priority:** P2 · **Milestone:** M6. **Coverage:** all visual families; E042–E050 as presentation precedents. **Visuals:** especially VL01, V-R01–V-R12 and multi-context editor families.

**Evidence and consequence.** `Docs.tsx` prepares all drafts before page swap and warms drafts across pages; `Example.tsx` caches compiled drawings. Applying that strategy unchanged to the complete atlas creates a source-established scaling risk. The current site has not been measured to have this prospective regression.

**Proposed change and boundary.** Add a focused `AtlasExample` using existing draw, worker, source, zoom and Playground paths. Render a verified baseline/selected variant first; compile opened or nearby variants on demand. Include subcomparison grouping, effective values, source diffs, status and optional authored mechanism overlays. Do not invent a second engine settings model.

**Acceptance.** Instrumented navigation performs no compilation for unopened families. Selecting one uncached variant triggers only its required work; reset/cache reuse is predictable. Page content appears before unrelated variants finish. Existing draft fences still work, and the project performance budgets are measured with the documented tooling rather than asserted from code inspection.

### LR-007 — Serialize the intended folding semantics

**Classification:** Build · **Priority:** P1 · **Milestone:** M4. **Coverage:** L029, L040; E013, E032–E036, E041. **Visuals:** VL15, VL33, V-E08, V-E17, V-E18, V-E20.

**Evidence and consequence.** The actual module probe starts with `fold=never` and a 2540×56 arrangement. Serializing `never` omits fold and recompiles to 812×336; serializing `auto` writes `fold=auto` and reaches the same folded geometry. A projected setting can still say never. This is a persistence defect, not an ineffective graph sample. Source: `layout-edits.ts:engineAttrs`; compiler folding paths; [fold probe](evidence/editor/probe-results.json).

**Proposed change and boundary.** Serialize against effective file-recipe defaults, emitting `fold=never` when required to preserve the choice. Retain distinct raw/native defaults. Review explicit RIGHT versus omitted auto as a related metadata-preservation case; equal node coordinates alone do not establish equivalence.

**Acceptance.** Omitted, auto and never states survive preview, Keep/Apply, saved source, fresh compile and reopen with the intended geometry. A long-chain regression reproduces the old failure and proves the fix. Legitimate native/default behavior remains covered. No browser round-trip success is claimed until that workflow is exercised.

### LR-008 — Isolate settings for independent sibling scopes

**Classification:** Build · **Priority:** P1 · **Milestone:** M4. **Coverage:** L017–L030, L032, L038, L041; E003, E037. **Visuals:** VL34, V-E03.

**Evidence and consequence.** `engineArrangement` merges a scope recipe over the previous result's mutated `doc.settings`. Swapping only two sibling layout statements changes group B width 1064→776 and gap 120→24; whole drawing width changes 2236→1948. An unrelated recipe's declaration position therefore changes the result. [Scope probes](evidence/layout/focused-probes.json); `compile.ts:656–715`.

**Proposed change and boundary.** Build each scope configuration from defined defaults, intentional ancestor inheritance and that scope's own attributes. Do not seed it from the last sibling solve. Preserve explicit child-recipe boundaries and genuine parent inheritance; flattening all inheritance would introduce another defect.

**Acceptance.** Permuting independent sibling recipe statements leaves each scope's effective settings and final geometry unchanged. A separate nested case proves intended inheritance still works. The check compares complete geometry and routes, not only diagram dimensions, and includes a sibling with omitted settings.

### LR-009 — Validate cell counts as structural integers and require finite output

**Classification:** Build · **Priority:** P1 · **Milestone:** M3. **Coverage:** L006, L065, L069, L070; E087, E089. **Visuals:** VL28, VL29, VL37 plus isolated cell repros.

**Evidence and consequence.** `columns=2.5` reaches an array allocation and fails with `Invalid array length`; `span=1.5` produces null width in JSON from nonfinite geometry. The parser currently applies finite/range checks without structural integrality. These are executed failures in [focused probes](evidence/layout/focused-probes.json), controlled by `syntax.ts:number` and `cells.ts:layoutCells`.

**Proposed change and boundary.** Require integers for structural columns and numeric spans, preserving the valid marker/span semantics. Add a finite-geometry boundary before serialization/export so a later unexpected failure cannot masquerade as a valid diagram. Use located DSL diagnostics rather than silently rounding these structural inputs.

**Acceptance.** Fractional, out-of-range and nonfinite structural inputs yield precise diagnostics without allocation exceptions, null coordinates or invalid SVG. Existing integer grids, unit cells, marker spans and narrow layouts remain finite. The negative cases are regression tests; they are not moved into a happy-path atlas as supported output.

### LR-010 — Give sequence bands and endpoints a finite, explicit policy

**Classification:** Build · **Priority:** P1 · **Milestone:** M3. **Coverage:** L005, L042, L043, L071–L073; R015, R029. **Visuals:** VL38 and isolated sequence repros.

**Evidence and consequence.** An empty participant group currently exports null x/width and misleading 13×13 metrics with zero warnings. A boxed-group message endpoint is accepted although lifelines are participant-oriented; nested participant ordering is also not equivalent to root direct-child order. [Sequence probes](evidence/layout/focused-probes.json); `compile.ts:sequenced`; `syntax.ts` sequence validation.

**Proposed change and boundary.** Reject empty participant bands and unsupported endpoint kinds with source-located diagnostics unless the maintainer deliberately defines finite geometry for them. Publish source declaration order as the dependable baseline ordering. A new group-lifeline feature or nested participant ordering semantics is separate from fixing invalid output.

**Acceptance.** Every accepted sequence object and message is finite, including empty-input boundaries, phases, self messages and grouped participants. Rejected group endpoints explain the supported alternative. Ordering tests state which sequence is authoritative. The implementation does not “fix” the crash by exporting a tiny empty image with no diagnostic.

### LR-011 — Make source Compare's capabilities match its execution branch

**Classification:** Build · **Priority:** P1 · **Milestone:** M5. **Coverage:** E029–E040; L017–L033 and L030's Match canvas state. **Visuals:** V-E03, V-E06, V-E15–V-E19.

**Evidence and consequence.** File rebuild/routing candidates dispatch source compilation, bypassing native candidate controls. Actual probes show identical source for offered respectDirection, respectManual, growContainers, layered flowStrength and canvas-aspect variants. Effort and session holds also do not become file semantics. Hosted example sessions are file mode too. Source: `comparison.ts:candidateSource, generate`; `engine-tasks.ts:compileCandidate`; [ignored-axis probes](evidence/editor/probe-results.json).

**Proposed change and boundary.** Decide capabilities before generation using a small context helper alongside existing registries. Offer only faithfully representable source controls; explain unavailable fields. Keep native warm/pass paths and explicit source recompilation distinct. Do not make a native candidate image and later serialize it lossily as the fix.

**Acceptance.** Every enabled source control either changes its effective source/compilation input or is explicitly a view preference. Unsupported axes cannot generate mislabeled duplicates. Selection, framed scope, holds, intent and viewport each have an asserted context contract. Source and native cases are exercised separately.

### LR-012 — Validate requested values before candidate execution

**Classification:** Build · **Priority:** P1 · **Milestone:** M5. **Coverage:** E035, E036, E038; L017–L030; R001–R012. **Visuals:** V-E18 and all numeric atlas families.

**Evidence and consequence.** The actual source Compare probe retains a title “Parallel edge gap = 1” while normalization writes and executes `edge-gap=4`. The native path rejects the same request. `ExplorerLab.parseValues` checks finiteness; native `candidate` additionally compares normalized values, but `candidateSource` does not. [Source clamp evidence](evidence/editor/probe-results.json).

**Proposed change and boundary.** Apply shared range, categorical and integer-policy validation before source/native dispatch. If a normalization is intentionally supported, store requested and effective values separately and label both. Do not silently change existing fractional routing-pass behavior while fixing an unrelated clamp; settle that policy explicitly.

**Acceptance.** Below/above range, invalid enum, fractional integer-like and nonfinite cases produce the same declared outcome across execution paths. No card displays an unexecuted value. Every valid default and boundary value remains reproducible, and exported experiment data retains effective settings.

### LR-013 — Carry source diagnostics through Compare

**Classification:** Build · **Priority:** P2 · **Milestone:** M5. **Coverage:** E031–E041, E052, E087, E088. **Visuals:** V-E16, V-E18, V-E20, V-E36; NV-E01.

**Evidence and consequence.** `compileCandidate` projects the compiled scene and returns `report:null`, without carrying a structured compiler diagnostic list. Compare cards display solver/routing information but lack the complete source explanation. This is source-established; no claim is made that all such failures were clicked in the browser. Source: `lib/engine-tasks.ts:compileCandidate`; `ComparisonDialog.tsx` candidate status rendering.

**Proposed change and boundary.** Return source diagnostics separately from optional solver reports, propagate warnings and located messages into cards/export, and reject error-level candidate application. Preserve a useful last-good drawing where appropriate. Do not invent iteration or convergence data for a compiler path that did not return it.

**Acceptance.** Pinned-conflict and relaxed-refinement cases show the exact diagnostic and relevant source line; an error cannot be applied as a valid candidate. Warnings survive experiment export/reload. A warning-free result is distinguished from a result whose diagnostics were unavailable.

### LR-014 — Make release-fixed-ports change file attributes or disable it

**Classification:** Build · **Priority:** P2 · **Milestone:** M5. **Coverage:** E039; R013, R014, R023. **Visuals:** V-E19, V-R13, V-R20.

**Evidence and consequence.** The executed probe clears both sides in a native candidate but leaves `fromSide:right` and `toSide:left` in the source candidate. `sourceWithRouting` edits only the global routing statement. Readers can otherwise believe they tested automatic ports while fixed constraints remained. [Release-ports probe](evidence/editor/probe-results.json); `comparison.ts:candidateSource`; `explorer-engine.js:200`.

**Proposed change and boundary.** Prefer concrete source edits removing the appropriate edge `from`/`to` attributes, displayed in the candidate diff. If that change is not implemented in the same release, disable and explain the checkbox in source contexts. Keep ordinary Auto ports selection semantics distinct from whole-experiment settings.

**Acceptance.** A file with both sides fixed produces the expected attribute removal and fresh-compiled automatic routes; Undo/Apply/reopen retain the documented source result. Unchecked candidates preserve both attributes. A disabled fallback never claims to have released them.

### LR-015 — Qualify coarse deduplication and visual equality

**Classification:** Build · **Priority:** P2 · **Milestone:** M5. **Coverage:** E074–E076, E079, E089; R011. **Visuals:** V-E31, V-E32, V-R12; NV-E04.

**Evidence and consequence.** `variants.ts:draw` builds a key from dimensions and centers/route points rounded into 4-unit bins. Actual radius 0/6/16 variants share the key but yield three distinct rendered paths. Exact sweeps retain these with “same as” tags; suggestions may discard them. [Radius vary probe](evidence/editor/probe-results.json) and [actual path comparisons](evidence/routing/comparisons.json).

**Proposed change and boundary.** Immediately label the existing claim “same coarse geometry.” Use separate exact geometry/route and normalized rendered-path signatures when promising stronger equality. Preserve meaningful appearance changes and exact requested repeats. Do not require byte-identical SVG as a semantic test when incidental serialization IDs can differ.

**Acceptance.** Rounded/square paths are never described as visually identical. Small coordinate changes can share a coarse tag without losing their actual data. The retained source diff, exact points and rendered path explain precisely which layer is equal.

### LR-016 — Teach cold ordering's no-effect result and the warm distinction

**Classification:** Build · **Priority:** P2 · **Milestones:** M1 and M8 contract review. **Coverage:** L028; E034–E036. **Visuals:** VL13, V-E17, V-E18.

**Evidence and consequence.** File compilation always chooses a cold rebuild. `layeredTarget` takes the same ordering branch for stable/crossings in that context; the paired file fixtures have equal nodes and routes. A before/after claiming different cold results would be fabricated. Sources: `compile.ts:engineArrangement`; `layout-engine.js:layeredTarget`; [layout sweeps](evidence/layout/sweeps.json).

**Proposed change and boundary.** Publish the identical cold pair and explain the applicable warm context. Distinguish graph-specific equality from source-established inertness. Review this contract in M8 without silently changing cold semantics; genuine new file-ordering behavior is LR-034, an optional Explore item.

**Acceptance.** The cold page and reference agree with exact geometry evidence. Warm demonstrations identify their starting geometry and recorded execution status. No wording implies stable/crossings always changes every graph, and no cold example is replaced with a warm result under the same caption.

### LR-017 — Explore honoring the advertised group-gap request after traffic capping

**Classification:** Explore · **Priority:** P2 · **Milestone:** M8. **Coverage:** L018, L032, L041. **Visuals:** VL03, VL34.

**Evidence and consequence.** The parser accepts group-gap 12–180, while packed compound/layered layout computes `min(96, max(request, traffic))`. Actual 96/120/180 fixtures render identically. The gap is shared drawing-wide, so a request is not an independent exact per-group separation. Source: `compile.ts:2469`; [sweep evidence](evidence/layout/sweeps.json).

**Proposed change and boundary.** Preferred policy: cap the traffic-derived contribution, then take its maximum with the explicit legal request, preserving necessary safety floors. Evaluate this on grouped/nested and growth cases before changing output. Publish the current cap now under the contextual reference. This recommendation does not claim that the preferred formula is already implemented or corpus-validated.

**Acceptance / decision exit.** Produce measured old/new geometry for 96/120/180 and mixed-scope requests. The selected policy either honors the advertised request or narrows/labels the effective domain explicitly. Check overlap, container growth and corpus quality; release any changed geometry deliberately. No open-ended demand study is required to resolve the bounded policy.

### LR-018 — Diagnose ignored specialized controls before adding new semantics

**Classification:** Build · **Priority:** P2 · **Milestones:** M3; M8 only for bounded extension decisions. **Coverage:** L005, L006, L021, L031, L033–L036, L040, L043, L065–L073. **Visuals:** VL06, VL16, VL19, VL28–VL38, VL43.

**Evidence and consequence.** Unit modifiers without `unit` can be ignored without validating their values; sequence overwrites ordinary gap/direction/position controls; root minima are accepted but unused; tree root validation does not require scope membership. Integer-like sweeps and duplicate order members also need a consistent policy. [Focused probes](evidence/layout/focused-probes.json); `syntax.ts` specialized validation; `compile.ts:sequenced, arrange`.

**Proposed change and boundary.** Reject unsafe values; add located unsupported-setting diagnostics for harmless ignored combinations; require meaningful tree scope and valid order membership. Document actual zero/strength behavior and group-fold scope. Expanding sequence spacing, root framing or other specialized semantics requires a separate fixture-backed decision in M8, not a quiet interpretation change.

**Acceptance.** Each retained input either has a demonstrated effect/applicability or a precise diagnostic. Valid cells, sequence, lanes and tree examples continue to work. Errors and warnings are chosen by the recorded compatibility policy, and an irrelevant attribute can no longer masquerade as an executed experiment.

### LR-019 — Complete the existing routing controls with standoff

**Classification:** Build · **Priority:** P2 · **Milestone:** M8. **Coverage:** R012, R020, R021; E035, E036. **Visuals:** V-R02, V-R18, V-R19, V-E18.

**Evidence and consequence.** `ROUTING_PARAMS` exposes twelve settings, but the routing menu and Compare axes expose eleven: standoff is missing. Its legal source range is 0–40 and its default is 20. The source and native router already support the value, so users currently need source/API access for a documented public setting. Sources: `syntax.ts:ROUTING_PARAMS`; `Menus.tsx` routing sliders; `src/engines/explorer-engine.js:ROUTE_PARAMS` and `src/components/comparison/ComparisonSidebar.tsx:113`; [routing inventory](coverage.csv).

**Proposed change and boundary.** Derive the routing controls from the shared public registry or a thin registry-backed UI map. Add standoff to the menu and both Compare axes, with meaningful steps 0/20/40 and the same unit/range explanation. Confirm that Balanced and Fewer crossings reset it consistently to the default. This does not expose internal quick/facing/title-band/window/tidy/jog flags as new public settings.

**Acceptance.** All twelve registered choices are reachable, labeled and validated in both supported execution contexts. Changing standoff persists through the context's established save path. The UI explains that it is a preferred distance, and a source comparison warns that recompilation can also change reserved channel space. The 0/20/40 example links to both its measured effect and its honest no-effect counterexample.

### LR-020 — Correct routing explanations to match the mechanisms

**Classification:** Build · **Priority:** P1 · **Milestone:** M1. **Coverage:** R001–R019, R022, R029. **Visuals:** V-R01–V-R18, V-R22, V-R24.

**Evidence and consequence.** A source routing change moves eighteen compiled objects in the channel fixture. Standoff is a soft cost with measured distances 10/20/10 across 0/20/40. Passes 1 does not suppress pair repair and finishing; the reported pass setting is not a count of every executed algorithm stage. Roomy facing fans and declared-axis routes have cost exemptions. Title-band protection has eligibility and detour rules. For an interior cell, the raw measured route is 26 units while the full extended polyline is 78. Sources: `routing-engine.js` and `compile.ts` routing paths; [routing comparisons](evidence/routing/comparisons.json); [source audit](evidence/routing-source-audit.md).

**Proposed change and boundary.** Replace unconditional promises with applicability and mechanism explanations. Distinguish source recompilation, native rerouting and genuinely frozen examples. Explain cost weights, visual distances, finishing stages, derived lanes and metric scope separately. Add annotations to the actual matching exports, including exceptions and equal outcomes. No default or routing algorithm changes are needed for this correction.

**Acceptance.** Each table hint and figure caption can be traced to the relevant branch and fixture. The source-mode “shapes never move” claim is removed or qualified. No caption promises monotonic improvement, exact hard clearance from a soft cost, universal title-band exclusion or globally optimal routes.

### LR-021 — Prevent unsupported file controls from implying persistence

**Classification:** Build · **Priority:** P2 · **Milestone:** M5. **Coverage:** E025–E027; R024–R028. **Visuals:** V-E13, V-R21.

**Evidence and consequence.** File Inspector container direction/padding updates can mutate a projected document and then snap back because the file translator omits those changes. Native manual bends and label offsets have no existing `.draft` representation. Fit contents is already disabled in file mode, showing that a capability boundary can be expressed before the action. Sources: file projection/edit translation; Inspector controls; [persistence probes](evidence/editor/persistence-results.json).

**Proposed change and boundary.** Use the same explicit mode capabilities as source Compare. Disable an unsupported file control with a concise supported alternative, or translate it only where the existing language faithfully represents the operation. Keep native JSON editing and persistence available. New waypoint or label-offset syntax remains LR-031; it is not a prerequisite for honest controls.

**Acceptance.** Every enabled file action produces a source edit whose fresh compile preserves the intended effect, or is clearly identified as a view preference. Unsupported gestures are blocked or explained before the edit. Native bend/label recipes save a snapshot before destructive removal and can reopen it in a fresh native session; recipe documentation does not claim browser verification until performed.

### LR-022 — Explain commit boundaries, current approach, scope and holds

**Classification:** Build · **Priority:** P2 · **Milestone:** M1. **Coverage:** E011–E020, E053–E073, E077, E086. **Visuals:** V-E07–V-E10, V-E23–V-E30, V-E33, V-E35.

**Evidence and consequence.** The preview workflow calls `onBeforeEdit(acceptPreview)`, so a subsequent ordinary edit can accept the preview. Tidy positions uses the document's current algorithm. Timeline inherits the current scope/selection; brush holds are session constraints, not saved file pins. File warm passes write geometry refinements, whereas rebuild and CLI candidate generation differ in which authored refinements they retain. Sources: `App.tsx` preview callbacks; scene layout actions; Timeline/brush state; [editor audit](evidence/editor-source-audit.md).

**Proposed change and boundary.** Put a short operation contract beside each action: inputs, scope, persistence, commit/cancel behavior and what survives reopening. Make Keep/Discard and the implicit acceptance boundary understandable. Teach holds alongside pins with their different persistence. This recommendation changes guidance and labels; any altered undo or commit behavior needs a separate explicit behavior patch.

**Acceptance.** Recipes state the starting approach, selected scope, action, acceptance step and saved artifact. Reopening instructions distinguish native JSON from source files. Model-produced after states are labeled as such. No text promises a universal undo/reopen result that the actual state path does not support.

### LR-023 — Make dense comparisons readable and operable on small screens

**Classification:** Build · **Priority:** P2 · **Milestone:** M6. **Coverage:** L076–L078; E042–E050, E054–E057; all atlas presentation. **Visuals:** VL01, VL46, V-E21–V-E24 and all multi-variant families.

**Evidence and consequence.** The supplied contact sheet fits each result to its own card, visually concealing area tradeoffs. Existing Compare supports anchors, fit/100%, overlays and keyboard navigation; the documentation renderer can reuse those concepts. A complete atlas also introduces many labels, sources and controls that must remain understandable below desktop width. This is a design requirement and source-based inference, not a completed mobile usability study. Sources: supplied contact sheet; Compare controls; [visual atlas specification](visual-atlas.md).

**Proposed change and boundary.** Use a common world scale inside fair comparisons, a labeled scale switch, readable anchors and text metrics. On small screens, show a selected pair or one variant with an accessible selector and persistent baseline reference; do not shrink ten diagrams into unreadable thumbnails. Provide keyboard selection, visible focus, non-color-only changes and reduced-motion handling.

**Acceptance.** At narrow and desktop widths, users can reach every state and source, understand the active baseline and read essential labels without hover. Keyboard navigation preserves logical order and announces status. A shared-scale figure never silently changes to independent auto-fit. Record browser and accessibility checks when the renderer is implemented; the current package does not claim those future checks passed.

### LR-024 — Prove behavior across preview, Apply, source and fresh compile

**Classification:** Build · **Priority:** P1 · **Milestone:** M9. **Coverage:** all persistent choices, especially L029, L033, L040; R001–R016; E013, E014, E039, E041, E058, E062, E086. **Visuals:** VL15–VL17, VL33, V-E07, V-E08, V-E20, V-E25, V-E35.

**Evidence and consequence.** The folding failure demonstrates that a correct-looking candidate and a displayed setting do not prove saved source correctness. Persistence probes also distinguish source edits, projected geometry and native state. File stays can round coordinates; the observed model round trip had a maximum coordinate difference of about 0.489, which must not be described as exact equality. [Editor probes](evidence/editor/probe-results.json); [persistence evidence](evidence/editor/persistence-results.json).

**Proposed change and boundary.** Add a focused persistence proof for each supported path: generate or edit, Keep/Apply, save, freshly compile or reopen, then compare the contract-relevant settings, geometry, routes and metadata. Reuse the existing Viewer/debug and screenshot workflows. Declare tolerances only where serialization intentionally quantizes values; avoid a broad tolerance that hides a lost control.

**Acceptance.** The fix for LR-007–LR-014 survives a fresh compile independent of the preview cache. Native snapshots and source saves each obey their own documented contract. Finite geometry is required. UI, model and CLI proofs carry separate status, commands and evidence; the gate cannot pass solely because a model helper produced an after state.

### LR-025 — Keep the skill, language reference and release metadata synchronized

**Classification:** Build · **Priority:** P1 · **Milestones:** M1 and every applicable implementation change. **Coverage:** all public syntax, defaults, operations and agent-facing instructions. **Visuals:** every affected family.

**Evidence and consequence.** `AGENTS.md` requires language/reference changes to update the Draftably skill in the same PR and defines skill checks and changeset expectations. An accurate human guide alongside stale agent instructions would recreate the same unsupported examples during integration. The current review also separates internal flags and unsupported syntax from real public options. Sources: `AGENTS.md`; `docs/CHECKS.md`; the packaged skill and its tests.

**Proposed change and boundary.** Update the relevant skill/reference examples with the contextual defaults, supported recipes, validation and persistence behavior as each patch lands. Add required release metadata for affected source, examples, DSL documentation and CLI changes. Use the actual repository rules; do not invent an exception to omit a required check or changeset.

**Acceptance.** Parser behavior, reference, page copy, skill guidance and fixtures agree in the same reviewed change. `pnpm skill:check` and applicable skill tests pass in the complete checkout. Changed public behavior has the required changeset. A source-backed example in the skill compiles under the target baseline or is explicitly labeled as a future change rather than presented as existing syntax.

### LR-026 — Finish the repository gates in a complete checkout

**Classification:** Build · **Priority:** P1 · **Milestone:** M9. **Coverage:** program-wide integration and release readiness. **Visuals:** every figure promoted into the site.

**Evidence and consequence.** The supplied ZIP omits reference engine assets, release source and held-out growth fixtures needed by some checks. Local TypeScript/ESLint and the site build completed; the fast chain hit formatting differences in 253 unchanged packet files, and some unit checks were blocked by omitted material or environment restrictions. Two loopback suites passed after a permitted rerun. Early Chromium package downloads failed; a later stable Chrome Headless Shell download enabled offline-atlas browser checks and the full CLI radius export. Native Editor gestures and the full repository browser gates remain unverified; the delivered viewer proof does not substitute for them. [Gate logs](evidence/checks/check-fast.log), [unit log](evidence/checks/unit-tests.log), [network rerun](evidence/checks/network-tests.log), [site build](evidence/checks/site-build.log).

**Proposed change and boundary.** Integrate into the actual complete checkout, restore normal repository/toolchain inputs, and run the required scoped and release gates described by `AGENTS.md` and `docs/CHECKS.md`. Preserve the artifact's blocked/failure provenance. Do not invent missing fixtures or mass-format unchanged source to manufacture a green report.

**Acceptance.** The final PR records exact commands and truthful pass/fail/skip status for required checks, site proof, visual proof and any affected benchmark/corpus gate. Baseline formatting noise is resolved or separately attributed under repository policy. Successful hosted-site observations are never substituted for the pinned local build. Remaining blockers are explicit release decisions, not hidden as completed validation.

### LR-027 — Explain what recommendations and metrics actually optimize

**Classification:** Build · **Priority:** P2 · **Milestone:** M1. **Coverage:** L005; R029; E074, E078, E079, E087, E089. **Visuals:** VL01, V-R22, V-E31, V-E34, V-E36; NV-E04.

**Evidence and consequence.** The recommendation guard rejects extra warnings/crossings and constrains area growth; fit changes its area allowance and closeness criterion. `--prefer` changes ordering, not that guard. Thus the supplied current variant can remain recommended while zero-crossing engines require substantially more space. Movement metrics normalize translation and include visible groups; raw router length may exclude appended cell extensions. Sources: `variants.ts:improves` and ranking/measurement; `compile.ts` special edge paths; [supplied variants](evidence/engine-variants-supplied.json); [routing comparisons](evidence/routing/comparisons.json).

**Proposed change and boundary.** Place metric definitions and the recommendation guard beside the results. Label measured populations and units. Distinguish a fixture winner, a policy recommendation and a general engine recommendation. Explain how a user can inspect a candidate that the guard does not recommend. Do not retune the guard merely to make an attractive screenshot win.

**Acceptance.** The documented guard reproduces the supplied recommendation and the effect of fit/preference. Readers can see why a lower-crossing candidate loses. Crossings, bends, area, movement, compiler warnings and quality notes have precise scopes. No engine is advertised as universally best on evidence from one graph.

### LR-028 — Separate geometry, rendered paths and diagnostic ledgers

**Classification:** Build · **Priority:** P1 · **Milestone:** M2. **Coverage:** R003, R006, R011, R012, R029; E075, E076, E087, E089; all evidence-bearing entries. **Visuals:** V-R04, V-R07, V-R12, V-R18, V-R22, VL01 and every equality/counterexample family.

**Evidence and consequence.** Corner radius changes SVG curves while preserving route points and the coarse geometry key. Edge-gap variants can share crossings/bends/length yet have different middle coordinates. Shared-cost headline metrics can match while shared length changes 420→39→39. The routing fixture checks also produce intentional quality notes that are distinct from compiler warnings. [Exact comparisons](evidence/routing/comparisons.json), [execution records](evidence/routing/results.json), [final routing QA](evidence/final-qa-routing.md).

**Proposed change and boundary.** Store separate equality fields for node rectangles, exact route points, relevant SVG path data and coarse presentation fingerprint. Keep compiler diagnostics/conflicts and `check --metrics` quality notes in separately named ledgers. Bind each result to a source hash and each mixed gallery to its own per-variant reference. Describe the equality observed; do not infer semantic identity from SVG bytes alone or hide repeated outcomes.

**Acceptance.** A corner-radius change is recognized as a rendered difference even when geometry is equal. The equal-headline edge-gap example is retained as different routing. All ninety-two illustrated routing sources and six deliberate construction templates reconcile with the manifest. Expected diagnostic differences remain visible and cannot be silently converted into a single “0 warnings” badge.

### LR-029 — Avoid a new layout dependency or engine rewrite for this mission

**Classification:** Avoid · **Priority:** P3 · **Milestone:** scope boundary for M1–M9. **Coverage:** L007–L030, R001–R019. **Visuals:** VL01, all engine families and routing sweeps.

**Evidence and consequence.** The baseline already contains ten public engine choices and a substantial routing implementation. The demonstrated high-impact failures concern serialization, validation, scope propagation, capability honesty and explanation. The supplied comparison shows meaningful tradeoffs and repeated results; it does not establish that the current engine architecture must be replaced. Sources: engine/router implementation; [ten-engine reproduction](evidence/engine-reproduction.json); the focused defect records referenced above.

**Proposed change and boundary.** Preserve the existing algorithms while repairing the proven defects and documenting their strengths and limits. Use primary algorithm sources to explain lineage carefully; do not label the in-house heuristics as ELK, libavoid, exact optimization or an algorithm they do not implement. A future engine proposal must name an unmet graph family and compare current/future output, costs and integration burden.

**Acceptance / exclusion.** The documentation/coverage program adds no layout dependency and performs no wholesale engine rewrite. Required fixes remain small and attributable. This boundary does not prevent a separately justified future capability proposal with concrete cases and corpus evidence.

### LR-030 — Explore a true frozen-geometry source Compare after correctness fixes

**Classification:** Explore · **Priority:** P3 · **Milestone:** optional M10, after M5. **Coverage:** R001–R019; E032, E034–E041. **Visuals:** V-R01–V-R18, V-E17–V-E20.

**Evidence and consequence.** Native routing and the curated pinned sweeps can hold object rectangles fixed, but arbitrary source recompilation also reserves channels and can move nested objects. The channel example documents eighteen changed objects. Calling every source routing comparison frozen would mislead the user about causality. [Routing comparisons](evidence/routing/comparisons.json); compiler channel/lane paths.

**Proposed change and boundary.** Investigate an explicit mode that freezes the same compiled world rectangles, endpoint/lane metadata and prior-route policy for every candidate. Define how side release, cold versus warm history, and Apply persistence work before exposing it. A frozen preview whose saved source recompiles differently must not be presented as a faithful source edit. Ordinary source Compare capability fixes and complete parameter teaching do not depend on this extension.

**Acceptance / decision exit.** Demonstrate arbitrary nested-group cases with exact rectangle equality and genuine routing changes. State and test the permitted geometry/route history. Apply either reproduces the promised result from saved source or clearly saves a supported native snapshot. If the persistence contract cannot be made clear and reproducible, keep this mode out of the core program.

### LR-031 — Defer new DSL waypoint and label-offset syntax

**Classification:** Defer · **Priority:** P3 · **Milestone:** outside M1–M9; no dependency for completion. **Coverage:** R024–R028. **Visuals:** V-R21.

**Evidence and consequence.** Native diagrams already support bend editing and label offsets, while the file translator has no matching public source representation. Adding syntax would introduce coordinate-frame, nesting, endpoint-change, validation and serialization questions beyond documenting the existing choices. Sources: native edge model/actions; file edit translation; [routing and persistence audits](evidence/editor/persistence-results.json).

**Proposed change and boundary.** Keep the complete native action recipe and supported JSON save/reopen path. Make the file limitation explicit under LR-021. Reconsider source syntax only with a concrete use case and a complete rule for parent movement, edge reversal, invalid/obsolete waypoints, labels, defaults and version compatibility. Do not add plausible-looking attributes to runnable examples before the parser supports them.

**Acceptance / exclusion.** The core atlas covers every existing native operation, and file-mode controls accurately express their capability. No new waypoint or label-offset source grammar is required or claimed. A future proposal must include parser, validation, serializer, compiler, skill, fresh-reopen tests and migration behavior together.

### LR-032 — Avoid a Cartesian wall of every possible setting combination

**Classification:** Avoid · **Priority:** P2 · **Milestones:** M2, M6, M7. **Coverage:** every categorical and numeric control, particularly E035, E036, E075, E076. **Visuals:** all comparison families.

**Evidence and consequence.** Many settings are context-dependent or produce identical results on particular graphs; complete Cartesian expansion multiplies uninformative cells and can conceal causality. The CLI already bounds candidate counts, and the final visual review found the need for independent references within mixed galleries. A wall of variants is not proof that the changed control caused the visible difference. Sources: CLI variation limits; [atlas manifest](atlas-manifest.json); [routing QA](evidence/final-qa-routing.md).

**Proposed change and boundary.** Cover every supported categorical state and each numeric default/meaningful sweep through focused one-axis comparisons, purposeful two-axis cases and explicit interaction/counterexample panels. Use identical sources apart from the declared changes within each pure comparison. Keep completeness in the manifest and navigation, rather than forcing every state into one viewport. This exclusion must never be used to drop an inconvenient public choice.

**Acceptance / exclusion.** Every inventory value has a reachable example or justified action recipe. Numeric routing sweeps prove fixed rectangles. Mixed-family galleries disclose their different graphs and independent baselines. The page remains readable, and opening one example does not instantiate a screenful of active editors.

### LR-033 — Avoid a new docs framework or generic settings playground

**Classification:** Avoid · **Priority:** P3 · **Milestones:** M1, M6. **Coverage:** site navigation, examples, atlas delivery and all public controls. **Visuals:** all embedded families.

**Evidence and consequence.** Existing documentation already discovers pages, indexes DSL headings, renders editable examples and links to Playground. Existing Compare already supplies candidate and inspection concepts. Duplicating those systems introduces competing state, persistence and labeling logic precisely where the audit found cross-surface mismatches. Sources: `site/docs/content.ts`, `Docs.tsx`, `Example.tsx`, `LiveEditor.tsx` and Compare components.

**Proposed change and boundary.** Extend the existing site with one narrowly scoped comparison renderer and a shared fixture/coverage manifest. Keep guide grouping and slug precedence explicit. Reuse the current editor/worker/render/export flows. Do not turn the atlas into a second universal settings application or require a new documentation stack before useful pages ship.

**Acceptance / exclusion.** The implementation preserves existing example and Playground handoff behavior, introduces no parallel source of setting defaults, and keeps current useful URLs working. New pages appear in intentional navigation groups without duplicate/ambiguous routes. Rendering support remains proportionate to the actual visual contract rather than becoming a new product prerequisite.

### LR-034 — Explore concrete cold-file ordering semantics separately

**Classification:** Explore · **Priority:** P3 · **Milestone:** optional M10. **Coverage:** L028, L042, L043; E034. **Visuals:** VL13, VL35, V-E17.

**Evidence and consequence.** In the current cold file path, stable and crossings reach the same ordering behavior. Warm model evidence can demonstrate a distinction under different starting conditions, but it cannot establish that the existing file choice works differently. LR-016 makes that truth clear immediately. Sources: `layout-engine.js:layeredTarget`; compiler engine context; [layout sweeps](evidence/layout/sweeps.json); [warm model evidence](evidence/layout-warm/model-render-results.json).

**Proposed change and boundary.** Investigate a specific cold contract only when a concrete graph needs it: for example, stable preserves eligible declaration order within a rank while crossings permits a defined crossing-reduction order. Evaluate scope inheritance, pins, refinements and branch ordering. Do not promise monotonic crossing improvement or silently reinterpret `order` as a different setting.

**Acceptance / decision exit.** Produce a deterministic cold fixture with no prior geometry where the two policies meaningfully differ; explain the policy and its cost with actual source/render evidence. Confirm repeatability, nested scope behavior and fresh compile persistence. If the distinction is not useful or compatible, retain the documented current limit. Completion of the full atlas and core fixes does not wait for this optional behavior.

## Implementation risks and controls

The recommended sequence separates truthful documentation, correctness repairs and optional semantics so that each change is reviewable. The detailed file targets, dependencies and commands are in [implementation-plan.md](implementation-plan.md).

| Risk | Why it matters here | Control and proof |
| --- | --- | --- |
| Default/persistence repairs alter old output | Fixing omitted fold or explicit direction can change how existing source is serialized or interpreted. | Test omitted and explicit states independently; retain raw/native versus effective file defaults; release the behavior deliberately with fresh-compile proofs. |
| Scope isolation breaks intended inheritance | The sibling leak fix must not eliminate legitimate ancestor settings. | Pair sibling-order permutation tests with nested ancestor inheritance fixtures and unchanged unrelated groups. |
| Stronger validation rejects formerly accepted input | Unsafe fractional values currently get far enough to throw or emit null geometry; harmless ignored values need a different response. | Define error versus warning policy per input, use located diagnostics, and protect all valid structural examples. |
| Spacing policy grows drawings unexpectedly | Honoring high group-gap requests changes geometry and may increase area across nested graphs. | Keep LR-017 bounded and separately reviewed; compare measured old/new corpus output and cap only the intended contribution after policy agreement. |
| Lazy rendering produces stale or inaccessible state | Async compilation, caching, reset and focus interact across many variants. | Key results by full source/context identity, reject stale completions, keep status and focus predictable, and instrument compile counts on narrow and desktop layouts. |
| A visually persuasive panel makes a false causal claim | Independent auto-fit, different graphs, changed hidden settings or the wrong baseline can manufacture a visible improvement. | Common world scale, source diffs, explicit context, per-subcomparison references, fixed-rectangle checks and mechanism annotations linked to actual exports. |
| Route history or quantization is mistaken for persistence loss | Warm router history and rounded saved stays can change output legitimately; broad tolerances can also hide real defects. | Declare cold/warm context and intentional precision by field; compare settings/metadata as well as geometry; keep exact checks where no rounding is expected. |
| Incomplete packet/environment becomes a false release gate | Missing assets and unavailable browser setup can produce failures unrelated to the proposed patch, while local model success is weaker than UI success. | Preserve the supplied evidence, run required gates in the complete checkout, and report every command's real status. Do not stub missing corpus data or claim a browser proof from a model render. |

## User-facing wins and completion criteria

The program should deliver the following concrete outcomes. These are acceptance goals, not claims of a completed usability study.

- **A clear first decision.** A reader with a crowded drawing can choose between layout, a local refinement, routing or viewport framing, with the right persistence expectations.
- **Every public choice is discoverable.** The reference, coverage inventory and visual family links agree; all supported categorical states and meaningful numeric samples remain accessible, including equal results and exceptions.
- **A comparison means what it says.** Requested and effective settings match, unsupported axes are explicit, diagnostics travel with source candidates, and common scale exposes area costs.
- **Saved work survives reopening.** Folding, scope settings, source edits and supported native actions have fresh-compile/reopen evidence. Unsupported gestures are explained before they can appear to succeed.
- **Routing becomes teachable without overpromising.** Actual examples show ports, obstacles, lanes, cost tradeoffs, pass finishing and rendered rounding, with metrics whose scope is stated.
- **The atlas is usable in ordinary browsing conditions.** A small-screen reader can choose variants, inspect source and understand changes without waiting for every diagram or losing keyboard access.
- **Codex can integrate and verify the work.** Stable IDs, complete companions, hashes, exact commands, scoped defects, skill updates and truthful gates replace guesses about what a figure represents.

Core completion means M1–M9 satisfy the full coverage and persistence contracts in the implementation plan. LR-030 and LR-034 remain optional investigations; LR-031 is deferred; LR-029, LR-032 and LR-033 remain explicit exclusions. The bounded LR-017 policy decision must end in an honest documented domain and, if behavior changes, a measured reviewed implementation. None of these boundaries removes existing public options from the coverage requirement.
