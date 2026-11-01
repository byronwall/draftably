# Implementation plan: complete layout and routing documentation

**Decision:** integrate task-led guides, a complete source-linked field reference, and a curated visual atlas into the existing Markdown/Solid documentation system. Publish useful, accurate content first; ship compiler and Editor repairs as separate changes; then finish the entire atlas. A small initial release is a stage of this plan, not its completion criterion.

**Reviewed baseline:** `af70d8317797d5a522acffdd604819376a3ec893`. **Status:** proposed implementation, informed by the executed evidence in this package. No product source changes, commits, pushes, issues, or PRs were made during the review. Paths below are relative to a complete Draftably checkout unless identified as review-package artifacts. A path marked **new** is a proposed file; commands invoking those new files become available when their milestone implements them.

The priority and classification of each recommendation are defined in [recommendations.md](recommendations.md). Evidence and current limitations are in [report.md](report.md), [coverage.csv](coverage.csv), [visual-atlas.md](visual-atlas.md), and [atlas-manifest.json](atlas-manifest.json). This plan does not turn proposed fixes into claims about the baseline.

## 1. Completion is countable

The baseline inventory is **197 canonical entries: 194 public controls/operations and three derived routing behaviors**. It contains 78 layout entries, 30 routing entries, and 89 Editor/CLI entries. E010 is retained as an alias of L030, so Match canvas remains covered without counting aspect twice. The atlas has **105 visual families and four justified nonvisual groups**: 45 layout families, 24 routing families, and 36 Editor/CLI families. Family numbering is stable and intentionally has a gap at VL40; do not renumber references to make the numbers consecutive.

The final artifact count is 323 positive `.draft` companions, one deliberate diagnostic companion, 10 isolated defect repros, 13 complete page-draft fences, and 359 actual SVG assets, including the 13 page-fence renders. These are package counts, not a claim that 359 browser interactions were tested or that every specified Editor sweep has already been executed. [evidence/artifact-counts.json](evidence/artifact-counts.json) is authoritative if the final assembly changes an artifact count. Integration may eliminate duplicate source copies, but must retain every distinct experiment and all stable control/family references.

| Completion contract | Required evidence |
| --- | --- |
| Public surface is complete | Exact set equality for ten file engines, six built-in recipes, fifteen `ENGINE_PARAMS`, twelve `ROUTING_PARAMS`, eleven Editor algorithms/operations, and the 28 accepted CLI `--try` keys. Curated UI/CLI operations cover the rest of the 197-entry inventory. |
| Every choice has an explanation | Each canonical entry resolves to one or more actual visual families or a specific nonvisual justification. An engine name, range table, or generic starting screenshot alone does not satisfy this requirement. |
| States and samples are complete | Every finite categorical state is represented in its applicable context. Numeric controls have meaningful low/default/high samples, units, effective values, and boundary validation. ID and text domains use representative valid, invalid, and scope cases; infinite domains do not require enumeration. |
| Context is explicit | Cold file compile, native cold/warm/pass, source Compare, native Compare, and CLI vary are distinguished where semantics differ. Every action states what persists to source, JSON, browser preferences, or the current session. |
| Source examples remain runnable | Every positive companion and every standalone published runnable `draft` fence compiles without errors and exports finite node, group, route, label, and viewBox geometry. Expected warnings are named and asserted, not suppressed. Intentional diagnostic demonstrations are separately declared and tested. |
| Negative examples are isolated | Unsafe and unsupported repros live outside the positive gallery. Tests assert the agreed located diagnostic or newly supported result. No runtime exception, `NaN`, `Infinity`, or JSON `null` replacing an invalid coordinate is accepted as a demonstration. |
| Comparisons demonstrate their stated cause | Source diffs identify the changed setting; the baseline is named per subcomparison. Routing experiments declared frozen assert identical world-space rectangles. Coupled source-layout examples explicitly allow and explain movement. |
| Equality means what its label says | Metrics, object rectangles, route point arrays, coarse variant fingerprints, and rendered SVG paths are checked separately. Equal metrics and coarse geometry cannot justify “identical drawing.” Honest no-effect results remain visible. |
| Evidence belongs to the displayed source | Each artifact records source hash, execution context/options, engine revision, renderer, effective settings, warning class, and output hash. A stale SVG cannot silently accompany edited source. |
| Editor demonstrations are reproducible | Every action family has an exact starting `.draft` or native JSON, selection/scope, camera when relevant, route-history condition, protection/reference state, actions, result, and persistence expectation. Model execution and actual UI replay have separate statuses. |
| Full publishing coverage is delivered | All 105 visual families have a readable teaching artifact and all four nonvisual groups have concrete contracts. A model render can prove model behavior; lifecycle controls such as Keep, Cancel, selection, and reopen require the corresponding UI proof before being described as exercised. |
| Integration is verified | Fresh compiler output agrees with saved Editor results within the specified serialization tolerance. Existing repository gates run in a complete checkout, with failures investigated rather than replaced with synthetic assets or skipped tests. |

This is exhaustive option coverage with selected interactions, not a Cartesian product. Keep the graph families requested in the prompt: nested groups, flat DAGs, trees/forests, cycles and feedback, disconnected peers, long chains, dense fan-in/out and ports, title bands, narrow corridors, long labels, and pins. A fixture that exposes one engine parameter does not automatically demonstrate that parameter on every engine listed in its applicability column.

## 2. Repository shape and release boundaries

Use these destinations consistently so Codex can integrate the package without inventing another documentation architecture.

