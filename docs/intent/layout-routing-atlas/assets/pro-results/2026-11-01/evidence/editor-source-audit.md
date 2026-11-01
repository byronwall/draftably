# Editor, CLI and documentation coverage audit

Baseline: `af70d8317797d5a522acffdd604819376a3ec893`, authoritative attached packet. This sub-audit reads source and tests; **no browser interactions or test runs were executed by this sub-agent**. Root owns experiments and live-browser observations. Any source-derived UI expectation below must retain that evidence label until observed.

## Decision

Build a **task-led guide with a source-linked visual atlas and full parameter reference**, inside the existing Markdown/live-example system. Start with working prose and ordinary editable `draft` examples. Add one small comparison renderer only for the mechanisms that need shared-scale or frozen-geometry proof. Do not build another general playground, an external documentation framework, or a matrix of hundreds of simultaneously running live editors.

The largest reader problem is context ambiguity: the same named operation can mean a cold source compile, a warm solve, a bounded pass, or a local geometric edit. The source-backed and native JSON paths have materially different persistence and effective settings. A complete reference has to state these contexts before naming parameters.

## Inventory and count

`editor-inventory.json` contains **90 public editor/CLI controls and operations**, stable E001–E090. Thirty-six numbered editor/CLI storyboards (V-E01–V-E36) and four justified nonvisual groups cover those rows. Count the canonical layout/routing controls in their own inventories once; this inventory intentionally references the ten layout-engine and numeric engine/routing parameter inventories rather than repeating their rows. E010 is the editor-only `canvas` state of the canonical aspect control; root can merge it into that canonical row if counting settings by shared semantic identity rather than surface.

This inventory includes:

- Layout convenience presets, editor-only Separate, scope and pass/protection settings.
- Pass, preview, keep/discard/hold, rebuild, checkpoint, manual/refinement cleanup, align/distribute, snap/badges, container controls, collapsed view, start/end preferences.
- Compare mode/kind/approaches/start type/axes/scope/effort/release ports/generation/application plus shared-scale visual-inspection controls and exports.
- Timeline recording, frame selection/peek/play/ghost/path camera/bookmark/keep/cancel/reopen/save.
- Brush activation, five modes, radius/strength/soft edge/restore holds/reference/clear holds/Alt/single dab/warm preview.
- `vary` suggestions, exact sweeps, grid/scope/fit/prefer/from/budget/limit/out/json/no-source/apply; layout-related diagnostics and stale refinement cleanup.

All general file management, theme palette, drawing-shape creation, PDF/page export settings, search/navigation, and unrelated editor formatting actions are outside layout/routing option coverage, except where they provide an entry path or change input geometry. Camera settings are included only for Compare/timeline because they determine whether visual comparisons are honest. Ordinary node dimensions, pin syntax and source refinements belong to the canonical DSL inventory.

## Context table the docs need before any parameter list

| Context | Starting geometry and settings | What persists |
|---|---|---|
| `.draft` compiler / CLI `inspect` | Deterministic cold source compile; file recipes and compiler context; no prior edit history | Nothing changes; it renders source |
| Editor source-backed automatic rebuild / Compare rebuild | `candidateSource` / `runRecipe` write a proposed engine line, remove soft placement refinements in scope, then compile that source | New layout line and removal of soft refinements after Keep/Apply |
| CLI `vary` engine sweep | `applyEdits` changes named layout attributes but **keeps** authored near/nudge/stay/pin and comments | Candidate artifacts; `--apply` later changes only recorded source edits |
| Native JSON editor cold rebuild / Compare rebuild | Engine compute from canonical seed with JSON settings, pins/frames/intent and requested scope | Candidate document/geometry as one undo step |
| Compare warm / bounded pass (either editor mode) | Current coordinates; warm settles, pass obeys movement budget | File mode writes soft stays plus anchors; JSON saves arrangement |
| Timeline | Current coordinates, warm settled solve by default, recorded checkpoints | Keep writes selected arrangement; timeline archive is separate |
| Brush | Local leaf shapes under brush, current coordinates/reference and session holds | One stroke/dab arrangement and undoable holds; no brush recipe |

Sources: `src/state/layout.ts:runLayout,runRecipe`; `src/state/comparison.ts:candidateSource,generate,applyCandidate`; `src/dsl/layout-edits.ts:setLayoutRecipe,writeArrangement`; `src/cli/variants.ts:applyEdits,vary`; `src/engines/sculpt-engine.js:journey,dab`; `src/state/file-session.ts:arrangementEdit`.

## Ranked product findings

### ED-01 — Default omission breaks file folding controls (Build, behavior fix, high)

