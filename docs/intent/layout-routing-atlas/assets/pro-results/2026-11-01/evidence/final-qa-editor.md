# Final editor/CLI audit QA

Baseline: `af70d8317797d5a522acffdd604819376a3ec893`. This review covers the merged preliminary `coverage.csv`, `visual-atlas.md` and the editor/CLI portions of `page-drafts.md`, plus the exact model/serializer code used by the probes. It does not claim a native editor browser session. All baseline source remained unchanged.

## Decision

The editor/CLI coverage is complete as a **surface inventory**, with 90 records, 36 visual recipe groups and four justified nonvisual groups. The machine manifest now resolves all 90 records to existing source companions and exact actions. One canonical duplicate should be reconciled before reporting a count of independent controls: E010, Match canvas, is already a state of L030 aspect. Preserve E010 as a traceable alias, append V-E06 and its context/persistence to L030, and describe 194 canonical records if the other merged inventory still contains 195 surface records. Do not call either count “195 settings”: the inventory includes controls, operations, derived explanations and output contracts.

The current Markdown/live-example system remains the right foundation. The new evidence strengthens the case for a small shared-scale comparison layer and explicit source/native context labels. It provides no reason to replace the framework or add an algorithm dependency.

## Required assembly corrections

These are changes to the deliverable assembly, not source-code edits made during the review.

1. Reassemble the latest `editor-page-drafts.md`, `editor-inventory.json` and `editor-visual-recipes.md`. The preliminary merged files predated the final exact companion paths, default-context details and added sections listed below.
2. Use `editor-visual-manifest.json`, rather than guessing a fixture from the first filename found in a paragraph. It has 40 groups; all source paths exist and every E row resolves. In particular V-E10 uses `editor-refined-groups.draft`, V-E11 uses `editor-align-start.draft`, V-E31 uses refined groups plus `editor-change-marks.draft`, and V-E36 uses `editor-refinement-drift.draft` plus the cleaned source. The preliminary atlas incorrectly displayed the generic pass fixture in several of those groups.
3. Deduplicate the rendered status text. The preliminary V-E17/V-E23/V-E28 sections repeated “native model mechanism executed and SVG rendered” once per asset. One status sentence plus the asset list is sufficient.
4. Mark V-E31–V-E36 as CLI recipes. Their previous generic “editor action recipe / UI unexecuted” context is misleading. The source/CLI checks that ran and the PNG-export blocker are distinct statuses.
5. Populate editor source metrics from `editor-validation/cli-validation.json` (`results[].metrics`). The preliminary atlas displayed “—×—” despite actual measurements being available. Native model metrics come from `model-render-results.json`; do not silently mix their report with check’s additional quality-note warning count.
6. Keep model execution and editor UI proof separate. V-E17’s tidy cold/warm/pass, V-E23’s recorded frames, and V-E28’s five dabs are executed. Effort sweeps, boundary-align comparison, timeline controls, brush cursor/undo/cancel, storage and all other UI actions remain specified but unexecuted.
7. Rebase the machine manifest’s `work/` paths to package `examples/`, `renders/` and `evidence/`, including supporting source, native JSON, geometry, timeline archive and diagnostic probe links. The supplied ten-engine evidence reference must point to the copied evidence manifest, not a baseline checkout outside the package.
8. Include the four adjacent `.mjs` files in `portable-scripts` together; they use `editor-runtime.mjs`. `render-editor-model.mjs` compiles its own source baseline and does not require a previously generated JSON file.

## Overclaims and missing explanations corrected in the working drafts

**Pin scope.** The former sentence “Pins always stay fixed during automatic layout” was too broad. The revised page says editor passes/native engine runs hold pins and their ancestors fixed, while a file pin is a local parent-content coordinate applied after cold layout. Moving its parent can change the child’s world position. This aligns the editor chapter with the layout audit rather than contradicting it. Source: `layout-engine.js` fixed-node handling; `compile.ts` refinement application; `project.ts` pinned projection.

**Preset names and Separate.** The reader draft now maps Flow→compound-flow, Nested architecture→boundary-align, Compact grid→grid; Custom approach is derived display state. Separate is explained as a local overlap repair, not an eleventh file engine or a globally minimum displacement solver. Changing a preference does not run a layout.

**Drawing intent.** Added a full reader section covering all nine Start regions and eight End regions, clearing/reassigning a role, the distinct one-node-per-role rule, native persistence, and file limits. The Inspector retains an existing role’s placement when reassigning its node. Compare’s “Use clicked shape as start/end” resets that role to its corner default and requires Generate; its initial configuration copies document intent. E029/E030 now record those context-specific defaults. Source: `model/edits.ts:setIntent,INTENT_LABELS,intentPlacements`; `state/comparison.ts:defaultConfig,setComparisonIntent`; `ComparisonSidebar.tsx:IntentControls`.

