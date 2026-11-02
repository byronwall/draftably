# Evaluation method and experiment contract

**Executed baseline:** `f14d9b891adba75de6cc172b190017ea5a5ca091`, from the attached source packet. The supplied prompt and protocol are preserved verbatim in `evaluation/supplied-prompt.md` and `evaluation/supplied-protocol.md`. This document describes the actual procedure, including departures and measurement limits. Final counts and findings are in `report.md` and `data/execution-summary.json`; a successful process exit is never substituted for geometric validity.

## 1. What is being compared

The main units are independent base diagrams and their jobs. An experimental trial is one declared combination of source/input state, layout method/settings, routing settings, direction, history and edit. A trial can invoke several actual layout computations because the compiler lays out nested scopes, refines arrangements or searches a requested fit. Those nested calls are instrumented separately. Repeated timing invocations are counted, but they do not become independent diagrams.

Three kinds of capability remain distinct:

| Capability | Shipped path | Interpretation |
| --- | --- | --- |
| Cold source rebuild | `syntax.parseModel` → `compile` → `projectScene` → production routing/labels | Deterministic source interpretation, explicit engine/recipe, refinements and authored constraints |
| Native structural recipe | Compiler's flow, row, column, lanes, sequence or cells implementation | Encodes arrangements or task semantics; recipe `flow` is not engine `flow` |
| Warm repair/edit | Existing projected document → actual `LayoutLab.compute` → production routing/labels | Depends on current positions, pins, manual flags, scope and shared prior sides |

The ten source engines are `compound-flow`, `boundary-align`, `compound-spring`, `tidy`, `stress`, `force`, `flow`, `layered`, `tree` and `grid`. `separate` is evaluated as a warm overlap-repair action. No external graph-layout library or Python approximation replaces a shipped algorithm.

The adapter imports the unchanged TypeScript through Vite SSR and the unchanged JavaScript engines. Instrumentation observes `LayoutLab.compute` reports and invocation counts; it does not alter settings, update equations or stopping rules. Production `routeInput`, `RouteLab.compute`, `drawRoutes` and `renderSvg` provide routing, labels and render evidence. Engine-only test suites are reported separately from the full pipeline.

## 2. Frozen corpus and applicability

The main corpus contains **72 bases: 12 families × six cases**, with four development and two fresh heldout cases per family. All variants and edits remain with their base. The split was fixed before candidate quality was inspected.

| Property | Count or rule |
| --- | --- |
| Development / heldout | 48 / 24 |
| Exact existing / newly generated bases | 24 / 48 |
| Small, 4–12 nodes | 29 |
| Medium, 13–35 nodes | 22 |
| Large, 36–100 nodes | 21 |
| Declared common / niche jobs | 42 / 30 |
| Common heldout bases | 14 |
| Additional sanity fixtures | Empty and single-node |
| Optional scale fixtures | Sparse network with 180 nodes; layered DAG with 220 nodes |
| Assigned edit bases | 24 across all 12 families; case 03 development and case 05 heldout |

Families are pipelines, DAGs, hierarchies, architecture, cycles, networks, disconnected drawings, routing congestion, containers, presentation constraints, authored placement and structural recipes. The manifest gives every base a task, intended reading order, explicit constraints, acceptable ambiguity, format, expected identities, provenance and pass criteria. The common/niche labels are benchmark assumptions, not estimates of real usage.

Existing cases are copied byte for byte and hash-checked. The original historical corpus, historical heldout material, examples and regression sources are preserved separately. Historical heldout cases are development material; they are not counted as fresh unseen evidence. Generated siblings have distinct graph motifs/topology and source expectations, not merely renamed IDs. Source parsing, identity counts and edit invariants were checked with the shipped parser.

Root sequence and lane recipes are protected from unrelated root-engine replacement. This excludes two development bases and one heldout base from generic engine screening. The user jobs still count in coverage, served through the native recipe. Cell recipes nested inside groups remain intact while the ordinary outer arrangement is screened. Every root replacement preserves nested layout lines, pins, explicit sizes and other source refinements. The replacement deliberately resets unrelated root numeric settings to the tested defaults; authored `fit` and root minimum dimensions are retained unless the specific sensitivity task removes them.