**Source fact.** `LayoutLab.defaults.fold` is `never` (`layout-engine.js:132`). `engineAttrs` drops any setting equal to `LayoutLab.defaults` (`layout-edits.ts:55–62`). The compiler independently treats an omitted engine `fold` as auto (`compile.ts` uses `engine.params.fold !== 'never'` in fold paths, confirmed by layout sub-audit). Therefore a UI selection of **Continuous ranks** / `never` is omitted from the written recipe, and source compilation can fold anyway. An existing explicit `fold=never` may be removed by a rebuild. Compare file fold sweeps can label distinct choices but compile equivalent folding behavior.

**Proposed fix.** Centralize the effective **file-recipe** defaults used by serializer and compiler, or explicitly emit `fold` when necessary to preserve intent. Do not reuse raw engine defaults as a universal serialization-default table. Add round-trip assertions for auto/never from an omitted/default/explicit recipe across preview, Keep, reopen and CLI inspect.

**Closely related direction issue.** `engineAttrs` omits RIGHT because it assumes compiler auto reads right. Node layout may match, but `projectScene.readingDirections` only sets `flow` metadata when root direction is explicitly non-auto. This can make explicit right and omitted auto route differently. Verify with a frozen graph; do not equate them solely on coordinates. Keep RIGHT explicit when preserving an authored route-direction choice.

### ED-02 — File Compare exposes controls its source branch does not apply (Build, behavior/UI fix, high)

**Source fact.** `state/comparison.ts:159–169` chooses `candidateSource` for all file routing candidates and file rebuild candidates. `generate` then dispatches `{kind:'source',source,spec}`. `lib/engine-tasks.ts:compileCandidate` projects a cold source compile and routes with `previous:[]`; the Compare config is not passed. It returns `report:null`.

Consequences:

- Routing **Release fixed port sides** never reaches the file candidate; `sourceWithRouting` edits only the routing statement, not edge `from`/`to` attributes.
- File rebuild **Maximum solver effort**, Compare drawing intent, fixedIds/session brush holds, and canvas viewport do not reach compilation.
- Source serializer writes only `algorithm.controls + ['nodeGap','aspect']`, plus DOWN. Compare `effectiveParams` offers shared `rankGap`, `flowStrength`, `respectDirection`, `respectManual`, `growContainers` to every connective algorithm, but some have no file spelling or are omitted for that approach.
- This affects **hosted examples too**: `openExampleSession` sets a FileSessionInfo and `fileMode()` is true.

**Proposed fix.** Make the effective experimental surface explicit: `source recipe`, `current geometry`, or `routing with frozen geometry`. For file-recipe mode expose only values the serializer can faithfully represent. Disable/label source-inapplicable fields instead of quietly accepting them. For Release fixed sides either author concrete edge-attribute edits and show them, or hide it until supported. Preserve current current-geometry operation paths for warm/pass. A narrow capability helper next to existing registries suffices; no new compatibility framework is needed.

### ED-03 — Source Compare labels can disagree with clamped effective values (Build, behavior fix, high)

**Source fact.** `ExplorerLab.parseValues` checks numeric finiteness, not ranges. `ExplorerLab.candidate` checks that each patch value equals the normalized value and rejects out-of-range inputs. `candidateSource` uses `LayoutLab.settings` / `RouteLab.settings` but omits that equality check. These normalize by clamping. A source-routing cell labeled `edgeGap=1` can actually contain `edge-gap=4`; a nonintegral iterations/sweeps value can similarly be normalized if exposed. This is an especially serious problem for a teaching atlas because it looks like a measured experiment at the authored value.

**Proposed fix.** Validate per-cell values before selecting execution path, then record both requested and effective settings in candidate data if any intentional normalization remains. Never keep a caption for a value that was not executed. Add source/native parity tests for out-of-range and enum values.

### ED-04 — Source candidates do not carry compile diagnostics into Compare cards (Build, behavior fix, high)

**Source fact.** `compileCandidate` calls `projectScene(await compile(source))` and returns no compile diagnostics and `report:null`. `ComparisonDialog` displays routing blocked/lane-pair warnings and layout-report warnings, but no compile diagnostics. Thus a validly parsed candidate with refinement/layout diagnostics has no complete explanation in the card. The current file UI also displays no settled-iteration report because the source compile returns none; docs should not imply the visible setting controlled such a report.

**Proposed fix.** Return structured source diagnostics separately from solver reports, propagate them to cards and export, and refuse applying an error-level compiled candidate. Do not fabricate a LayoutReport for a compiler path that did not produce one. Add a pinned-conflict and relaxed-refinement fixture to source Compare proof. Root should verify exact compile diagnostic behavior before asserting a user-observed failure.