| Destination | Purpose and integration rule |
| --- | --- |
| `docs/DSL.md` | Preserve reference slugs. Expand Layout engines, Routing, Layout tools, refinements, specialized diagram kinds and Side by side; add the proposed Ports and lanes section. Keep canonical spelling, effective defaults and applicability here. |
| `site/docs/pages/choose-a-layout.md`, `layout-atlas.md`, `layout-recipes.md`, `fix-a-drawing.md`, `compare-layouts.md`, `timeline-and-brush.md` — **new** | Reader tasks, atlas index and explanatory guides. Integrate the substantive drafts; remove editorial Integration notes from published copy. |
| `site/docs/pages/cli.md` | Add the executable vary workflow and links to its complete reference. |
| `site/docs/content.ts` | Register the new Layout navigation group and cross-links explicitly. Avoid duplicate guide/reference slugs: `ordered()` currently gives DSL pages precedence. |
| `examples/atlas/` — **new** | Import positive sources into `engines/`, `layout/`, `layout-warm/`, `routing/`, `editor/`, and native starting states into `native/`. Preserve the package's descriptive filenames. |
| `tests/fixtures/layout-routing-atlas/repros/` — **new** | Import the ten package `examples/layout/repros/` sources here. These must not be traversed as ordinary positive gallery examples. |
| `tests/fixtures/layout-routing-atlas/diagnostics/` — **new** | Put the deliberate `align-pin-conflict.draft` companion here. It demonstrates an existing diagnostic and retained pins; it is neither a positive example nor a product defect. |
| `examples/atlas/manifest.json` — **new** | One compact authored coverage/example contract, derived from the supplied manifest and matrix. Include canonical IDs, alias/exclusion decisions, source references, contexts, variants, expectations, and action recipes. Do not inline every geometry array in the production page bundle. |
| `scripts/atlas/check.mjs`, `render.mjs`, `reference.mjs` — **new** | Small validation/render/reference tasks using the existing compiler, renderer and test stack. No new layout or playground dependency. |
| `site/docs/atlas.ts`, `site/docs/AtlasExample.tsx` — **new** | Typed manifest access and the one focused comparison component. Reuse `Example.tsx`, `Zoom.tsx`, `play-link.ts`, highlighting, and the existing `draw` path. |
| `site/public/atlas/` — **new** | Curated verified fallback SVGs loaded by URL. Generated run logs and full geometry stay in evidence/output directories rather than being eagerly imported into the site. |
| `docs/intent/layout-routing-atlas/plan.md` — **new** | Decisions, release-specific verification and remaining Explore items. Link the preserved original review package; do not recast old baseline measurements as measurements of a new commit. |
| `skills/draftably/SKILL.md` and `.changeset/` | Same-PR language guidance and release notes required by the repository's policy. |

The manifest is the curated source of coverage associations. Registries remain the source of accepted keys, types and raw bounds. Generate reference table blocks and review exports from those two inputs; keep causal prose authored. Do not maintain an independent handwritten range/default table in the component, CSV, skill and reference. Contextual compiler/Editor defaults require explicit annotations and regression cases; exporting raw `LayoutLab.defaults` is insufficient.

### Milestone sequence

| Milestone | Recommendations | Dependencies | Independently useful result |
| --- | --- | --- | --- |
| M1 — truthful guides and context | LR-001, 002, 016, 020, 022, 025, 027 | None beyond baseline verification | Readers can choose the kind of change and understand current limits. |
| M2 — durable coverage/evidence contract | LR-004, 005, 028 | Can proceed beside M1 | Missing options, stale artifacts and invalid examples become detectable. |
| M3 — safe specialized inputs | LR-009, 010, 018 | M2 repro contracts; no renderer dependency | Cells/sequence cannot silently produce invalid geometry. |
| M4 — source defaults and scope isolation | LR-007, 008 | M2 regression fixtures | Saved recipes preserve the chosen fold behavior and independent scopes. |
| M5 — truthful Compare and persistence surfaces | LR-011–015, 021 | M2; share M4's effective-default contract | Offered experiments execute what their labels promise. |
| M6 — minimal lazy atlas renderer | LR-006, 023 | M1 information design and M2 manifest | Shared-scale comparisons are readable and accessible. |
| M7 — complete atlas and page integration | LR-003; completes LR-001 | M1, M2, M6 | Every public choice has its promised explanation. |
| M8 — bounded capability decisions | LR-017, 019, 018, 016 | M2; M5 for new Compare axes | Independent spacing/accessibility improvements without silent semantic expansion. |
| M9 — complete-checkout integration proof | LR-024, 026 | M7 and whichever behavior changes ship | Release-ready proof of current source, UI and CLI behavior. |
| M10 — optional research exit | LR-030, 034 | Relevant M4/M5/M8 fixes | Decides frozen-geometry Compare and meaningful cold ordering separately. |

M3–M5 can be split into small defect PRs. M7 does not wait for every Explore decision or require a new behavior before teaching the existing one. If a fix is not yet released, publish its truthful limitation and current artifact; when it lands, update its source, render, caption and skill in that release. M9 applies to each release and again to the integrated atlas. M10 is not a completion dependency.

## 3. M1 — ship accurate, useful documentation first

**Scope.** Integrate the symptom guide and choice-of-operation introduction, contextual defaults, fair engine tradeoffs, complete names/applicability, and the most consequential current limitations using ordinary `draft` examples. Preserve the three distinct Flow meanings: built-in `flow`, `engine=flow`, and the Editor Flow preset selecting `compound-flow`. Explain Separate as current-geometry repair, rather than an eleventh file engine.

**Files.** `docs/DSL.md`; the six new guide destinations above; `site/docs/pages/cli.md`; `site/docs/content.ts`; `skills/draftably/SKILL.md`. Start `examples/atlas/engines/` with the exact ten package engine sources, and import the initial routing/refinement sources used by the prose. The atlas index may initially link to existing live examples and downloadable companions; label remaining families as scheduled integration work, not completed lessons.

**Exact content/example requirements.** Publish the supplied grouped-engine comparison with all ten rows and current baseline, preserving the title and source. Explain that boundary-align and compound-spring remove a crossing at larger area/length, and that current can remain the conservative choice. Place two ordinary routing comparisons beside their explanation: `routing/clearance-{4,10,30}.draft` and `routing/corner-radius-{0,6,16}.draft`, using the supplied fully pinned geometry and row recipe. Link the broader V-R01/V-R12 frozen proof. Add the `editor-refinement-drift.draft` → cleaned source example and the bounded-pass persistence distinction. Include current cold-ordering no-effect, source-routing movement, `fold=never` persistence, context-specific gap defaults, and source/native restrictions before the user encounters the affected control.

**Coverage.** All inventory entries gain their reference destination; the first reader release concentrates on L001–L016, L028–L041, R001–R012, E001, E011–E013, E034–E041 and E074–E090. VL01, VL13, VL15, V-R01, V-R12, V-E17 and V-E36 provide the initial demonstrations. This priority order does not remove later coverage.

**Checks.** Run the existing documentation/skill tests after integrating the draft fences:

```sh
pnpm exec vitest run tests/site-docs.test.ts tests/site-highlight.test.ts tests/docs-search.test.ts tests/skill.test.ts
pnpm skill:check
pnpm site:build
```

`tests/site-docs.test.ts` already compiles reference/page `draft` fences; add assertions only for the new navigation/link contract and materially misleading copy, not brittle snapshots of entire prose. Check the engine numbers against the preserved supplied manifest and newly generated results rather than retyping an unattributed table.

**Acceptance.** A reader can choose among source recipe, bounded pass, local refinement and routing, find the exact syntax, copy a valid example, and understand persistence and limitations without opening the audit. Existing slugs still resolve. Numerical claims name the fixture and metric. Terms such as stress, compound and force do not imply imported algorithms the project does not implement.

**Main failure mode.** Publishing prose that describes a proposed repair as current behavior, or describing every identical cold result as a weak fixture. Use dated/current limitation callouts until the corresponding acceptance test passes on the release commit.

**Release bookkeeping.** Update the skill in this PR because `docs/DSL.md` changes. Add a changeset for the shipped examples/reference changes. A prose-only follow-up restricted to `site/` can follow the repository's no-release policy; do not omit the note from this broader first release.

## 4. M2 — make coverage and visual provenance executable

**Scope.** Import the whole fixture portfolio and define the smallest durable contract that catches missing keys, missing states, broken links, stale renders and mistaken causal claims. This is not a new generic example framework.

**Files.** New `examples/atlas/manifest.json`, fixture destinations, `scripts/atlas/{check,render,reference}.mjs`, `tests/atlas-coverage.test.ts`, `tests/atlas-geometry.test.ts`; extend `tests/site-docs.test.ts`. Use the package's portable scripts and evidence as verification input, not a substitute implementation of the engines. Add proposed `atlas:check` and `atlas:render` package aliases only if useful; the direct node commands below are sufficient.

**Manifest contract.** Each family needs stable IDs; source/native input; a named reference per subcomparison; context and mode; enum states or numerical samples; changed lines/actions; invariants; expected warnings or diagnostics; actual/proposed execution status; and a concise takeaway. Store source/render hashes and execution revision in generated evidence. Preserve E010→L030 and the three derived routing rows R017–R019. Explicitly list exclusions for internal router flags, internal solver parameters, and legacy aliases. Do not claim all `RoutingOptions` fields are public.

**Exact proof cases.** Import all ten defect repros to the test-only directory and keep the deliberate pin/alignment conflict in its separate diagnostics directory. Keep `equal-metrics-edge-gap-{4,16,48}.draft` to prove equal headline metrics can have different routes; keep `corner-radius-{0,6,16}.draft` to prove identical route points can produce different rendered curves. Preserve `channel-reservations*.draft` as the counterexample to source routing being universally frozen. Read world-space rectangles before and after each declared-frozen V-R01–V-R12 sample. Do not normalize each image's bounding box independently and then infer the boxes were stationary.

**Checks.** Implement and then run these proposed commands:

```sh
node scripts/atlas/check.mjs --manifest examples/atlas/manifest.json --out tmp/atlas/check
node scripts/atlas/render.mjs --manifest examples/atlas/manifest.json --out tmp/atlas/render
node scripts/atlas/reference.mjs --check
pnpm exec vitest run tests/atlas-coverage.test.ts tests/atlas-geometry.test.ts tests/site-docs.test.ts
pnpm draftably check examples/atlas --metrics
```

The check task should load the real registries and compare exact key sets, not just counts. Add structured expected states/samples to the curated UI contract where the supplied CSV has descriptive text. It must resolve every package/repository path and distinguish expected warnings from errors. The render task must call the real compiler and SVG exporter, retain meaningful precision, and avoid timing fields in deterministic comparisons. Test a deliberately removed manifest key and a deliberately stale source hash in memory; do not alter user fixtures as a test mechanism. Generated table verification should report a small diff, not rewrite docs during a test.

**Acceptance.** Zero orphan controls, orphan families, unresolved aliases, missing source paths or unexplained visual omissions. Positive examples have finite output; expected repro failures are explicit. A newly added public registry key fails coverage until documented. A changed source cannot reuse an old SVG without detection. Canonical counts and state coverage agree with the complete manifest, including L076–L078/VL46 source comparison panels.

**Main failure mode.** A green “everything compiled” check that neither proves causal invariants nor detects omitted controls. Keep compilation, coverage and comparison-invariant assertions separate so a failed assertion explains the actual problem.

**Release bookkeeping.** Imported `examples/` require a changeset. Generated reference changes require a same-PR skill update. Evidence-only generation need not cause a release by itself; document the commands in `docs/intent/layout-routing-atlas/plan.md`.

## 5. M3 — validate specialized inputs and finite geometry

**Scope.** Fix unsafe structural numbers and sequence geometry first; diagnose accepted but inapplicable settings without silently inventing semantics. LR-018's broader capability extensions remain a separate M8 decision.

**Files.** `src/dsl/syntax.ts`, `src/dsl/cells.ts`, `src/dsl/compile.ts` (`sequenced`, specialized validation and geometry boundary); `src/cli/main.ts` only if diagnostic presentation needs adjustment; `tests/cells.test.ts`, `tests/sequence.test.ts`, `tests/dsl.test.ts`, `tests/bounds.test.ts`, `tests/engine-recipes.test.ts`, plus test-only repro files. Update `docs/DSL.md` and the skill with the chosen compatibility policy.

**Exact regressions.** `cells-fractional-columns.draft` currently reaches an allocation error; `cells-fractional-span.draft` exports a null width. Require positive integral structural counts/spans where the algorithm needs them, including an upper-size safety policy consistent with current syntax. `sequence-empty-group.draft` must receive a located error or a deliberately defined finite representation; it must not export tiny plausible metrics over invalid coordinates. `sequence-group-endpoint.draft` needs an explicit supported/rejected endpoint policy. `cells-ignored-ruler.draft`, `sequence-ignored-controls.draft`, `root-minima.draft`, and `outside-tree-root.draft` establish unsupported-attribute and scope behavior. Validate malformed values even when an enclosing feature is absent. Define integer-like sweep and duplicate-order membership policy rather than relying on incidental rounding or traversal.

