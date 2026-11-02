# Implementation plan: a smaller, truthful layout and routing surface

Baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`. Research/evaluation only: no product source was changed by this assignment. Codex owns product integration. The measured portfolio and policy freeze are in `report.md` and `data/`; apply those exact method/preset selections when implementing milestones 3–4. The heldout evaluation is complete: no frozen reduced cold-layout selector or portfolio passes the 95% common-job requirement in every profile. Retain current first-render and router defaults. The six-engine pack is an experimental Compare option, not a validated replacement. The three-route pool passes its narrower current-position oracle test and is useful in a previewed comparison.

## Decision and scope

**Build a simpler reversible editing surface while retaining the source language, specialist structures, and warm repair tools.** Fix controls that presently promise effects the file pipeline does not consume. Separate the set of implementations kept internally from the much smaller default Compare list. Retain all 11 internal engines and all six source recipes. The completed evidence does not authorize implementation deletion: omitted methods have cold heldout and warm-edit witnesses.

No new compatibility layer, engine package, layout library, asynchronous service, persisted oracle result, or automatic source migration is required. The current local JavaScript engines, compiler, source edit seam, worker, and renderer are sufficient to ship the first useful milestones.

### Recommendation classes

| Class | Meaning here | Examples |
|---|---|---|
| Build | Concrete shippable change or invariant to preserve, supported by source trace and evaluation | Truthful file-mode controls, preserve fit in recipe writeback, separate Improve/Rearrange, context constraints |
| Explore | A bounded implementation/measurement question with a named success condition | A new selector evaluated on a new untouched split; exact routing alternatives behind preview |
| Defer | Retain behavior and source compatibility; no immediate implementation removal | Non-default engines without comprehensive dominance proof; untested style or specialist changes |
| Avoid | A change that would invalidate evidence or lose useful semantics | Replacing recipes with graph engines; treating no-history portStability as dead; deleting aliases silently; adopting a heldout-retuned selector |

Stable recommendation IDs are in `inventory.csv` / `inventory-source.json`; engine IDs use `ENG-*`, source/layout `LAY-*`, routing `RTE-*`, authored `AUTH-*`, actions `ACT-*`, interface `UI-*`, brush `BRUSH-*`, and diagnostic `DEBUG-*`. Do not renumber them when the measured annotation changes.

## Milestone 0 — Integrate the evidence package as a reproducible fixture set

**Class: Build.** Purpose: make later product decisions checkable against the immutable baseline and actual completed trials.

- Keep corpus originals separate from generated cases, and retain family/split/job metadata. Preserve fresh heldout status and historical repository-heldout labels.
- Import the replay harness as a development tool, not a product dependency. It should load the actual engine and production compiler modules from the chosen checkout.
- Preserve metrics component columns, failures, timeout rows, trial settings, geometry hashes, timing samples, prior-state identifiers, and policy freeze hashes. Failed cases stay in coverage denominators.
- Convert the smallest decisive good/adverse witnesses into focused product regressions. Keep the large benchmark outside ordinary fast checks.
- Record which tests are ordinary product regressions versus benchmark trials; repeated timings and correlated edits are not independent cases.

**Code/docs areas:** `scripts/bench/`, a scoped evaluation command if desired, `docs/CHECKS.md`, `docs/intent/diagram-quality/{RUBRIC,CORPUS,NEXT}.md`, existing regression test files listed below. Keep runtime product modules untouched in this milestone.

**Acceptance:** replay the report's decisive cases at the named baseline; reproduce geometry/port/path hashes within the documented tolerance; reproduce all summary counts from raw data without hidden state. A resume command must skip completed settings and retain failures rather than erase them. The source packet hash and module hashes must match before a baseline replay.

**Risk:** a moving checkout can produce a valid new experiment with different outputs. Name it as a new baseline; do not call it reproduction of the old one.

## Milestone 1 — Make file-mode controls truthful and preserve source intent

**Class: Build.** This milestone does not depend on a new engine winning. It removes misleading interaction while preserving implementation capability.

### 1A. Build one capability description per execution path

**IDs:** `UI-COMPARE-KIND`, `UI-COMPARE-AXIS-A`, `UI-COMPARE-AXIS-B`, `UI-MAX-ITERATIONS`, `UI-RELEASE-PORTS`, `AUTH-INTENT-START`, `AUTH-INTENT-END`, `LAY-RESPECT-DIRECTION`, `LAY-RESPECT-MANUAL`, `LAY-GROW-CONTAINERS`, `LAY-ASPECT`.

**Code areas:** `src/engines/explorer-engine.{js,d.ts}`, `src/components/LayoutLab.tsx`, `src/components/comparison/ComparisonSidebar.tsx`, `src/state/comparison.ts`, `src/state/layout.ts`, `src/dsl/layout-edits.ts`, `src/workers/engine.worker.ts`.

Describe at least these paths explicitly: source rebuild; source routing variation; warm settled engine; bounded pass; brush/timeline. Every displayed control must either be consumed by that path or disabled/absent with a reason. The registry can reuse `ENGINE_PARAMS` and `ROUTING_PARAMS` for attributes and units, but applicability is more than a list of parser keys.

- Source rebuild does not accept pass movement/stability/effort, manual protection, raw growContainers, canvas aspect, or JSON layout intent as source attributes. The compiler owns its fixed effort and growth behavior.
- Source Compare cannot promise a changed maximum effort or drawing intent when `candidateSource` does not serialize them.
- Source routing Compare does not currently apply `autoPorts` or pass prior route state to its source worker. The smallest change is to remove Release fixed port sides from that context and retain the existing explicit Use auto ports command. Implementing release in source would be a separate deliberate edge edit.
- Source/cold ordering is not the warm ordering choice: `layeredTarget` sweeps on every rebuild. Hide or label its ineffective cold control after the targeted equality witness; preserve warm stable/crossings behavior.
- Route corner radius is appearance. `standoff` is a live source/API input and belongs in the advanced routing registry, even if hidden in the basic UI.

**Acceptance tests:**

1. In a file rebuild, inspect the exact replacement recipe and verify every enabled setting survives compile→project→save→compile. An unsupported setting must not be enabled and silently dropped.
2. In source routing Compare, explicit `from=left to=top` remains unchanged unless the explicit Use auto ports action is invoked. No ineffective checkbox is offered.
3. In raw warm routing Compare, all candidates receive exactly the same prior side state and the same positions; previous candidates never seed later ones.
4. Compare's displayed effective effort matches the path's actual cap; source remains compiler constant 640 unless an explicit new source contract is designed.
5. Stable/crossings produce exact equality on a targeted cold source witness and a measured non-equivalent warm witness when the setting is active.
6. Corner radius keeps selected sides/polyline points unchanged but changes the rendered rounded path; standoff changes a verified nearby-obstacle witness.

Use `tests/layout-edits.test.ts`, `tests/engine-recipes.test.ts`, `tests/vary.test.ts`, `tests/routing-ports.test.ts`, `tests/routing-own-standoff.test.ts`, `tests/routing-clearance.test.ts`; add narrowly scoped capability tests where the pure decision logic belongs. Assertions should check actual serialized behavior and geometry, not merely duplicate the metadata table.

### 1B. Preserve fit and explain refinement removal

**IDs:** `LAY-FIT`, `LAY-ASPECT`, `ACT-REBUILD`, `AUTH-ORDER`, `AUTH-NEAR-SIDE`, `AUTH-STAY-X`, `AUTH-STAY-Y`, `AUTH-ALIGN-STRENGTH`.

**Code areas:** `src/dsl/layout-edits.ts` (`engineAttrs`, `setLayoutRecipe`), `src/state/file-session.ts` (`sourceWithRecipe`), `src/state/layout.ts` (`runRecipe`), `src/components/LayoutPreviewBar.tsx`, `src/components/LayoutLab.tsx` (`FileRecipe`).

Current `setLayoutRecipe` preserves min-width/min-height but drops `fit=`. Preserve existing fit when changing only the engine or an unrelated setting. Define the precedence between an explicit new Format choice and an existing aspect. Do not add a new compatibility syntax.

The measured `presentation-03` edit is a regression witness for the interface contract: `direction=down fit=wide` can retain the exact previous node geometry because `fitVariants` searches both reading directions. In this first milestone retain the existing source semantics and make the control say “Best fit, may change direction” when fit is active. Do not promise an independent direction lock. A direction-preserving fit change is **Explore** until its authored-source semantics and existing-file effect are specified. `doc.settings.direction` is not a compliance oracle for source recipes: `projectScene` copies root engine direction but leaves ordinary recipe tool settings at their default.

Show which soft refinements a replacement removes. Retain pins, exact sizes, required alignments, and nested recipe lines. The current near/nudge/stay removal is intentional for a new arrangement; the UI must make its extent reviewable before Keep.

**Acceptance:** use a grouped fixture with `fit=slide`, a nested cells/row recipe, a pin, a size, a required alignment, and several soft stays. Preview is nonpersisting; Keep changes only the chosen scope's recipe/refinements; Undo restores exact source. Reopen produces the same geometry as the preview. A no-op settings change does not create an unnecessary source edit.

Add the exact `presentation-03` before/after direction edit. The current-semantics UI must disclose the fit-selected orientation and offer a reviewable source escape; it must not show a successful “top to bottom” badge solely because a tool setting reads DOWN. Without an active fit search, direction changes must reach the actual cold source path. Global direction/format jobs never dispatch to bounded Separate or a small tidy pass. A later direction-lock implementation must filter or otherwise constrain fit variants and test that old saved-source behavior changes only under its deliberately defined contract.

**Risk:** preserving fit can legitimately change the result compared with the present buggy writer. Treat this as a corrected authored-intent path with explicit golden fixtures, not an engine regression to conceal.

## Milestone 2 — Ship the simpler main UI with current behavior underneath

**Class: Build.** **IDs:** `UI-SCOPE`, `LAY-DIRECTION`, `LAY-FIT`, `ACT-TIDY`, `ACT-PREVIEW-TIDY`, `ACT-REBUILD`, `ACT-KEEP`, `ACT-DISCARD`, `ACT-HOLD-BEFORE`, `ACT-UNDO-REDO`, `AUTH-FROM`, `AUTH-TO`, `ACT-PIN`.

**Code areas:** `src/components/LayoutLab.tsx`, `Menus.tsx`, `LayoutPreviewBar.tsx`, `Inspector.tsx`, `Toolbar.tsx`, `src/state/commands.ts`, `src/state/layout.ts`, `src/state/file-session.ts`, existing CSS/control components.

- Keep Improve (bounded current-arrangement repair) distinct from Rearrange (new source arrangement). Rename only after documenting whether Improve still uses the selected engine or a fixed tidy policy. Choosing a fixed method requires the warm comparison evidence.
- Route edits by intent: appearance-only retains geometry; relabel/add/local edits may use the protected warm policy; direction/format invokes source rebuild; structural recipes use their existing compiler path. The E global-direction warm results are diagnostics, not a deployable workflow.
- Basic fields: Scope, Reading direction, Format. Remove Diagram type aliases that silently select algorithms. Advanced retains a named-method override.
- Context scope uses whole diagram, selected siblings, or one group. Neighbourhood is advanced. A source rebuild cannot act on a loose selection; offer Improve for it instead.
- Keep Pin and explicit endpoint sides in the inspector. Show resolved auto sides separately from authored overrides.
- Move nine routing numeric sliders behind one disclosure. Main connections chooses a validated preset and can compare/revert. Keep raw exact values in source and advanced UI. Move corner shape to Appearance.
- Keep the active source recipe and pending replacement visible. No new recipe is written just to adopt the panel's defaults.
- Preview and one-step Undo remain the commit mechanism. Changing a preference alone must not relayout the document.

**Acceptance:** keyboard and pointer operation, focus returned on closing panels, read-only source text accessible, disabled path choices truthful, pin/side overrides preserved, no geometry change when opening a panel or selecting a node. Basic-field count is 3; main numerical route-slider count is 0. These count gates are implementation checks, not proof of usability.

**Example checks:** `examples/web-app-components.draft`, `order-pipeline.draft`, `support-lanes.draft`, `login-sequence.draft`, `billing-schema.draft`, plus fresh corpus witnesses from the completed evaluation.

**Validation:** `pnpm check:fast`; `pnpm build`; product browser proof `node scripts/prove-layout-tools.mjs` and file-session proof against temporary fixture copies. Use `scripts/shoot.mjs` for product screenshots. Record any unexecuted browser surface explicitly.

**Risk:** hiding a familiar shortcut can inconvenience existing expert use. Keep keyboard commands and Advanced paths; do not add an onboarding wizard or mandatory explanation step.

## Milestone 3 — Install the measured Compare portfolio and deduplicate alternatives

**Class: Build the current-result card and disclosure; Explore the frozen six-engine pack. Keep existing defaults.** **IDs:** selected `ENG-*`, `UI-COMPARE-ALGORITHMS`, `UI-COMPARE-PRESENTATION`, `UI-COMPARE-CAMERAS`, `UI-COMPARE-ANCHOR`, `ACT-COMPARE-LAYOUTS`, `ACT-COMPARE-APPLY`, `ACT-COMPARE-CANCEL`.

**Code areas:** `src/state/comparison.ts` (`DEFAULT_ALGORITHMS`, `defaultConfig`, `generate`, `applyCandidate`), `src/engines/explorer-engine.js` (`specs`, `candidate`), `src/components/comparison/ComparisonDialog.tsx`, `ComparisonSidebar.tsx`, `ViewportCanvas.tsx`, `src/state/comparison-export.ts`, `src/cli/variants.ts` if CLI uses the same portfolio.

- Use the report's exact frozen methods and presets, not a new tuning pass during integration.
- Show the current drawing plus up to three materially different alternatives. The internal portfolio can contain more than the visible cards; candidate selection may use task/structure, and Advanced can run the rest.
- Do not call oracle coverage selector performance. A pre-layout selector may only use features available before layout.
- Preserve current stale-baseline identity checks, cancellation, completed failure cells, one-step Apply, and shared prior routes.
- Candidate equivalence includes node/group geometry, selected sides and route paths, plus authored structure/constraints. Do not collapse results with different constraint compliance.
- The contact sheet should show hard validity first, then raw route/area/movement differences. “Recommended” must not conceal a tradeoff.

**Acceptance:** on development and heldout replays, the UI generates exactly the recorded candidate settings; source candidate preview equals reopened saved source; equivalent candidates collapse deterministically; failures and timeouts do not disappear; the baseline remains available. A unique niche witness remains reachable through Advanced if it is outside the default cards.

**Risk:** dynamic candidate selection can be a disguised oracle if it first runs every method but the UI claims cheap automatic selection. Log actual compute effort; distinguish pre-layout selection from post-layout candidate ranking.

## Milestone 4 — Adopt only validated automatic presets/selectors

**Class: Explore. The frozen heldout replacement gate failed; do not install a new default.** **IDs:** `LAY-ALGORITHM`, `RTE-CROSSING-PENALTY`, `RTE-BEND-PENALTY`, `RTE-EDGE-GAP`, `RTE-PORT-GAP`, `RTE-PARALLEL-PENALTY`, `RTE-SHARED-PENALTY`, `RTE-FANOUT-PENALTY`, `RTE-PASSES`, `RTE-STANDOFF`, `RTE-PORT-STABILITY`.

**Code areas:** a small pure policy module alongside `src/model/` or `src/cli/variants.ts`; compiler-independent graph features; `state/layout.ts`; comparison and CLI variant callers; `dsl/layout-edits.ts` for exact source persistence; no external library required.

The policy must separate:

- structure requirements (sequence, lanes, cells, root, pins, explicit sides);
- user request (reading order, format, repair versus rebuild);
- cheap pre-layout graph features (groups/depth, components, undirected proportion, tree-like parent structure, sizes);
- selected engine and exact numeric preset;
- post-layout hard validity and optional candidate ranking.

Do not choose different presets after reading heldout regressions. The contract's test is at least 95% of current-pool acceptable common-job coverage, no lost supported specialist task without escape hatch, and no new hard-defect case where today's policy was valid. Use base/family resampling and the exact count denominator from the report.

**Preset acceptance:** every exposed routing preset has both a favorable and adverse witness. A more expensive setting must demonstrate value beyond practical equivalence. A control whose effect appears only in an interaction must survive deletion screening. Explicit sides are never cleared as part of a generic routing preset.

**Completed routing result:** offer the exact frozen trio—clearance 4, clearance 22, and port gap 28, with all other values at default—through Compare connections. Its union is acceptable on 12/12 feasible common bases in every profile (14 absolute), and 18/18 feasible bases overall (24 absolute). This is an oracle comparison pool on existing positions, not a preselected route or new cold default. Clearance 22 introduces six hard losses relative to 16 valid current-source drawings; port gap 28 introduces a separate hard loss after force layout. Require preview and keep the baseline visible. The three frozen joint combinations attain only 12,11,10,12,12 /12 common acceptable bases, so their pooled 95% must not be reported as a passed every-profile gate. Link `heldout-routing-decision.md` and the exact per-case adverse rows in implementation review.

**Stability acceptance:** same prior route state for alternatives; empty-history control included; no portStability claim from a cold source variation alone. Warm settled and bounded Improve policies must be tested on pins/manual markers/local scope/collapsed groups, not extrapolated from cold results.

**Completed gate result:** retain current first-render and router defaults. Expose the six-engine pack through experimental Compare with a complete Advanced escape. Its heldout common acceptance is 11,12,11,10,10 out of 12 feasible bases across the five profiles; even this oracle misses the threshold. The preferred guarded selector reaches only 5,4,3,3,3. Do not change the threshold, tune on these heldout losses, or present the oracle as automatic selection. Future default work needs a new untouched evaluation split.

## Milestone 5 — Preserve the editing contract across source, warm state and views

**Class: Build.** **IDs:** `AUTH-PIN-X/Y`, `AUTH-MANUAL`, `AUTH-COLLAPSE`, `UI-FIXED-IDS`, `UI-PRIOR-ROUTES`, all `BRUSH-*`, `ACT-TIMELINE*`, `ACT-BRUSH*`, `ACT-REFLOW-GROUP`, `ACT-CLEAR-MANUAL`.

**Code areas:** `src/state/sculpt.ts`, `src/engines/sculpt-engine.js`, `src/components/sculpt/{BrushDock,TimelineDeck}.tsx`, `src/dsl/translate.ts`, `src/dsl/layout-edits.ts`, `src/state/file-session.ts`, `src/state/scene.ts`, `src/model/routes.ts`.

The warm suite executed in this assignment passes 54 assertions on actual engines. Keep that coverage, and add only missing end-to-end behavior:

1. Pin a descendant; both a parent move and a local pass keep its required world position in the raw editor operation.
2. In source mode, preserve the documented parent-local pin semantics after compilation. Do not compare unlike coordinate contracts.
3. Apply a bounded selection pass, write arrangements, save, reopen; distant anchored regions stay within the declared movement tolerance.
4. Run warm routing with the same previous sides before a small edit; selecting an object or changing its color must not churn routes.
5. Collapse/expand uses visible proxies without losing model objects or changing semantic edges. Test the header position and line count against the visible graph.
6. Timeline scrub/hover is preview only; Keep writes one arrangement; restored/held nodes do not become exported pins unless explicitly pinned.
7. Brush outside-radius nodes stay bit-identical; frame sizes stay fixed; repeated dabs do not introduce collision defects; Undo restores holds with the stroke.
8. Source mode never offers unsupported hand-drawn bends, label offsets, start/end intent, or scratch checkpoints as though they were saveable.

**Checks/examples:** `tests/engine-sculpt.mjs`, `tests/engine-layout.mjs`, `tests/translate.test.ts`, `tests/file-session.test.ts`, `tests/stale-stays.test.ts`, `tests/refinement-drift.test.ts`, `tests/growth-order.test.ts`, and the 24-base assigned edit sequences in the evaluation corpus. Browser proof must exercise real drag/save/undo; passing a geometry API test alone is insufficient.

**Risk:** extra source anchors make diffs larger. Preserve the existing minimal changed-object writeback and explicit Reflow semantics instead of introducing opaque snapshot provenance or a new arrangement format.

## Milestone 6 — Remove only demonstrated dead public choices; defer engine deletion

**Classes:** Build for a proven ineffective public-path choice; Defer for uncertain implementation removal; Avoid for semantic loss.

Potentially shippable removals are narrow:

- Remove Release fixed port sides only from the ineffective file routing-comparison source path. The exact-function probe passes 12 assertions, proving identical emitted source for false/true while its raw Explorer positive control releases authored sides. Retain that raw capability and the existing explicit side-edit command. Replay `evaluation/probe-file-auto-ports.mjs`; it makes exactly two ancillary router calls and zero source/layout calls.
- Hide source Compare maximum effort and start/end intent until the path actually consumes them.
- Hide the cold stable/crossings distinction after direct equality witnesses, while keeping warm ordering.
- Remove duplicate algorithm aliases from the basic Diagram type picker; the source engine names and Advanced controls can remain.

These are presentation corrections, not deletion of router, warm ordering, intent, or engine code. Every other proposed deletion needs the leave-one-out fixed-default and retuned-replacement evidence, a meaningful loss statement, and a specialist escape hatch. Retaining a cheap non-default local method is acceptable when its benefit is narrow but genuine.

**Measured retention witness:** `C-repair-containers-01-compound-flow` has a traceable score of 12.5 versus 16.5 for the best remaining native warm pass, and is the only acceptable result for that job under the frozen score/area/path bands with retained current also available. This is why a cold-engine portfolio can omit compound-flow from its front page while the implementation must remain. Boundary-align and force also have unique warm practical witnesses. Conversely, zero unique jobs in this 12-base warm stratum is insufficient evidence to delete a method from all editing paths.

### Explicit avoid list

| Recommendation | Class | Reason |
|---|---|---|
| Replace sequence/lanes/cells with the “best” general graph engine | Avoid | Removes authored temporal, ownership, or field structure |
| Treat separate as a source rebuild algorithm | Avoid | It depends on existing coordinates and is intentionally excluded from ENGINES |
| Delete port stability because empty-history sweeps tie | Avoid | External history affects the first pass; repair passes also reuse current route sides, so the coefficient can act without external history |
| Delete corner radius because route metrics tie | Avoid | Its consumer is rounded rendering |
| Force directions onto undirected relationships to make scores comparable | Avoid | Changes the user job and the edge semantics |
| Delete an engine solely because its mean rank is poor | Avoid | Niche family wins and failure tails matter |
| Add new compatibility shims or versioned engine syntax pre-emptively | Avoid | No concrete migration need was established; retain current syntax while UI changes |
| Persist a cold solver's iteration number as a replayable timeline | Avoid | A warm recorded result is an arrangement, not a stable recipe |
| Reuse historical heldout examples as fresh test evidence | Avoid | They already informed product development |
| Tune a policy after seeing heldout and still report the old gate | Avoid | Invalidates the experiment contract |

## Documentation and deliverable integration

Update the actual baseline documentation, not the stale proposal text in the implemented layout-in-files plan:

- `docs/DSL.md`: distinguish recipe flow / engine flow / bounded Improve; list which settings apply in cold/warm paths; document Format/fit behavior, explicit ports, and source-only specialist values.
- `skills/draftably/SKILL.md`: update if parser words or DSL behavior changes; keep first-render guidance consistent with the measured portfolio.
- `docs/CHECKS.md`: exact small regression set, optional full benchmark/resume command, screenshot command, environment limits.
- `docs/intent/diagram-quality/NEXT.md`: ranked measured defects and false metric alarms; distinguish evaluation findings from proposed future improvements.
- Product tooltips: describe cost tradeoffs and current scope. Avoid exposing a research-family label as a promise of ELK, Graphviz, CoSE, or Buchheim behavior.

## Release acceptance summary

1. Fast checks, engine regressions, and a production build pass on the integration checkout.
2. Source round-trip and real browser proof pass for layout, routing, local arrangement, Undo, and reopen.
3. The frozen policy reproduces the reported failed replacement gate. Current first-render and router defaults remain current; the six-engine pack is experimental and all 11 internal methods remain available.
4. The full inventory has an exact Keep/Merge/Automate/Hide/Remove disposition, a replacement/loss statement, and a measured or explicitly source-only witness. No missing evidence is converted to a numerical gain.
5. Main UI counts meet the specified surface contract, without counting aliases as independent removed capabilities.
6. A retained niche method and every disputed removal have a runnable favorable and adverse fixture.
7. Saved source is still readable and deterministic. No commit, migration, deployment, or compatibility layer is implied by this research handoff.

## Open decisions requiring explicit integration judgment

- The default decision is settled: retain current source and routing behavior. Integration judgment remains only on the presentation of the experimental six-engine Compare pack and the materially distinct three-card limit.
- Which named presets from the frozen routing pool deserve user-facing labels; a preset without a positive witness should remain an internal experiment.
- Keep Improve as the present selected-engine bounded action for the first release. Evaluate a fixed repair dispatch separately: heldout applicable ordinary jobs are 27/37 valid for tidy/group-aware and 29/37 for Separate, with routing failures and a different constraint/reference contract from cold source. These results support an optional Separate repair, not an automatic universal substitute.
- Whether to implement source-mode release ports / layout intent / effort, or simply keep those unavailable. The smallest useful change is truthful hiding.
- Whether Format must preserve an explicit direction or retain the compiler's current direction-searching fit behavior. Make this visible before changing semantics.
- Whether to add native recipe pickers for sequence/lanes/cells. Their source escape hatches already preserve capability; a full wizard is not required for this portfolio simplification.