### ED-05 — `same as` is an approximate fingerprint, not proof of visual equality (Build, behavior/reporting fix, medium-high)

**Source fact.** `cli/variants.ts:draw` builds its deduplication key from SVG dimensions plus node/group centers and route points rounded into 4px bins. It omits rendered corner radius and other styling. `--try`/`--grid` retain repeats and tag `same as`; suggestions discard them. A square-versus-rounded-corner sweep can be visually different with equal route-point geometry and thus receive a misleading equality tag. Small coordinate differences can also be quantized away.

**Proposed fix.** Name the equivalence claim precisely: `same coarse geometry` or separate exact geometry, route-point, and rendered-path signatures. Keep raw canonical data to prove no effect; do not demand byte-equal SVG if metadata IDs change. `corner-radius` deserves an enlarged corner visual regardless of route metric identity. This is a correctness issue in a visual atlas, not a request for another layout algorithm.

### ED-06 — File-mode Inspector exposes unsavable container controls (Build, behavior/UI fix, medium)

**Source fact.** `Inspector.ContainerSections` renders **Arrange contents** and **Inner padding** regardless of file mode. They mutate `layout.containers`; `translateEdit` has no mapping for those generic settings, and `projectScene` rebuilds container inset/direction from source. `file-session.handleEdit` snaps back if no source text changed. `Fit contents` is already explicitly blocked in file mode, making the inconsistency harder to understand.

**Proposed fix.** Translate Arrange contents into the relevant source recipe if a faithful mapping exists, otherwise disable it and link to the group's layout line. Inner padding has no generic current DSL field; hide/label it in source mode rather than invent syntax. Add tests that every visible enabled control either changes documented source or is explicitly a view preference.

### ED-07 — The static atlas will overwhelm the current eager live-example loading strategy (Build, minimal docs renderer, medium; prospective)

**Source fact.** `Docs.tsx` awaits `Promise.all(next.drafts.map(prepare))` before swapping a page. It also warms `PAGES.flatMap(p=>p.drafts)` after mount. `Example.tsx` retains compile results in maps and draws all theme variants. This is sensible for the present modest set, but an exhaustive atlas with many expensive routes scales work with all variants and can delay page availability.

**Inference.** A large atlas implemented as hundreds of ordinary draft fences per page will increase initial computation and memory. No runtime regression is claimed yet.

**Proposed fix.** Split pages by reader task; show a static verified baseline/selected variant first; lazily compile an opened comparison, only selected or adjacent variants; use the existing worker/draw path. Keep the M1 prose+few-fences improvement independent of this renderer. Add a concrete example-count and page-ready browser proof before enabling all-atlas preload.

### ED-08 — Small documentation inaccuracies obscure dependable workflows (Build, content, medium)

- The global action **Tidy positions** uses the current `doc.settings.algorithm`, not necessarily algorithm `tidy`. `commands.layout -> runLabLayout -> runLayout` proves it.
- Current docs describe the timeline scope as “the diagram”, but `openTimeline` inherits `currentScope()` and selected IDs.
- **Layout preview** text says nothing changes until Keep, but ordinary subsequent edits trigger `onBeforeEdit(acceptPreview)`. Describe the implicit accept path or change product behavior.
- Current docs say all engine settings can be swept; `parseTry` explicitly rejects `root`. `standoff` has no default steps and requires an explicit list.
- Current `--scope` prose says routing stays unchanged, true for scoped suggestions; explicit routing axes under `--scope` still set the global routing line.
- A new JSON document starts with algorithm tidy, fold never, respectDirection true. Default Compare selects six other approaches and rebuild; source compiler defaults differ. There is no single “default engine” across these contexts.
- `moved` in vary averages all visible rectangle centers (including groups) after each drawing is translated by its minimum x/y, so it ignores whole-drawing translation. State this when using `stable` as evidence.
- `vary` warning counts are not identical to all `check --metrics` warnings. The latter adds crossing/detour/stranded/aspect quality notes; vary's `draw` counts layout warnings/soft-split/conflicts. Do not merge the two numbers under one unlabeled heading.

## Important behavior that should be documented, not redesigned

### Ranking is deliberately conservative

`variants.improves` refuses a candidate with more warnings or crossings. Without fit it also requires area no larger than baseline unless reducing warnings under the no-more-crossings condition. With fit it allows up to50% area growth plus a closer fit under its tolerances. `--prefer` changes sorting among acceptable variants; it does not remove the recommendation guard. Therefore the supplied fixture's v0 can remain recommended while zero-crossing engines exist with82%/91% more area. This is useful editorial evidence: the recommendation reflects a particular tradeoff rule, not “best algorithm”. No new ranking UI is necessary for M1, but show the guard and tradeoff.