**Coverage.** L005/L006, L021, L031, L033–L036, L040, L042/L043, L065–L073; R015/R029; E087/E089. Relevant families: VL06, VL16, VL19, VL28–VL38 and VL43. Keep valid `cells.draft`, unit-byte/bit, spanning field, marker/ruler and `sequence*.draft` examples as positive controls.

**Checks.**

```sh
pnpm exec vitest run tests/cells.test.ts tests/sequence.test.ts tests/dsl.test.ts tests/bounds.test.ts tests/engine-recipes.test.ts tests/lanes.test.ts
node scripts/atlas/check.mjs --manifest examples/atlas/manifest.json --out tmp/atlas/check
pnpm skill:check
```

Tests must inspect the error location/message and assert no invalid SVG/JSON output, not only “throws.” Run each positive boundary beside its rejected fractional/invalid counterpart. Require finite geometry after compilation and before metrics/export; a guard is the last defense, not a replacement for a useful source diagnostic.

**Acceptance.** Invalid structural input fails predictably with a source location. Harmless ignored combinations have an explicit diagnostic and documented compatibility choice. All supported specialized examples still produce finite output, and their intended alignment/message/grid rules are preserved.

**Main failure mode.** Broadly rejecting previously valid diagrams while fixing one fractional case, or merely filtering nonfinite objects from output. Review the accepted language and add narrow compatibility evidence before changing it.

**Release bookkeeping.** Separate changeset for each behavior repair; update the DSL reference and skill in the same PR. State compatibility changes plainly. Choose release severity using `docs/RELEASING.md`; do not automatically label a newly rejected established input as an inconsequential formatting patch.

## 6. M4 — preserve file defaults and independent scope settings

**Scope.** Repair `fold=never` round-tripping and sibling setting leakage without conflating file defaults with raw native engine defaults.

**Files.** `src/dsl/layout-edits.ts` (`engineAttrs`, recipe writing), `src/dsl/compile.ts` (`engineArrangement` and effective per-scope settings), `src/dsl/project.ts` if displayed effective values need correction; `tests/layout-edits.test.ts`, `tests/engine-recipes.test.ts`, `tests/fold-hold.test.ts`, `tests/tall-group-fold.test.ts`, `tests/group-packing.test.ts`. Update the source assertions in `scripts/prove-layout-tools.mjs` when valid explicit defaults change the serialized line.

**Exact regressions.** Use the package's `fold-before-explicit-never.draft` twelve-node chain: UI never currently writes omission, which compiles as auto and changes object bounds from 2540×56 to 812×336. UI auto writes explicit auto. Test source→projection→UI choice→serialized source→fresh compile, preserving the intended choice and the long-chain distinction. Add root and nested-scope cases. Review explicit right versus omission separately: the recorded repro has equal rectangles/routes but different flow metadata, so do not invent a visible-route assertion for that fixture.

Import `scope-settings-a-first.draft` and `scope-settings-b-first.draft`. Swapping independent sibling recipe statements currently changes the second scope's gap and dimensions. Construct each scope from intended defaults, legitimate ancestor inheritance and its own attributes, rather than the previous solve's mutated settings. Require equal per-scope geometry/settings under sibling statement reordering while retaining legitimate parent/child inheritance.

**Coverage.** L017–L030, L032, L038, L040/L041; E003, E013, E032–E037, E041. VL15, VL33/VL34, V-E03, V-E08 and V-E17/V-E20.

**Checks.**

```sh
pnpm exec vitest run tests/layout-edits.test.ts tests/engine-recipes.test.ts tests/fold-hold.test.ts tests/tall-group-fold.test.ts tests/group-packing.test.ts tests/group-fit.test.ts
node scripts/atlas/check.mjs --manifest examples/atlas/manifest.json --out tmp/atlas/check
pnpm build
pnpm prove:layout
```

The browser proof is a final persistence check after module tests; it needs the existing Chromium setup. The long-running engine suite belongs in M9 or the behavior PR's release gate, not an ad hoc repeated loop after every serializer edit.

**Acceptance.** Chosen fold semantics survive save and reopen, labels show effective settings, sibling order cannot transfer unrelated parameters, and nested inheritance remains supported. Preserve deliberate geometry changes in new evidence alongside the original baseline outputs.

**Main failure mode.** Fixing omission by changing the raw native default globally, thereby altering native warm/pass behavior, or disabling legitimate inheritance to remove sibling leakage. Keep contracts explicit at their boundary.

**Release bookkeeping.** Source behavior changes require a changeset; update context tables, limitation callouts and skill in the same release. Geometry-changing default fixes deserve a clear release note and targeted before/after images.

## 7. M5 — make Compare and file editing truthful

**Scope.** Share a capability/validation decision before source/native dispatch; make captions reflect executed settings; retain source diagnostics; implement or disable fixed-port release; qualify CLI equality; prevent unsupported file gestures from appearing saveable. These can ship as several focused PRs.

**Files.** `src/state/comparison.ts`, `src/lib/engine-tasks.ts`, `src/engines/explorer-engine.js` and `.d.ts`, `src/components/comparison/ComparisonSidebar.tsx`, `ComparisonDialog.tsx`, `src/state/comparison-export.ts`; source editing helpers in `src/dsl/layout-edits.ts`/`translate.ts`; `src/components/Inspector.tsx`, relevant `Menus.tsx`/`commands.ts` branches and `src/state/file-session.ts`; `src/cli/variants.ts`, `src/cli/vary.ts`. Extend `tests/vary.test.ts`, `tests/layout-edits.test.ts`, `tests/translate.test.ts`, `tests/file-session.test.ts`; add **new** `tests/source-comparison.test.ts` against a small exported pure preparation seam rather than a new mock application.

**Exact cases and design.**