**Container controls.** Added Follow diagram / Left to right / Top to bottom, padding12–80/default24, native Fit contents, and source serialization limits. The growth recipe now increases the required gap within the current fitted frame; it does not tell a user to shrink a frame across children, which `resizedRect` disallows. File projection sets native container direction to inherit even when source geometry came from a different group recipe; exporting native JSON is a projection boundary, not a persistent per-scope source recipe conversion.

**Compare equality language.** The earlier Compare paragraph referred to a `same as` result without saying this is a CLI vary tag. It now says “identical-looking candidates”; the explicit `same as` explanation remains in the CLI section where the label exists. No claim was found that Compare itself computes that coarse deduplication tag.

**CLI completeness.** The page now lists all 28 `--try` keys explicitly, not just “the registry.” It distinguishes `--try root` rejection, explicit standoff values, canonical domains, and ineffective context. The run sheet uses actual package companions via one `atlas_dir` variable, including a real frozen routing source. It explains `--out`, `--json`, `--no-source`, and that JSON stdout still requires the command’s PNG export. `--from` must read the prior manifest from the same output folder before replacing it. `--from best` is accepted by the baseline shared `savedVariant` lookup even though help illustrates an ID; that accepted value is recorded.

**Timeline details.** Added the bookmark jump action; all ghost states, playback, cancellation, selected-versus-hovered frame, keep/edit versus keep/brush, reopen compatibility and archive export were already represented. Timeline scope is the current scope, not always the whole diagram. Model frames are actual checkpoints rather than percentage-optimal labels.

## Runtime findings and exact evidence

The following use actual pinned modules loaded through Vite SSR. No approximate replacement layout or router was used. `probe-results.json` and `persistence-results.json` preserve inputs, effective source, outputs and hashes.

| Claim | Executed result | Evidence |
|---|---|---|
| Continuous ranks does not round-trip | UI `fold=never` serializes omission. Twelve-node chain’s object bounds change2540×56→812×336, identical to explicit auto. Projected setting after omission still says never. | `probe-results.json#/probes/fold`; three actual fold SVGs and source files |
| Offered source Compare axes can be ignored | Layered respectDirection, respectManual, growContainers and flowStrength endpoint pairs produced byte-equal source and equal canonical geometry. Numeric default aspect1.6 versus canvas also serialized identically. | `probe-results.json#/probes/sourceIgnoredAxes` |
| Invalid numeric caption can conceal clamping | `edgeGap=1` parses; native candidate rejects; source branch writes edge-gap4 yet retains spec/title1. Actual source worker returns effective4 and report null. | `probe-results.json#/probes/sourceClamp` |
| Release fixed sides differs by mode | Native candidate turns right/left into auto/auto. The actual source task retains right/left. | `probe-results.json#/probes/releasePorts` |
| File container controls do not save | Actual translator writes unchanged source for direction and padding; reprojection returns inherit/padding24. | `persistence-results.json#/changes` |
| Snap and badge preferences differ from container fields | Translator writes unchanged source, but projection with file-session viewState retains the false setting during the session. A browser toast/fresh-session claim remains unverified. | `persistence-results.json#/changes` |
| A bounded pass saves an arrangement | Actual tidy pass writes stays for seven moved IDs. Recompilation differs by at most0.489 coordinate units due to integer placement; this is measured, not assumed byte identity. | `persistence-results.json#/pass`; before JSON and kept-source SVG |
| Scoped rebuild deletes the intended soft source | West rebuild removes two soft refinements, retaining pin w3 and east’s layout line. | `persistence-results.json#/scopedRebuild` |
| Coarse vary equality is not rendered equality | Actual vary implementation returns same-as-v0 for radius0,6,16; the geometry keys match but there are three distinct SVG outputs. | `probe-results.json#/probes/radiusVary`; radius-v0..v3 SVG/source |
| Right omission has distinct metadata | The tested explicit-right/auto pair has equal rectangles and equal route points, but edge flow metadata differs. This fixture does not prove a visible routing difference. | `probe-results.json#/probes/direction` |

The actual unmodified CLI command `vary ... --try corner-radius=0,6,16 --out ...` was attempted. It measured all three candidates, then exited1 because Chrome/Chromium was unavailable for mandatory PNG export. No completed variants.json/contact-sheet export is claimed. The direct module proof is reported separately. The CLI attempt’s stderr is preserved.

## Genuine model visuals

`model-render-results.json` contains 13 SVG/JSON pairs, corresponding canonical geometry, options and common world rectangles. They use `LayoutLab.compute`, `SculptLab.journey`, `SculptLab.dab` and `src/cli/svg.ts:renderSvg` directly. Static export routing starts with no UI route-cache history.