This yields 48 current-source plus 46×25 development screen tasks, and 24 current-source plus 23×25 heldout tasks. The 25 alternatives are 20 engine/direction combinations and five ordinary recipe/no-root-layout baselines. Identical outcomes are retained as separate declared configurations, then explicitly deduplicated in equivalence analysis. They are not counted as additional independent cases.

Corpus manifest SHA-256: `6847fe5ee8458059cb0edf12f33174e2005cd39375c45a031fe951aa992dc059`. The 24 frozen-position routing fixtures use a separate manifest with SHA-256 `19c6fdc6cf7adec0e5efd42fbe3fbf2df9707a3b2eac81ec56d39da8c5fd7c5a`.

## 3. Metrics, calibration and hard gates

The metric module, source settings, routing fixtures and corpus were frozen before candidate wins were inspected. `data/protocol-freeze.json` records their hashes and the initial experiment start. `evaluation/metrics-spec.json` contains the full three weight tables and normalization rules. Additional input-intent checks were frozen before the engine screen; their calibration record is separate.

The metric calibration has 20 tiny fixtures: 18 core checks plus two visibility checks. A clean core invocation makes three actual router calls; its records distinguish analytical constructions from actual-router outputs. Four saved production sanity examples provide additional architecture, sequence, cells and pipeline checks. The fixtures cover overlapping rectangles, an obstacle, fixed straight-path crossing, a crossing-avoiding detour, explicit sides and a deliberate side violation, fixed/moved pins, disconnected nodes, relabeling without topology change, label ownership/detachment, title bands, translation invariance, edge normalization and diamond boundaries. The visibility checks cover collapsed proxies and soft groups. Ten analytical source-intent tests check the separate intent module. Analytical calibration drawings are labelled as such; they are not presented as shipped algorithm outputs. Exploratory reruns are not conflated with the final fixture count.

Hard validity is evaluated before soft scores. The measured gates include finite and complete geometry; required object and semantic edge identities; missing/duplicate/unexpected routes; blocked routes; wrong route endpoint IDs; disconnected terminal geometry; violated authored sides; unrelated object overlap; route-through-node penetration; forbidden pin/scope movement; and the explicit intent failures supported by the intent checker. Layout failures and routing failures are retained separately. Unavoidable crossings remain soft costs.

Source identity requirements come from the parsed input, not the resulting document. This avoids a tautological completeness check. Parent-local source pins are checked against the compiled scene's local coordinates. Actual warm pins and protected descendants are checked against the warm input's world coordinates. A current edited document supplies the source-intent reference for a warm edit; the old source cannot incorrectly forbid a deliberately added node or changed label.

Raw components remain available: absolute and normalized defect counts; overlaps; blocked routes; selected sides; route-through-node/title events; labels and label ownership proxies; crossings; shared segments; lane spacing; bends, jogs and hooks; route length and detours; group fill/padding; area, aspect, density, alignment and dead space; movement, order changes and route churn. The score is not a replacement for these components.

### DI and practical bands

Two normalizations are retained. The legacy-shaped index divides raw weighted defects by `max(1, E/10)`. The literal per-ten-edge index uses `10 × raw / E` for positive edge counts and the raw count when there are no edges. The custom measured subset is **not a numerical reproduction** of every category in the repository's stock audit. The 45 historical stock-audit renders have their own outputs and are not merged into the custom score scale.

Three predefined weights emphasize balanced defects, traceability, and directness. Routing optimizer penalties are separate inputs; for example, `crossingPenalty=900` is not a 900-point evaluation penalty.

Five preference profiles are explicit:

| Profile | Frozen soft objective |
| --- | --- |
| Readable directional flow | Direct per-ten-edge DI +2×absolute log aspect error |
| Compact presentation | Balanced per-ten-edge DI +8×log(area / smallest valid same-base area) +2×aspect error |
| Traceable connections | Traceable per-ten-edge DI |
| Stable incremental edits | Balanced DI +translation-adjusted mean displacement/24 +5×changed-side rate; static screening uses balanced DI as a stated proxy |
| Specialist preservation | Balanced DI after required structural/intent gates |

Target aspect comes from the job/source format: wide 2, slide 1.78, square 1, page 0.77, tall 0.6 and free 1.6. The trial's raw default-aspect metric remains available; policy analysis uses the declared job target. A requested global direction/fit change records movement and churn but omits both from the stability penalty. Stable static scores cannot establish edit stability; the E-stage evidence is required separately.