1. Use `editor-compare-start.draft`, `editor-intent-start.draft` and the recorded ignored-axis probe. Source rebuild must expose only inputs it can execute faithfully. Intent, holds, viewport aspect, max effort and warm/pass-only settings must be supported with real source semantics or visibly unavailable for that context. A meaningful supported setting can still produce an identical drawing; capability is not determined by forcing every fixture to move.
2. Test requested `edgeGap=1`: baseline native candidates reject it while source candidates execute 4 under a caption of 1. Validate before generation in both paths. Prefer a clear validation error; if deliberate normalization is retained, show requested and effective values explicitly and export the effective contract.
3. Carry compiler diagnostics through `compileCandidate` into candidate display and export. Keep diagnostics separate from `report`; source compilation currently has no native solver report, and a fake one would obscure that distinction. Error candidates cannot be applied. Warnings remain reviewable.
4. Test `ports-fixed-both.draft` with release-fixed-ports. File candidates must remove the relevant `from`/`to` attributes through real source edits or disable the option before Generate. Recompile and assert effective automatic sides; preserve unrelated edge attributes/comments.
5. Keep radius 0/6/16 in `tests/vary.test.ts`. Either rename the current tag to “same coarse geometry” or introduce a distinct exact render signature for visual-equality claims. Recommended first release: qualify the existing tag, retain repeats in explicit sweeps, and document ranking deduplication. Do not change conservative winner selection accidentally while correcting its label.
6. Gate native-only bend editing, label offsets, container direction and padding in source mode using actual translation capability. Explain the supported alternative before a gesture. Session snap/badge preferences have different persistence and must not be disabled merely because they do not change source. New waypoint syntax is outside this fix.

**Coverage.** E029–E041, E051/E052, E074–E079, E087–E089; L017–L033 including L030 canvas; R001–R014/R023. V-E03, V-E06, V-E15–V-E20, V-E31/V-E32, V-R12/V-R13/V-R20 and NV-E01/NV-E04.

**Checks.**

```sh
pnpm exec vitest run tests/source-comparison.test.ts tests/layout-edits.test.ts tests/translate.test.ts tests/file-session.test.ts tests/vary.test.ts tests/routing-ports.test.ts
pnpm build
pnpm prove:file
pnpm prove:layout
```

Extend existing proof journeys only for risks module tests cannot settle: selection captured when Compare opens, regenerate after intent edits, stale source before Apply, preview Keep/Discard and source Undo, unsupported controls before use, and saved file reopen. Check saved source and fresh CLI geometry after Apply. Do not count screenshot appearance alone as persistence proof.

**Acceptance.** Every offered candidate state either executes or gives an actionable pre-run limitation; effective source and caption agree; errors cannot be applied; warning provenance survives export; fixed-port release is faithful; source UI does not silently discard a promised edit. Vary's equality wording accurately describes its fingerprint.

**Main failure mode.** Generating a native candidate, then serializing only part of its state as if it were a reproducible source recipe. Keep source candidates source-authored and freshly compiled. Warm/pass results can intentionally save an arrangement, with that different persistence explained.

**Release bookkeeping.** Each shipped behavior/CLI change gets a changeset. Update Compare/vary/Editor pages and capability cells in the manifest immediately; DSL or reference changes update the skill as required.

## 8. M6 — build only the renderer support the atlas needs

**Scope.** Add one focused `AtlasExample` component and a small Markdown dispatch extension. It must teach a comparison at a readable scale and defer expensive work. Existing `Example` remains the ordinary editable example.

**Files.** New `site/docs/AtlasExample.tsx` and `atlas.ts`; minimal changes to `content.ts`, `Docs.tsx`, `Example.tsx` only where reusable behavior is needed; `site/site.css` for the comparison and `site/docs/docs-nav.css` only for changed navigation; `tests/site-docs.test.ts`, `tests/site-css.test.ts`, `tests/site-highlight.test.ts`, `scripts/prove-site.mjs`. A proposed fenced form such as `atlas` containing a family ID is new syntax for documentation rendering, not `.draft` language syntax.

**Behavior.** Select a baseline and one candidate; use a shared world scale and origin, a fixed comparison viewport or explicit zoom, visible default/effective settings, changed lines plus full valid source, metrics/warnings, and a textual takeaway. Optional authored overlays show ports, clearance, ranks, feedback or displacement only when causal. Reuse `Zoom`, Copy/Reset, Playground links and highlighting. Preserve last-good drawings while edits are invalid, with a visible source error. A ten-engine overview must open a readable paired/detail view.

`Docs.tsx` currently prepares all drafts on a page and warms all pages. Do not import hundreds of full SVG/geometry objects or mount hundreds of editable textareas. Load a fallback SVG quickly; compute only selected or nearby examples, cache by actual source and relevant context, cancel/ignore stale requests, and keep editing state local to the active example. This is a source-established scaling concern, not a measured claim that the present site is slow.

**Coverage/fixtures.** Develop against VL01, V-R01, V-R12, V-E17 and VL46. These cover differing extents, fixed rectangles, unchanged metrics with changed curves, context-specific model results and source comparison panels. The reusable component must render all assigned families without special engine logic.

**Checks.**

```sh
pnpm exec vitest run tests/site-docs.test.ts tests/site-css.test.ts tests/site-highlight.test.ts tests/docs-search.test.ts
pnpm site:build
pnpm prove:site narrow
pnpm prove:site
```

Add actual proof interactions for keyboard selection, Reset/Expand/focus return, source error recovery and narrow-screen source access. Assert only the selected example is prepared at first use using an observable loader boundary; do not infer laziness from CSS hiding. Use the existing screenshot tooling for visual review. Compare payload/work before and after this feature; use `pnpm bench` only when a concrete performance question remains, with `docs/CHECKS.md` budgets as the reference.

**Acceptance.** Diagram labels remain inspectable on a narrow screen; a baseline toggle preserves scale; controls have labels and keyboard behavior; no distinction is color-only; textual explanations expose the result without visual inspection; reduced-motion settings are honored. Switching examples does not show an obsolete result or block navigation on unseen diagrams.

**Main failure mode.** Building a second playground or a tiny-image wall that loads every example and hides causality through independent fit-to-card transforms. Reject renderer work that does not materially improve the five acceptance examples.

**Release bookkeeping.** Site-only renderer code follows the repository's release policy; imported examples/DSL edits in the same PR still require a changeset and skill update. Document the new Markdown token and manifest expectations for contributors.

## 9. M7 — complete the atlas and all reader pages

**Scope.** Integrate all substantive page drafts and all 105 visual families. The ten-engine comparison is the entry point, followed by graph families and focused parameter/mechanism comparisons. Do not close the mission after a pilot gallery or defer the remaining controls pending adoption research.

**Files.** All destination pages and `docs/DSL.md`; complete `examples/atlas/manifest.json`; positive/native fixtures; curated `site/public/atlas/` artifacts; generated reference blocks; skill; `tests/atlas-coverage.test.ts`, `tests/atlas-geometry.test.ts`, `tests/site-docs.test.ts`, and existing proof journeys where genuine UI states need verification.