| Same tidy baseline | SVG size | Iterations | Termination | Maximum movement |
|---|---:|---:|---|---:|
| Cold rebuild | 1312×263 | 81 | objective plateau | 462.77 |
| Warm settle | 1300×500 | 86 | objective plateau | 76.59 |
| Bounded pass | 1353×514 | 32 | bounded pass | 48 |

The warm timeline records13 frames. Its selected source-derived views are frame0,6,12, with full archive JSON supplied. Do not imply frame6 is “half optimized.”

All five brush dabs start from the same exact JSON: source-projected geometry, restore reference captured before setting browse to X560/Y320, camera scale1, point642/348, radius190, strength35, softness75, step18. Tidy, flow and space each move browse and island by at most6.3, with distinct geometry. Restore moves browse at most6.3 toward its reference. Protect has identical geometry and produces browse/island as hold-eligible IDs. The state adapter’s hold IDs are recorded separately because holds are not diagram JSON fields. This is a useful honest no-motion public choice.

## Inventory count reconciliation and exclusions

`editor-canonical-reconciliation.json` provides the exact merge and retained distinctions. The 90 records comprise73 Editor records and17 CLI records. Of those,81 map to a visual mechanism and9 to four justified nonvisual groups. These counts refer to rows, not the many categorical states and sweep samples.

Merge E010 into L030 only if publishing canonical control counts. Preserve these distinct public controls:

- E003 Layout lab scope and E037 Compare scope: different offered values/defaults, with Compare capturing selection at open. Both differ from source recipe scope and CLI scope.
- E035 Columns and E036 Rows: the first is required; the second supports none, different-parameter validation and cell-count interactions.
- E011 immediate pass, E012 pass preview and E013 rebuild: different lifecycle and source persistence.
- E006 pass iterations and E038 settled solver effort: different ranges, run modes and source-branch applicability.
- E078 CLI fit, L030 engine aspect and DSL fit: different stages and meanings.

Exclude undocumented old engine aliases radial→tree/compact→layered from the public engine count; document them only as accepted legacy normalization. Internal trace/settle/warmStart/rebuild flags are represented through public operations, not counted again. Fixed IDs, viewport and selection arrays are execution inputs behind holds/scope/canvas. Brush step18 and animation180ms/reduced-motion branches have no independent UI preference. Keep automatic behavior/provenance notes without inventing public sliders. General theme/file/search/clipboard and output pixel-density options remain outside this focused mission.

## Checks actually run

- Nine positive editor `.draft` companions plus the one standalone editor-page `draft` fence each ran the actual built pinned CLI `check --metrics`, `inspect --json --metrics`, and `inspect --svg`:30 commands, zero errors/nonzero exits. Five inputs have expected diagnostics including crossings/aspect quality notes and the deliberate relaxed-refinement example. They are not called warning-free.
- The drift fixture additionally ran check/inspect hints and `format --drop-stale` without writing the input. It reports near c relaxed44px and stay b32px; the cleaned companion removes those two source lines. Its remaining aspect quality note is separately recorded.
- Thirty-six actual SVG assets parse as XML. The portfolio includes baseline sources, defect probes and13 model renders; repeated radius/current samples are intentionally retained.
- Three portable scripts smoke-ran using explicit repo/output/examples paths. All13 native-model canonical geometry hashes match the original runs. No fixed `/workspace` path remains in the portable `.mjs` files.
- No full repository suite, local native editor UI proof or screenshot proof was run by this sub-audit. Root owns published-site observations and repository-wide validation.

## Integration gates that matter

For source defects, test the effective source and recompiled geometry, not only the settings object. The fold regression should start with explicit never on the long chain, save UI never, recompile, and preserve continuous ranks. Source Compare must either execute each offered axis/intent/hold/port setting or visibly disable that state; candidate labels must be built from validated effective values. Reuse `tests/layout-edits.test.ts` and add an exported pure source-candidate seam if necessary rather than building a new test framework.

For atlas completeness, compare canonical registry keys and explicit editor operation IDs against the manifest; every ID must resolve to an example/action or stated nonvisual justification. Validate package paths as well as code fences. Assert frozen node rectangles for routing mechanisms and record no-effect outcomes as valid results, rather than tests that force a visual difference. Editor browser proofs should add only lifecycle/persistence interactions that model execution cannot verify: preview implicit keep/discard, file toast/reprojection, source Undo, Compare Apply staleness, timeline peek versus selected frame, and stroke cancellation/holds.

For rendering, preserve common world scale and fixed-camera comparison, readable active labels, source diffs, effective values and truthful status. Run source/skill drift checks and the existing site proof after integration. Changes to shipped behavior require their own release/changeset milestone; prose can ship earlier with the current limitation stated.