A candidate is practically acceptable relative to a profile oracle when it is hard- and intent-valid, within one profile-score unit, no more than 10% larger in area, and no more than 10% longer in total routed length. The same result is acceptable to itself. Half- and double-width bands are sensitivity analyses; the frozen policies are not refitted under each band.

These bands are borrowed operational thresholds, not human-calibrated perceptual constants. The 36 blinded development pairs checked their plausibility. Eight pairs were inside the symmetric balanced-DI/area/length band, and one of those received a visual preference; the relevant aspect/profile objective is also reported. Numeric/visual reversals remain in the ledger. The bands were retained as a reproducible decision rule, with visual override evidence and no claim that all inside-band changes are imperceptible. No heldout score is silently changed to agree with a judgment.

### Explicit measurement limits

Production label boxes are measured; exact glyph ink is not supplied to every trial. Group title envelopes are conservative rather than pixel-exact. Export clipping is unavailable without an explicit export boundary. Aggregate density is not a largest-empty-rectangle measurement. Some stock-audit categories—such as staircase groups, uneven channels, ragged bends and word wrapping—are not reproduced. Rounded-corner appearance is inspected visually and through SVG path changes, separately from polyline equivalence.

General reading-direction and format fulfillment is not a complete hard gate. In particular, the measured `fit=wide`/explicit-direction precedence case is reported as an intent diagnostic; a bounded repair's small movement is not proof of fulfilling a global direction request. The frozen node-crossing metric also has a broad exemption for drawn cell-access routes carrying `cross`. A separate, unscored audit checks the raw router body without the intentional terminal extensions. The frozen metric remains unchanged, and the census identifies whether the gap affects observed cases.

## 4. Engine and configuration experiments

Cold trials use the shipped compile path, including cold initialization, its 640 maximum settled-iteration setting, early stopping, container behavior and refinements. Actual iteration totals, termination reasons and solver reports are stored. The evaluation does not infer an implementation's behavior from the name of a research family.

The source sensitivity screen covers all 15`ENGINE_PARAMS` entries with default and meaningful alternatives on 12 relevant development bases each, across multiple families. `ordering` and `fold` have two actual categorical values; extra aspect choices and root choices are explicit. Direction, fit, recipe gap and root minima have additional strata. Raw warm tests cover pass limits, stability, iterations, manual protection, growing containers, direction respect, ordering, maximum settled effort, scope and fixed IDs. Unsupported cross-parent selections remain recorded errors. Additional supported-sibling probes are labelled supplementary and do not replace those failures.

Layout interactions are aspect×fold, rank-gap×node-gap, and boundary-pull×hierarchy-sweeps, on four relevant cases each. Aspect×fold is a 3×2 categorical design because only two fold values exist; the other grids are 3×3. All adverse combinations remain in the data.

Preset tuning gives every engine exactly four configurations on the same 12 development bases:480 trials. Selection ranks hard-valid coverage, five-profile practical coverage within that tuning pool, finite regret and a deterministic preset tie-break. The selected preset is then run on the remaining applicable development cases. Preset index 0 is the original default and is reused, not relabelled as a new outcome. Unselected tuning presets never enter the shared main oracle.

The source-control removal supplement fixes each of the 15 controls to its original default, then retunes one other consumed parameter. It uses the same number of global configurations as the original core screen: two for the two-value categorical controls, three otherwise. The fixed 12 case set and engine stay the same. This adds 336 actual trials. The paired replacement is chosen from source-consumption structure before these trials, not from heldout wins. The result is a bounded compensation test; recovering a score cannot replace authored root, ordering, fold or format intent.

## 5. Routing experiments

Twenty-four purpose-built routing fixtures cover forced sides, diamonds, fan-in/fan-out, group/title terminals, narrow gaps, obstacles, high degree, parallel/opposing edges, self loops, long labels, returns and shared corridors. Their positions are compiled once and then frozen.

For all 12 routing parameters, the screen uses one shared default and two alternatives:24+12×2×24=600 trials. Another 144 trials test port stability at three levels with and without shared external history after the same small edit. Every candidate receives the same prior state; no candidate inherits another candidate's routes. A zero external history is not assumed to make stability inert, because later improvement passes can use routes from the current run.