**Exact example requirements.**

- **Layout:** VL01–VL39 and VL41–VL46 as assigned by the manifest. Keep the common supplied ten-engine graph unchanged. Include the forest/tree-root pair, cyclic force/stress/flow family, disconnected grid/aspect family, long chain fold/direction, nested packing/inheritance, rank/group/node gaps, all fifteen parameter explanations, every refinement component, specialized lanes/sequence/cells, and L076–L078 source comparison-panel direction/aspect. Keep current no-effect sweeps; use the supplied warm alignment/grid/ordering JSON and actual model renders for their distinct context.
- **Routing:** V-R01–V-R24. Cover twelve numeric settings, all from/to sides, fixed versus automatic sides, reverse, feedback, sync/async, endpoint kinds, automatic return/wrap lanes and channel reservations, title bands and their exceptions, presets/rerouting, and native bend/label operations. Frozen sweeps and source-layout coupling are separate teaching comparisons. Show both observed changes and legitimate unchanged small-fan/shared/standoff outcomes.
- **Editor/CLI:** V-E01–V-E36 plus NV-E01–NV-E04. Cover all Layout lab settings, scope, pins/holds/manual protection, presets, immediate pass/preview/rebuild/checkpoint, native container controls and persistence, all Start/End states, Compare dimensions/mode/effort/scope/intent/ports/presentation/export/apply, timeline selected versus hovered frame/playback/bookmarks/ghosts/keep/reopen, five brush modes and settings/reference/cancel/holds, and complete vary generation/ranking/continuation/application/diagnostic/output behavior.
- **Execution context:** keep actual cold/warm/pass outputs from one identical starting JSON; timeline frame 0/6/12 with the full archive; five brush dabs from the same perturbation/reference/camera; and the eleven warm alignment/grid/ordering renders. These prove model mechanisms, not UI storage or pointer gestures. Execute remaining visual states according to the exact recipes and retain honest status until replayed.

**Checks.**

```sh
node scripts/atlas/check.mjs --manifest examples/atlas/manifest.json --out tmp/atlas/check
node scripts/atlas/render.mjs --manifest examples/atlas/manifest.json --out tmp/atlas/render
node scripts/atlas/reference.mjs --check
pnpm exec vitest run tests/atlas-coverage.test.ts tests/atlas-geometry.test.ts tests/site-docs.test.ts tests/skill.test.ts
pnpm site:build
pnpm prove:site
```

Use the existing screenshot runner for selected publication views, for example:

```sh
mkdir -p tmp/atlas/shots
pnpm shoot --sheet tmp/atlas/shots/engine-tradeoff.png Compound-flow::examples/atlas/engines/compound-flow.draft Boundary-align::examples/atlas/engines/boundary-align.draft Compound-spring::examples/atlas/engines/compound-spring.draft
pnpm shoot examples/atlas/routing/corner-radius-16.draft tmp/atlas/shots/corner-radius-16.png
```

Images supplement the fixed-scale component; a contact sheet alone is not proof that its independent fitting preserves area differences. Check the final published fences again after prose editing rather than relying on the package's earlier successful extraction.

**Acceptance.** The complete contract in section 1 passes. Every family teaches its assigned choice through an actual readable result or appropriate nonvisual contract. All pages are linked by symptom and reference, names agree across source/UI/CLI, and no integration note or “to be researched” placeholder remains in reader prose. Public native-only actions have a real starting document and an observable UI/result demonstration. Preserve legitimate duplicated/equal outcomes with their explanation.

**Main failure mode.** Treating a baseline SVG plus a sentence listing unexecuted actions as complete visual coverage of those actions, or recycling a force-only sweep as proof of every engine's strength. Check the covered control/state/context, not just that an image exists.

**Release bookkeeping.** Examples/reference changes require a changeset and skill update. If staged across content PRs, record the remaining exact IDs in the intent plan and keep M7 open until zero remain. Behavioral fixes landing during this work must trigger the affected artifact refresh.

## 10. M8 — ship bounded improvements independently

This milestone is three independent decisions/patches. It is not a prerequisite for accurate content.

**M8a: group-gap contract — LR-017, Explore.** In `src/dsl/compile.ts` packed spacing currently caps `min(96, max(request, traffic))`, while syntax allows values through 180. Use `group-gap-{24,48,96,120,180}.draft`, nested/growth cases and VL03/VL34 to compare the proposed policy: cap traffic-derived expansion separately, then take the maximum with the legal user request. Preserve traffic floors and explain the shared drawing-wide gap. Test `tests/group-packing.test.ts`, `group-fit.test.ts`, `growth-order.test.ts`, `routing-channels.test.ts`. Acceptance is a measured policy decision that honors the request or explicitly narrows the contract, with no new overlap or broken routing space. Main risk: a locally appealing gap change expands real grouped drawings or reduces necessary capacity. A changed formula gets its own behavior changeset and refreshed reference/skill/evidence; current cap documentation already ships in M1.

**M8b: expose standoff — LR-019, Build.** Add the already-public key to `src/components/Menus.tsx` and Compare's routing-axis definition/presentation in `src/engines/explorer-engine.js`/`.d.ts` and `ComparisonSidebar.tsx` as needed. Reuse `ROUTING_PARAMS` rather than duplicating bounds. Run V-R02 and its no-effect trio, plus V-E18. Preserve the distinction between soft exit-run preference and obstacle clearance. Test range/default/effective values, source serialization and native/source availability with `tests/routing-own-standoff.test.ts`, `routing-clearance.test.ts`, `source-comparison.test.ts` and `layout-edits.test.ts`. M5 capability validation must be in place before offering a new source axis. Acceptance: the menu and Compare expose the existing range/default, labels match execution, and no effect is allowed on the documented geometry. Ship a changeset, reference/skill changes and updated manifest surface coverage.