### Source-backed exactness is a good constraint

A file rebuild preview compiling its proposed source is the right way to promise reopen parity. Do not replace it with a native candidate screenshot and later serialize lossy settings. The repair is to make available controls and effective values faithful. Warm passes must stay arrangement edits because earlier geometry is an input not encoded by the engine name alone.

### Keep duplicate demonstrations honestly

CLI sweeps retain duplicate results; native Compare always keeps selected candidates. An equal result is valuable when explaining the shared cold seed, unsupported parameter, already-satisfied geometry, pin blockage, or convergence before an effort cap. Label which of those causes is supported by evidence. A no-effect observation on one graph is not a universal unsupported-setting diagnosis.

### Session geometry is not permanent semantics

Brush holds are undoable session constraints, not pin directives. The timeline JSON contains a baseline and recorded frames; it is not a recipe for reproducing “step42” after changing nodes. Collapse/camera state are view state in `.draft` mode. Checkpoints are intentionally unavailable there because source history already supports Undo. These boundaries should be visible at the point of use.

## Documentation design comparison

Scores below are editorial assessments (1 poor–5 strong), not measured usability results. Coverage, causality, repair choice get equal priority; maintenance and narrow-screen legibility are feasibility checks.

| Design | Coverage / causality / repair choice | Assessment |
|---|---|---|
| A. Expand current parameter and engine tables; one full gallery page | 5 / 2 / 2 | Easy to inventory and ship, but engine images at different fits conceal size; users still cannot tell when a knob applies or which fix to try. Many live fences also cause eager work. |
| B. A new dedicated interactive playground with all controls | 5 / 4 / 3 | Can explore interactions but duplicates current Editor/Compare and adds maintenance, routing/state/persistence rules and phone controls. Too much infrastructure for this project. |
| C. Task-led guide + focused visual atlas + complete source-linked reference | 5 / 5 / 5 | Recommended. One question per visual, explicit starting context, reusable exact fixtures, small comparison renderer only where needed. Existing Docs navigation/search/live source retained. |

### Recommended navigation

Keep `docs/DSL.md` as language reference and preserve existing `## Layout engines`, `## Routing`, `## Layout tools` slugs. Add guide Markdown under `site/docs/pages/`:

1. **Choose a layout**: engine selection with single common graph, then graph-family matches.
2. **Fix a drawing**: symptom-to-control decision order and links to the exact pair/sweep.
3. **Compare layouts**: execution contexts, native/source distinctions, fair comparisons, Apply semantics.
4. **Timeline and brush**: recorded evolution, local restoration and session protection.
5. **Layout atlas** index: categorized visual entries, canonical control name plus DSL and UI labels.

The canonical DSL reference houses complete ranges/defaults/persistence; guide pages should link to it rather than duplicate divergent tables. Put one-line applicability near each control's small example. Current `content.ts` already discovers guide Markdown and creates sidebar groups; only extend `GROUPS` explicitly so new guides do not accidentally fall into Language.

### Minimal visual renderer

One narrowly scoped `AtlasExample.tsx` can accept an authored fixture-family ID from a small manifest. Do not give the reader an arbitrary algorithm builder. Required features:

- baseline + selected variant at one world scale, a resettable parameter selector, and a readable narrow-screen baseline toggle;
- exact changed source lines and effective settings, source copy / Playground handoff, rendering status and metric summary;
- optional overlays only from explicit metadata: port markers, rank bands, clearances, movement vectors; no generic geometry inspector is necessary;
- static fallback/alt explanation and lazy compute; expands the existing Example/Zoom functions instead of replacing Docs.

A single shared-scale pair is sufficient for many examples. A scrubber/animation should be added only if temporal change is the lesson (timeline, pass stability). Do not build synchronized complex editing across all engine panels. Preserve source reset and last-good drawing on errors.

## Durable coverage check proposal

Add `docs/layout-atlas/manifest.json` (or a typed file near site docs) with entries `{id, controls, source, variants, mode, frozen, expected, status, page}`. One canonical fixture source per base; variant edits are explicit and generated `.draft` companions can be checked in or generated deterministically for tests. Existing registries remain authoritative:

- compare file-engine choices to `ENGINES`, engine parameters to `ENGINE_PARAMS`, router values to `ROUTING_PARAMS`;
- compare editor algorithm IDs to `LayoutLab.algorithms`, plus explicit UI operations curated from current public components;
- every public inventory ID resolves to ≥1 storyboard, or a concrete nonvisual justification;
- every categorical state has a named sample; numeric controls have low/default/high or a justified constrained sample;
- every example compiles with zero unplanned errors; expected error/warning cases assert exact diagnostic codes;
- frozen-route comparisons assert node/group rectangles equal before comparing routes;
- duplicates explicitly assert exact/approximate/effective-setting equivalence; do not use a blanket “must differ” test;
- source-backed UI writes round-trip through compiler and reopening; action/persistence seams receive targeted browser proofs;
- no drift between visible label and effective normalized setting.

This supplements `tests/site-docs.test.ts`, which currently only compiles `draft` fences and checks error diagnostics. It does not test option coverage, route geometry, warning expectations, visible defaults, frozen geometry, or meaningful differences.

## Proposed shippable milestones for root plan

- **Content baseline:** substantial rewritten layout/routing/tools reference, symptom guide, common ten-engine evidence annotated with area tradeoffs; ordinary editable examples. Files `docs/DSL.md`, `skills/draftably/SKILL.md`, `site/docs/pages/*`, `site/docs/content.ts`, `examples/atlas/*`; add changeset for shipped docs/examples. Acceptance: reader can choose source recipe vs pass vs router without new UI.
- **Atlas fixture contract:** manifest + canonical examples + parameter-state matrix + compilation/geometry assertions in new `tests/layout-atlas.test.ts`; reuse existing `tests/site-docs.test.ts` and CLI draw/inspect. Acceptance: inventory keys all mapped, no silently missing settings or broken companions.
- **Minimal comparison renderer:** `site/docs/AtlasExample.tsx`, small content/Docs parser integration, CSS, narrow-screen screenshot and keyboard proof in `scripts/prove-site.mjs`. Acceptance: shared scale, effective settings, readable labels, lazy compute; existing ordinary `draft` fences unchanged.
- **Behavior correctness release:** serializer defaults/direction, source Compare capabilities/validation/diagnostics, Inspector control support and fingerprint claims as separate small fixes. Acceptance: source+UI+CLI parity and targeted failure cases, not whole unverified algorithm rewrites.
- **Full atlas completion:** all remaining editor/CLI visuals, all categorical states and numeric sweeps, informative no-effect cards, render-status manifest. Acceptance is countable coverage, not number of screenshots. Full checks from a complete checkout (packet lacks historical reference assets required by engine parity).

## Source access and files read

**Read complete:** PACKET.md; pro-prompt.md; AGENTS.md; `src/state/layout.ts`, `scene.ts`, `comparison.ts`, `sculpt.ts`, `file-session.ts`, `commands.ts`, `launch.ts`; `src/components/LayoutLab.tsx`, `Menus.tsx`, `LayoutPreviewBar.tsx`, `comparison/ComparisonSidebar.tsx`, `ComparisonDialog.tsx`, `sculpt/TimelineDeck.tsx`, `BrushDock.tsx`; `src/model/types.ts`, `samples.ts`; `src/engines/layout-engine.d.ts`, `explorer-engine.js`, `explorer-engine.d.ts`, `sculpt-engine.js`, `sculpt-engine.d.ts`; `src/dsl/layout-edits.ts`; `src/cli/variants.ts`, `vary.ts`, `main.ts`; `src/lib/engine-tasks.ts`; `site/docs/content.ts`, `Docs.tsx`, `Example.tsx`, `site/live/LiveEditor.tsx`; `docs/intent/layout-in-files/plan.md`; tests `site-docs.test.ts`, `layout-edits.test.ts`, `vary.test.ts`, `engine-parity.ts`, `engine-layout.mjs`, `engine-sculpt.mjs`.

**Read relevant sections/search and followed symbols:** `docs/DSL.md` Layout engines/Routing/Refinements/Layout variants/Editing in the viewer/Layout tools; `src/components/Inspector.tsx`, `StartScreen.tsx`, `Toolbar.tsx`; `src/model/document.ts`, `edits.ts`; `src/state/actions.ts`, `pointer.ts`, `files.ts`; `src/dsl/translate.ts`, `project.ts`, `syntax.ts`; `src/engines/layout-engine.js`; browser proof scripts and file-session test references. Other agents own complete compiler/routing reads.

No `src/cli/index.ts` exists in the packet; current CLI entry is `src/cli/main.ts`, which was read completely. This is a prompt-path mismatch, not missing decisive source.

**Check limitation:** `tests/engine-parity.ts` reads `reference/v7/source/*-engine.js`. Those historical assets are omitted from the packet; a full `pnpm check` can fail at that stage for missing input. Do not claim full-gate success from packet-only tests.