The explicit-side study includes automatic and authored variants on all 24 fixtures, plus 16 from/to side pairs for one nominated edge on each of 12 fixtures:240 trials. Those 16 pairs do not claim exhaustive side assignment for every edge in the whole graph. Comparisons to the best automatic numeric setting use compatible unrestricted inputs; a source already fixing a side is not mislabelled as an automatic search. The independent audit also checked compatible interaction rows for the decisive explicit-port witness.

Six 3×3 grids run on eight relevant fixtures each: crossing×bend, clearance×standoff, edge-gap×parallel, port-gap×fan-out, shared×passes, and port-stability×crossing with shared history. This adds 432 trials. Appearance-only corner changes are recorded in rendered SVG paths even when the polyline is identical.

The global routing portfolio is chosen only from 25 fully observed configurations: default and 24 single-parameter alternatives. Partial two-control grids remain conditional evidence and are not imputed across missing fixtures. Exact size 1/2/3 search and leave-one-control-out retuning use comparable three-policy budgets. The retained three configurations are then crossed with three distinct-engine layout choices on 12 development bases: 108 full-pipeline combinations. Frozen heldout routing checks distinguish current-source rerouting, joint-policy availability and a deployable global choice; none may be selected using heldout quality.

Heldout routing executes 72 current-position reroutes and 216 frozen layout-by-route combinations. To reuse the already measured layouts, these use saved complete geometry or explicitly allowed completed-layout checkpoints; source intent is inherited and prior router history is empty. The primary result is observed route-only validity and quality. The compile-component-plus-route-worker budget sensitivity is a derived serial estimate, not a fresh cold-render latency measurement. Static profile scoring omits incidental before/after edit measurements to reproduce the development static objective; raw route/side changes remain available. The current-position oracle contains only current plus the three frozen route settings; the joint oracle contains three matched default-route layouts plus nine alternatives. Neither scoped oracle is interchangeable with the main full cold-layout pool. The interpretation and synthetic checks were recorded before the dedicated outcome analysis.

## 6. Editing, protection and task applicability

Each of 24 bases has four independent edits from the base—relabel/resize, add node/edge, local move/reorder, and direction/fit change or removal—plus a separate color-only negative control. Changes are not chained, and their correlated measurements stay with their base during resampling.

Cold policies are current source, the selected best fixed global method, and the frozen graph-feature selector. Each edited result is compared with **that same policy's pre-edit result**. This avoids calling the cost of first adopting a new policy an edit-stability failure. A proposed hard-validity guard can retain current edited output only when the candidate is invalid and current output is valid. The guard does not select by soft quality. Guarded movement is recomputed against the policy's own pre-edit reference, and its cost includes candidate plus fallback work.

Warm policies use the actual existing document: protected tidy, separate-only, and a group-aware policy using boundary-align for groups and tidy otherwise. They share current-source starting positions and prior side state. Edited topology and sizes come from the current edited source; surviving positions come from the common previous document. The intentional local 56 px nudge is reapplied before repair. Manual flags, pins, selected scope and collapsed views are explicit inputs. A missing complete routed reference can supply its saved layout checkpoint only when the task permits that; route history/churn is then unavailable, not invented.

Sequence and lane edits retain their native compiler path. Color-only warm controls retain positions and reroute without an unsolicited layout pass. Global direction/format tasks belong to the source-rebuild workflow; raw bounded-pass results for those edits are diagnostic and are excluded from claims that a local repair fulfills global intent.

Raw and translation-adjusted movement, maximum movement, ordering flips, selected-side changes, route changes, local/distant movement and hard compliance remain visible. Real drag/save/undo behavior was also exercised through the existing browser proof scripts; the one headless bfcache failure is explicitly retained.

## 7. Selection, dependencies and uncertainty

The shared development reference pool contains applicable cold defaults in both directions, current authored source, native recipe baselines, and each engine's selected global preset. The generic-engine analysis first enumerates every subset of sizes 1–5, then extends to all 1,023 nonempty subsets. No extra algorithms run during subset search.

Three availability scenarios prevent misleading deletion claims: an engine menu alone; engines plus native recipes with authored/nested engine dependencies enforced; and unrestricted current-source fallback appropriate to hiding controls while retaining implementation. A candidate using a nested `engine=grid` declaration cannot prove grid can be deleted. A minimum engine count does not imply a unique engine set; tied feasible minima are retained. Configuration cover is an additional exact search conditional on the chosen engine set and native/authored baselines.