**M8c: specialized no-effect contracts — LR-018/LR-016.** M3 supplies safety/diagnostics; M1 supplies truthful prose. Review any proposed semantic extension separately: sequence spacing or position control, root minima, outside-scope roots, integral sweeps, and cold ordering. Use the named repro and a positive counterpart to specify the intended behavior before editing code. Do not quietly start honoring all accepted attributes, and do not add an ordering image with fabricated motion. `tests/sequence.test.ts`, `cells.test.ts`, `layout-fit.test.ts`, `engine-recipes.test.ts` and `routing-order.test.ts` cover the relevant domains. Acceptance can be a documented diagnostic and explicit non-applicability; new semantics require a new fixture, intentional output comparison, changeset, reference and skill update. Genuine cold ordering behavior belongs in optional M10.

For M8a or a semantic extension, use the existing targeted `pnpm audit:compare` workflow against the pre-change commit on relevant grouped/corpus/heldout slugs, then inspect its images under the FEEL rubric. Avoid a new aggregate “quality score” or universal ranking. Full corpus prerequisites are identified in M9.

## 11. M9 — prove the integrated result in a complete checkout

**Scope.** Establish fresh-compile and cross-surface correctness, then satisfy the repository's actual release gates. This is a verification milestone, not permission to broaden the design or discard inconvenient baseline evidence.

**Files.** Extend existing `scripts/prove-file-session.mjs`, `scripts/prove-layout-tools.mjs`, `scripts/prove-site.mjs` and their shared proof helpers only for the concrete risks above. Add exact regression assertions in `tests/translate.test.ts`, `file-session.test.ts`, `vary.test.ts`, `embed.test.ts` and atlas tests. Update `docs/CHECKS.md` with the small new atlas commands and `docs/intent/layout-routing-atlas/plan.md` with actual results.

**Proof requirements.** Compile a saved file in a fresh process, not only the Editor cache. Compare source preview/Apply/Keep/reopen with `draftably inspect --json`; explain numeric tolerance for rounded stays. The recorded pass's maximum fresh-compile drift was 0.489 coordinate units, so do not impose byte identity on that persistence mechanism or use a tolerance broad enough to conceal movement. Preserve surrounding unaffected scope and pins according to their actual coordinate contract. Test external file edits/conflict protection before applying old results. Verify source Undo, timeline selected-versus-hovered state, bookmark jump, Keep for editing/brush, compatible archive reopen, and brush cancel/holds. Browser preferences and session holds are not file source or ordinary diagram JSON fields.

**Command gates.** Run focused tests while changing their subsystem, then run the mandated complete gates once the relevant release is stable:

```sh
pnpm check:fast
pnpm check
pnpm site:build
pnpm prove:site
pnpm prove:file
pnpm prove:layout
pnpm cli:build
pnpm cli:pack-check
pnpm prove:installed
pnpm skill:check
pnpm changeset:check
```

`pnpm check` includes the engine suites and build. Run the long engine work in the background as `AGENTS.md` requests and continue useful review while it completes. At final release verification, `pnpm release:check` combines the required fast, engine and packed-CLI gates; avoid needlessly repeating unchanged expensive suites except where CI or the release gate requires them. Do not run `pnpm release` as part of this integration: it publishes.

Use `pnpm shoot` and existing proof scripts for screenshots rather than writing a new browser driver. Launch file editing through `pnpm draftably open` and use the actual printed Viewer URL; await the debug API's `ready()` before reading geometry. For behavior changes needing corpus assessment, use the existing `pnpm audit:compare --base` interface with the actual pre-change revision and relevant sets/slugs. Check `docs/CHECKS.md` for arguments and artifact locations.

**Acceptance.** Every included milestone has its own passing focused tests and artifact refresh; full-checkout required gates pass; screenshots prove the actual published controls; packed CLI and Editor use the same saved source contract. A clean log identifies what ran, what failed and why; no omitted input is replaced with a dummy fixture to make the gate green.

**Main failure mode.** Treating successful model rendering, a public-site visit, or a partial sandbox test run as proof of an integrated native Editor/release. The following baseline limits must be resolved in Codex's environment before claiming the corresponding full gate.

### Verification already performed and the limits to carry forward

The final positive-fixture reproduction ran 323 sources through 969 actual CLI commands with no errors, checked 17 frozen-geometry comparisons, and validated all 13 complete page fences after correcting the extraction of their first source line. The review also reproduced all supplied-engine metrics, executed focused invalid-input and persistence probes, rendered native model layout/timeline/brush and warm-parameter results, and smoke-tested the portable scripts. Browser availability was recovered after the initial installation failures: Chrome Headless Shell 156.0.8078.80 exercised all 109 offline atlas groups, all their variants and 24 native model renders, with zero JavaScript errors. Shared viewBoxes, search, and exact-SVG downloads were checked; at a 390px mobile viewport the document width was 390px and comparison panels were 354px. These observations validate the downloadable companion, not the proposed integrated Solid component or native Editor gestures. The actual unmodified CLI radius sweep also completed its PNG, contact-sheet and `variants.json` exports; all three tested variants retained the `same as v0` tag despite their different rendered curves. The following log distinguishes completed evidence from remaining integration gates.

| Review observation | Integration action |
| --- | --- |
| `pnpm check:fast` passed TypeScript and ESLint, then formatting failed on 253 unchanged packet files; its chained unit step did not run. | Check the full checkout's formatting configuration and baseline status. Avoid mass formatting as an unrelated “fix.” Run the relevant complete command after integrating. |
| Separate unit run: 59 files passed, one skipped, five failed; 413 tests passed, six failed and eight skipped initially. | Preserve the log and classify failures. Do not summarize this as a passing unit suite. |
| The two loopback-dependent suites were rerun with permitted networking; all ten tests passed. | Run networking proofs in an environment that permits their local server. This resolved those environmental failures, not omitted fixture failures. |
| Packet omits `docs/intent/diagram-quality/corpus/srcly-release/v0.draft`, `heldout/regionshot-capture/v0.draft`, and `heldout/v2ctx-pipeline/v0.draft` under the same diagram-quality directory. | Use the genuine complete-checkout assets for growth/theme/corpus tests. Do not create synthetic substitutes. |
| Packet omits `reference/v7/source/*-engine.js` and `.changeset` release metadata. | Restore the actual repository inputs before engine parity/release checks. The 320-case v7 comparison has its own deliberate legacy routing settings; do not delete it or manufacture a reference to excuse an intended fix. |
| `pnpm site:build` exited 0 and generated 25 pages, with bundle-size advice and a Vite WebSocket EPERM message during page setup. | Keep the actual build log; verify the integrated build without silently reclassifying a noisy setup as pristine proof. |
| The first CLI radius sweep failed mandatory PNG export, and pinned/runtime browser installation attempts failed. A stable Chrome Headless Shell 156.0.8078.80 download then succeeded. The unmodified CLI completed radius 0/6/16 with a `CHROME_PATH` launcher supplying the container-required `--no-sandbox`; all PNGs, the contact sheet and `variants.json` are retained in `evidence/cli-vary-radius/`. All three variants are tagged `same as v0`, confirming the equality defect through the full command as well as the earlier module probe. | Preserve both the failed-attempt log and successful export provenance. Rerun the completed workflow against the integration revision using its configured browser. Browser availability is no longer a blocker in the review environment; native Editor journeys and the repository's full `prove:site` gate still need integration proof. |
| The recovered browser exercised all 109 groups and variants in the offline atlas, including 24 native model renders, with zero JavaScript errors; shared viewBoxes, search and exact SVG downloads were verified. The 390px viewport had no document-width overflow and used 354px panels. | Retain the offline companion's browser evidence and targeted readability screenshots separately from product proof. Recheck shared scale, keyboard/mobile interaction and loading behavior in the integrated `AtlasExample` implementation. |
| Public-site engine edit/Expand/Reset, routing error/Reset, sequence edit/Reset and relevant lesson inspections ran. Native Editor browser workflows did not. | Retain the dated public-site observation as separate evidence; run pinned integrated native/file/browser journeys before promoting their status. |

The review used Node 24.22.1 and pnpm 11.25.0; the repository requests pnpm 11.9.0 and Node at least 22.21.0. Use the project's declared package manager in integration. The packet's lockfile bytes were unchanged by the review.

**Release bookkeeping.** Run skill/changeset checks with real git-base/release metadata. Capture the release's actual source revision in generated evidence. Update reference, skill, examples and limitation labels together when a behavior changes. No change to repository release policy is needed.

## 12. M10 — optional, bounded exploration after correctness

**LR-030: genuine frozen-geometry Compare.** The atlas already supplies verified flat pinned routing experiments. A product mode for arbitrary current nested geometry is a separate capability. Prototype only after M5: define whether it is native-only or how exact geometry persists in a source document, hold world-space node and group rectangles constant, show what happens to channel reservations/title bands/labels, and compare routes under a declared history policy. Candidate files are `src/state/comparison.ts`, `src/lib/engine-tasks.ts`, `src/model/routes.ts`, comparison components and a narrow source persistence helper if justified. Exit with a concrete faithful design and fixture proof or a documented defer decision; do not claim that merely recompiling source freezes layout. Any shipped feature needs a release note and updated coverage, docs and skill as applicable.

**LR-034: meaningful cold ordering.** Current cold stable/crossings use the same branch. Explore a distinct semantic only with a fixed source-order graph where stability has a meaningful preservation objective and crossing reduction has a measurable tradeoff. Candidate files are `src/engines/layout-engine.js`, its declarations, `src/dsl/compile.ts`, `tests/engine-recipes.test.ts` and `tests/routing-order.test.ts`. Compare output and stability under a small source edit; preserve pins and grouping. If no useful distinction emerges, keep the honest current limitation or simplify the advertised capability. Neither a new algorithm nor a changed default is preauthorized by the desire for a visible example.

M10 is not a reason to postpone complete docs. LR-029/LR-032/LR-033 remain Avoid decisions and LR-031 remains Defer as defined in the recommendations. No new layout dependency, generic playground framework, or invented performance/quality guarantee is part of the approved design direction.

## 13. Codex handoff and integration procedure

1. **Preserve the supplied package unchanged.** Keep it beside the working checkout as `../draftably-review-original/`; retain the original ZIP/contact sheet and hashes. Import copies into the destinations above. Original baseline evidence must remain retrievable after new renders replace published assets.
2. **Verify source identity before reproducing.** In a clean checkout, `git rev-parse HEAD` must identify the reviewed baseline for baseline proofs. Read `PACKET.md`, `AGENTS.md`, `docs/CHECKS.md`, `docs/RELEASING.md` and the FEEL rubric. Use separate worktrees for stacked branches. Inspect later-main drift in registries, serializers, comparison and docs rendering before applying the plan; record differences instead of overwriting newer work.
3. **Reproduce the decisive claims before fixing them.** With baseline dependencies installed, the supplied scripts run from the checkout without hardcoded workspace paths:

```sh
node ../draftably-review-original/scripts/probe-editor.mjs --repo . --examples ../draftably-review-original/examples --out tmp/atlas/baseline/probes
node ../draftably-review-original/scripts/probe-editor-persistence.mjs --repo . --examples ../draftably-review-original/examples --out tmp/atlas/baseline/persistence
node ../draftably-review-original/scripts/render-editor-model.mjs --repo . --examples ../draftably-review-original/examples --out tmp/atlas/baseline/model
```

These scripts load real baseline modules and export actual SVGs. They do not install dependencies or modify source. Inspect the accompanying script README for output contracts; route exports start without previous UI route-cache history. Do not compare transient timestamps/durations as deterministic geometry. The package's routing runner and exact engine sources provide the other decisive reproduction inputs.

4. **Integrate M1 and M2 as separate reviewable changes.** Reconcile the canonical IDs/aliases once, then use them through later PRs. The report's draft prose can be split across the destination pages while preserving all substantive parameter explanations and current limitation notes.
5. **Fix product defects with their regression source attached.** Preserve original failing evidence; add current expected results under the new commit. PR descriptions should state the concrete problem, changed behavior, affected context and test result. Avoid bulk reformatting or unrelated UI redesign.
6. **Integrate M6 and finish M7.** Check all 197 entries and all states/contexts, not merely the 105 family titles. A family with several subexperiments needs each named baseline and result. Keep source, full native input and action recipes downloadable from the lesson.
7. **Run M9 on the integrated revision.** Resolve the complete-checkout prerequisites; retain real output and screenshots; note any intentionally changed baseline geometry. Only then update documentation claims from proposed/source-established to executed on that revision.

The ordinary implementation choices above are resolved. The bounded decisions left are the group-gap policy, safe/compatible diagnostics for ignored specialized settings, and the two optional M10 capabilities. They do not block shipping accurate first-stage content or completing the full visual coverage promised by this mission.