The pre-layout selector is a deterministic decision tree of depth at most 3, with at least four development bases per leaf. Features are declared node/edge/group counts, density, undirected fraction, components, maximum degree, hierarchy depth, directed cycles and target aspect. Neither case ID/family name nor post-layout geometry/score is a predictor. Goal-specific trees are separate policies. Oracle availability, actual tree selection, and user choice effort are always reported separately.

Four weighting assumptions are tested: equal family, common 80%/niche 20%, common 50%/niche 50%, and worst family. These are declared scenarios, not observed population frequencies. Leave-one-engine and leave-one-control analyses distinguish tiny score wins from practical loss and preserve concrete witnesses. Retuned replacements use development data and comparable candidate budgets.

The original heldout gate is at least 95% of the feasible current-pool acceptable common-job coverage, checked separately for each preference profile, no new hard-invalid case where current source was valid, and no supported specialist loss without an explicit escape hatch. Absolute coverage over all 14 common heldout bases is also reported, including cases where even the full pool fails. A stricter 95% absolute gate is a named sensitivity analysis; it is not silently substituted for the supplied contract.

Policies, trees, presets, subsets, configuration covers and routing choices are sealed before any heldout execution. The runner requires an explicit `frozen:true` policy and matching corpus, baseline and metric hashes, and records the policy-file hash. Heldout analysis applies those stored choices without fitting new ones. The 24 heldout bases and their assigned edits are evaluated once; the raw engine pool may support a heldout oracle for assessment, but that oracle is not a deployed selector.

Paired uncertainty resamples base diagrams or families, retaining correlated profiles and edits together. Edit comparisons use 2,000 seeded base-cluster draws. Percentile intervals and sensitivity summaries describe this finite benchmark; they do not establish user preference or significance in a real market. Runtime repetitions and alternative settings never become independent users. With only 14 common heldout bases, a single loss can exceed the 5% allowance; exact numerators and denominators matter more than rounded percentages.

## 8. Timing, equivalence and visual evidence

The timing/identity sample was selected by source structure before timing or winner inspection: one base from every family,8–48 nodes. Each engine gets one warmup and five measured invocations on each of 12 cases:720 pipeline trials,600 measured samples. Cache is disabled and only one algorithm worker runs. Compiler/layout, routing, label and full-pipeline times remain separate. Successful-sample medians and upper tails are conditional; timeouts stay visible and lower-bounded. The large-case screening and optional scale failures provide separate tail evidence. Shared cloud timings do not prove the editor's 200 msdesktop budget.

Determinism excludes timing/report clocks. ID renaming inverts the authored ID map before comparing outputs. Declaration-order changes are a separate test because order can be intentional. Exact equivalence includes all node/group rectangles, selected sides and ordered route points. The 1 px tolerance is elementwise; complete-link clusters require every member pair to pass and do not rely on nontransitive rounding bins. Corner style is separately evaluated in SVG paths.

Visual pair selection includes a seeded family-stratified component, contested engine/control witnesses, metric disagreements and adverse cases, followed by heldout comparisons after freeze. Candidate left/right placement is a deterministic hash shuffle; the public manifests hide candidate identities. The judge opens every production PNG and uses detail crops where required. Verdicts are better/same/worse with reason, severity and confidence, frozen before the key is opened. Repeated graph pairs are not independent cases. This is one expert model's review, not independent human validation or a usability study.

The completed review contains 63 pairs: 36 reviewed before the policy seal, three additional archived-development niche witnesses after the seal, and 24 fresh heldout pairs. The heldout selection has twelve seeded family cases plus twelve targeted pairs. One family with identical alternatives is retained as a negative control rather than dropped; thirty unrenderable candidate-pair attempts are logged without inventing complete routes. The heldout reviewer opened all 24 pairs and 32 supplemental production detail rasters, froze judgments, and only then made the mapping available for separate unblinding. The final aggregation does not change the frozen weights or policy. Independent panel fitting means visual impressions of physical area must be checked against saved geometry.

## 9. Execution controls and departures

The assignment began at `2026-11-01T22:50:03.754830Z` with a six-hour wall-clock limit and a 12,000 distinct-trial ceiling. The main runner reserves at most 11,500 task IDs, leaving a nominal 500 allowance for ancillary work. Final main counts are exact. Ancillary test assertions, compiler calls and event-driven browser invocations are not all instrumented; the 500 allowance is not a verified bound on every API invocation. Known ancillary counts are reported separately rather than falsely certifying a universal call total. Nested algorithm calls and distinct end-to-end trials are different units.

The initial 90-second per-trial limit exposed dense routing stalls after fast layout. A uniform 15-second limit was then recorded before subsequent trials. Earlier 90-second failures also exceed 15 seconds and remain failures; successful earlier trials were below the new cap. Completed layout checkpoints preserve partial evidence. No partial route is fabricated. Optional work has lower priority than mandatory stages and packaging.

Two early batches briefly overlapped after an unsuccessful attempt to stop their external execution sessions. The first terminal result is canonical; later attempts are retained and cannot improve coverage. Some terminal JSONL writes were absent despite complete artifacts and a completed batch console record. Recovery used existing immutable records first, otherwise complete geometry/metrics or a logged timeout; it did not rerun an algorithm. Missing timing/cache fields remain null. Original logs, summaries and recovery provenance are preserved. Later batches write immutable per-attempt records.

Additional departures are explicit:3×2 fold interaction; selected-preset supplementation of the main pool; bounded source-control replacement tuning; supported-input warm supplements; separate unscored intent/cell-access diagnostics; an extended 1–10 subset search; and browser fallback installation. All were recorded before their corresponding new trials or before heldout. Product source, weights and the heldout split were not modified to improve a result.

All **8,203 registered main trials** have terminal records: 7,731 completed, 452 timed out, and twenty failed. Development has 6,714 and heldout 1,489. Seven duplicate attempts remain in the 8,210 raw terminal rows. There are no unstarted or unplanned registered IDs. The last registered trial finished at `2026-11-02T00:29:04.524Z`, approximately 99 minutes after the assignment began. Known ancillary scenario invocations total 280 across six bounded buckets, but these heterogeneous counts are not a complete deduplicated all-session geometry/API ledger. All final counts, unknown counters and artifact checks are explicit in `data/execution-summary.json`.

The final cell-access audit covers 6,446 saved development artifacts and 1,286 heldout artifacts, including 76,263 and 34,912 drawn routes respectively. No actual route carries the `cross` flag, so the known exception is unexercised rather than validated safe. The development artifact census includes one noncanonical saved result from a canonically timed-out trial. The supplementary analytical counterexample has thirteen passing assertions; no observed heldout score is rewritten.

A targeted post-seal file-source port-checkbox probe executes the exact AST-extracted source functions with the real parser/serializer/settings helpers, then compares the actual raw Explorer path as a positive control. Twelve assertions pass; it makes exactly two router calls, zero layout calls and zero source compilations. This is implementation-applicability evidence for one narrow public-checkbox removal, not a new quality-policy search. The extraction, hashes, fixtures and outputs are saved.

The checkbox removal relies on that exact source-byte equality and working raw positive control. It is a separate applicability witness; the 63 blinded graph-quality pairs are not claimed to be an end-user click test of that checkbox or of the proposed replacement UI.

The frozen E analyzer's broad reference-catalog scan incidentally read the completed heldout routing stream and a 101-row partial joint snapshot after policy sealing, before the intended dedicated routing analysis. All 480 E analysis rows use forty unique C/E references and zero H-routing/H-joint references; an independent review found no effect on E estimates and no fitting. The original catalog/input manifest and the access-scope deviation are preserved. No claim of strict unread routing outcomes is made for that scan.

Sixty-one exact development-seal code/report snapshots are preserved under `evaluation/frozen-development/`. A denominator wording correction, replay integration and final documentation changed current reporting files after the seal. Their hashes and original bytes remain available. Scoring, intent, selectors, dependencies, adapter, worker and source-transform logic remain unchanged. New final reporting helpers apply frozen choices and verify saved outcomes; they do not silently refit a heldout policy.

The full access/check logs, source-read manifests, recovery records, frozen hashes, task JSON, scripts and source packet are included. `evaluation/README.md` explains replay, resume, a newly clocked reproduction and the distinction between saved judgments and rerunnable computations.
