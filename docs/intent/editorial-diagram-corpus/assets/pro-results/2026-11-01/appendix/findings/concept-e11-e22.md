# Concept and computing corpus findings: E11–E22

## Completion and interpretation

Twelve accepted references from ten independent publishers/authors have real original image files, readable previews, source attribution, immutable first rendered sources, three retained native attempts, actual SVG/PNG output, validation/command logs, full comparison sheets, per-case audit and review records. All 36 retained stages completed the unchanged baseline check, JSON/metrics inspection, SVG and supplied-script PNG commands with exit 0. Warnings remain evidence, not a claim of publication quality. Six cases used a third and final corrective refinement; their cycle-2 sources, renders and validations are retained. No baseline application file was changed.

The strongest defaults in this subset are the React tree (E16), Go slice cells (E17) and five-stage pixel pipeline (E19). Their first-render readability is comparable to the reference. Nine others are worse at the reference’s intended reading task. These are judgments for deliberately demanding selected examples, not a random sample or a market/engine benchmark. Final v2 communication ratings are eight 4/5 and four 3/5. No result is called pixel perfect or rated 5. Native success is narrower than syntax or process success: E21 has successful checks but an ambiguous return pointer, while E20’s readable graph still lacks the mountain’s explanatory metaphor.

The illustration boundary is material. E14/E22 comics lose characters, speech tails and inline phrase emphasis; E20 loses terrain and buildings; E12 collapses faded neighboring cell interiors. The study keeps their original standards visible. It does not redefine successful recreation as merely extracting a box graph.

E16 and E20 are reserved confirmation cases. They were audited, but no numerical tuning values have been chosen from them. In fact this immutable study proposes no tuned engine values at all.

## Observed author effort

The measured source counts are in `effort-concept.csv` and each case’s `v*.effort.json`. Definitions are repeated in the case audits. Authoring time was not measured. Command elapsed durations are measured and logged; they are not authoring time. Label-edit resilience is an explicitly predicted assessment, not a run experiment.

The final LSTM uses pins/sizes for almost every object; the MDN cluster uses 34 pins and 31 sizes across 136 non-comment lines; the DNS comic requires 23 pins and 21 sizes across 98 lines. These counts matter more than whether the final render looks superficially polished. A future label or object-count change can invalidate much of the manual composition.

Conversely, the Go slice needs only two group pins and eight sizes, the pixel pipeline needs five sizes and no pins, and v1 Git history achieves a good reading path with soft `near`/`order` constraints. Those are native patterns to preserve. All coordinate costs remain visible in source; there are no hidden overlays or image tracing.

## Provisional gap register

These IDs are local to this fragment and should be mapped to the combined stable gap IDs. A finding is called common here only with at least three accepted cases and two independent publishers. This is a frequency threshold, not a statistical claim about all editorial diagrams.

### C-G01 — Native typography and external-label control

**Category:** missing native control/serialization and limited font availability, partly deliberate style. **Severity:** medium, occasionally high for mathematical or dense editorial labels. **Frequency:** common; E11, E12, E13, E14, E15, E16, E17, E19, E20, E21 and E22, across many independent authors. Strongest non-confirmation proofs: E12’s math/subscripts, E13’s distinct annotation voice, E15’s code/body hierarchy and E17’s external record captions.

**Visible evidence:** source uses substantially different type scale/weight/placement within one figure; native attempts mostly use a single title profile plus annotation profile. E11 uppercase stage labels fit visually but trigger requested-height padding warnings. E16 long module identifier wraps in v0 and requires a manual width. E15’s original SVG font substitution is separately an environment issue and must not be counted as a native rendering defect.

**Code evidence:** `src/model/fonts.ts` `FONT_ROLES`, `FACES`, `typeProfile`, `measureText` and `wrapLines` define bundled deterministic type roles. `src/model/appearance.ts` `AppearanceOverrides` exposes diagram-wide role choices, padding, radius and colors but no per-object font size or weight. `src/model/labels.ts` `nodeLabel` already reads model-level label mode, dx/dy, width and leader. `src/model/types.ts` `LabelLayout` stores them. The baseline native syntax does not expose these fields (verified with the parent agent’s full syntax read). Therefore external/detached node labels are a **native serialization gap**, not proof that the renderer cannot place labels outside nodes. Group/cells captions have their own header treatment and need separate consideration.

**Current workaround and cost:** text nodes, extra notes, fixed widths/heights, verbal time subscripts and additional pins. E17 stays cheap; E12/E15 pay for almost every object. Font import or replacing the renderer was not attempted.

**Recommendation — Build:** expose constrained type hierarchy and existing label-placement capabilities in native source before adding many fonts. Preserve deterministic measurement, embedded fonts and existing title wrapping. **Proposed proof:** round-trip a detached label and small annotation profile through format/compile/export; show E13 notes and E17 captions legible at reference display scale without extra pseudo-nodes or manual title-width inflation. Use E16 and E20 only as held-out visual confirmation. Relevant tests include `tests/title-wrap.test.ts`, `tests/theme-slots.test.ts`, `tests/themes.test.ts`, `tests/heading.test.ts` and `tests/edge-labels.test.ts`. **Main risk:** new per-object type controls can desynchronize layout measurement and final SVG, so metrics and render paths must share the same profile.

### C-G02 — Editorial route geometry, shared branches and native route editing

**Category:** missing native exposure of model fields plus route-default/expressiveness limits. **Severity:** medium to high. **Frequency:** common; E11 fanout, E12 conveyor, E15 object references, E16 tree trunks, E17 interior array pointer, E18 chronology branch, E20 trails and E21 record pointers span independent sources and patterns.

**Visible evidence:** orthogonal turns replace deliberate diagonals, shared origins and curved paths. E11 requires 32 endpoint-side attributes after manual positioning, yet has white crossing marks at the fanout origin. E17’s precise cell target is a win, but its pointer must travel under the array. E18 remains clear despite the elbow and needs no high-priority special case. E16 has six repeated labels and separate branches where the reference uses common trunks. E15’s shared-memory route still detours around the queue.

**Code evidence:** `src/model/types.ts` `EdgeLayout` includes `waypoints`, `labelDx`, `labelDy`, `fromSide` and `toSide`. The native `edge` declaration exposes side choices, while `docs/DSL.md` explicitly says a file cannot store one line’s bends. `src/model/labels.ts` `edgeLabelLines` returns one line for ordinary edges and wraps sequence message labels to `MESSAGE_WRAP`; line wrapping behavior is intentional and tested. Existing model support is not the same as authored native-file support. Shared trunks/buses need actual semantic/route design beyond simply serializing a point array.

**Current workaround and cost:** `from=`/`to=`, broad position changes, fixed sizes, constraint=false and accepting orthogonal routes. No original was imported into a node. Native pseudo-junction nodes would change or clutter semantics, so they were not used to fake a bus.

**Recommendation — Build** native round-trippable route/label controls and reliable endpoint normals; **Explore** semantic shared trunks/buses after that. **Proposed proof:** E11 keeps the fanout in the middle corridor without crossings or 32 repeated endpoint hints; E17 preserves exact third-cell targeting with an intentional route; E21 enters the requested side from outside. E16’s held-out tree must remain a readable hierarchy with shared or intentionally separate branches. Likely files: `src/dsl/syntax.ts`, `src/dsl/compile.ts`, native document editing/projection modules, `src/model/types.ts`, `src/model/routes.ts`, `src/model/labels.ts`, and `src/cli/svg.ts`. Relevant existing test surfaces: `tests/routing-ports.test.ts`, `tests/cells.test.ts`, `tests/edge-labels.test.ts`, `tests/layout-edits.test.ts`. **Main risk:** route persistence may make later label/object edits brittle unless a clear manual-vs-automatic policy is maintained.

### C-G03 — Annotation anchors, leaders and quiet placement

**Category:** note primitive gap and native label-exposure gap, not a lack of all renderer leaders. **Severity:** medium. **Frequency:** common in a broad annotation family: E13 callouts, E17 external record labels, E20 terrain labels, E21 slot annotations; at least three independent publishers. E20 is held out, so use the others for authoring/proof design.

**Visible evidence:** E13 replaces curved purple callouts with rectangular note cards; one note initially overlapped the UI relation. E21’s a/f annotations move to a remote stack note. E17 record labels become title bands above the records. These annotations remain readable but explain physical targets less directly.

**Code evidence:** `src/model/note.ts` `Note` has only text/near/side/width. `placeNotes` runs after layout, searches nine candidate positions on the requested side, never reserves graph space, and marks overlaps when none fits. `noteMarkup` draws a panel and left bar, no note leader. Separately, `labels.ts` `nodeLabel` supports model-level detached leaders. The distinction matters: a proposal may expose existing label controls, but native notes need a deliberate leader/anchor design if they are to behave like callouts.

**Current workaround and cost:** change note side/width, move subjects, or add text nodes and edges. E13’s side change fixed an actual overlap; that is a supported control success. Extra text nodes were avoided when they would be mistaken for domain entities.

**Recommendation — Build** native annotation placement/anchor controls with optional leaders; preserve clean panel notes as the default. **Proposed proof:** E13’s five callouts remain collision-free and clearly target their subjects after a longer label; E21 slot annotation remains adjacent to the correct stack cell without moving the memory diagram. Add round-trip and visual tests to `tests/notes.test.ts`, `tests/heading.test.ts`, `tests/cells.test.ts`. Likely files: `note.ts`, `labels.ts`, `types.ts`, `syntax.ts`, `compile.ts`, frame/bounds calculations and SVG. **Main risk:** leader lines could become confused with domain edges, so they need restrained distinct treatment and must contribute to collision/bounds checks.

### C-G04 — Cells-container endpoints and side-normal behavior

**Category:** routing/default defect or awkward endpoint semantics. **Severity:** high for a memory explanation; local stress finding, **not yet common by this fragment’s threshold**. **Frequency:** E21 and E22, two independent publishers; E17 provides an exterior-cell success rather than evidence of the same defect.

**Visible evidence:** E21 cycle-2 `array_upvalue` crossed `location`; its return pointer crossed `idx0` and the Stack title. E22 cycle-2 record association edges crossed the table fields. Both preserve these actual warnings and images. Adding `from`/`to` removed the field-through warnings without changing target identity, but E21 still has the Stack-header crossing.

Final E21 geometry is particularly precise evidence. `f_closure from=bottom to=left` yields `(105,487) → (0,487) → (0,170.5)`, running along record boundaries rather than departing outward normal to the chosen side. `upvalue_stack from=bottom to=bottom` yields `(700,287) → (35,287) → (35,487)`: it reaches a bottom endpoint from above, through the stack header/field. Side selection is not an adequate complete workaround here.

**Code evidence:** parent source review of `src/model/routes.ts` found `cellEnds()` applies to cells and skips explicit selected ports, while `routeInput()` creates frame-sized stubs for group targets. The source has separate intentional interior-cell crossing support; do not confuse that documented behavior with an avoidable traversal of a target container. `src/dsl/cells.ts` `layoutCells` adds a title band and makes cell dimensions/title widths interdependent.

**Recommendation — Build** a focused endpoint-side regression fix before changing global route penalties. **Proposed proof:** replay the retained E21 cycle-2 and final source, require outward first/last segment normals and no traversal of unrelated cells/title bands while preserving group targets, and maintain E17’s correct third-cell target. Add cases to `tests/routing-ports.test.ts` and `tests/cells.test.ts`. **Main risk:** group borders and addressed interior cells have different legitimate crossing rules; fixing one must not suppress the other.

### C-G05 — Manual composition cost and edit resilience

**Category:** awkward controls/missing guidance, sometimes layout defaults; not a demand that automatic layout duplicate arbitrary art. **Severity:** medium. **Frequency:** common; E11/E12/E13/E14/E15/E18/E21/E22 across many authors.

**Visible evidence:** faithful reading paths often require a coordinate table larger than the semantic model. MDN jumps from 59 to 136 lines; DNS comic from 23 to 98. Even the small Git history needs order disconnected from pointer direction. v1 recipes and soft constraints often help, but exact rectangular panel composition remains manual.

**Recommendation — Explore** a small set of declarative arrangements and reusable named type/spacing styles, with stronger guidance for order vs direction and independent reference edges. **Proposed proof:** write the E15 agent bands and E22 panel rows using materially fewer pins while keeping all fields/records, then make one content edit and confirm stable grouping without overlap. Use soft constraints rather than automatic global weight tuning. **Likely files:** DSL structural/layout recipes, compiler and document editing helpers, `docs/DSL.md`, examples, `tests/layout-edits.test.ts`, `tests/layout-fit.test.ts`. **Main risk:** special-purpose syntax bloat. The measured costs justify investigation; they do not yet prove a particular new language feature is the right fix.

## Stress and boundary list

| ID | Evidence | Recommendation and reason |
|---|---|---|
| C-S01 | E14/E22 hand-drawn comics, E20 terrain, E12 faded context, E13 cylinder/chrome | **Defer** freeform illustration. Exposing existing model icon/image capabilities natively may be useful, but recreating arbitrary art is a separate product scope. Do not turn references into background images. |
| C-S02 | E19 joined chevron pipeline | **Defer** pending recurrence elsewhere. One small case supports a focused shape idea, not a general shape-editor priority. |
| C-S03 | E16 v1 undirected relations collapse the directed import hierarchy into a row | **Explore** the separation between layout-directed relationships and visible arrowheads. The existing undirected behavior is documented, so the choice is an authoring tradeoff, not a defect claim. This is a single held-out confirmation case; retain it as a future test, do not choose tuning values from it. |
| Authoring residual | E12 “x + previous h” shorthand | **Avoid** counting an author’s ambiguous mathematical label as a tool defect. A later clean authoring pass should say input concatenation explicitly, but this run ended at the three-cycle budget. |
| Conservative warning | E11 twelve fixed-size text-overflow diagnostics despite visible short words | **Explore** diagnostic explanation/measurement before treating it as a rendering defect. The current evidence shows a padding mismatch, not clipped glyphs. |

## Strong defaults to preserve

- Cells preserve order, shared borders and exact semantic targets compactly: E17 works before manual styling.
- Tree layout produces a useful first hierarchy for E16; avoid sacrificing this to stylistic branch changes.
- Sequence messages and phase bands in E22 keep temporal order and complete message text; v1 is often the preferable maintainable technical version.
- Bundled fonts and shared measurement make native render output reproducible. Do not trade determinism for uncontrolled web font loading.
- Meaningful high-contrast presets and native custom swatches make E18/E19 clear without recreating gradients or low-contrast source choices.
- Validation flags real pin collisions and note overlap; keeping logs exposed those authoring mistakes before the final stage.

## Evidence housekeeping

The E14/E22 reserved `root` name errors occurred before any successful v0 render. Name-only preflight repairs are recorded and are not counted as refinement wins. All final v0 SHA-256 values match the successful freeze records. E11’s first v2 custom group color omitted shade 100; E12/E15’s first pinned v2 sources overlapped computed group extents. These are authoring mistakes, corrected within the last allowed cycle and never presented as renderer bugs.

Raw downloaded full article HTML caches were moved to `research/concept-page-cache/` outside the deliverable. The requested real reference images, licenses, metadata, candidate/rejection log and source URLs remain. The MDN reference SVG is unchanged; only its raster preview viewport was corrected to the original viewBox aspect, with both versions and logs retained. Publication of third-party images is not authorized by their inclusion in this private study; observed licenses/unknowns are recorded per item.

Access dates were normalized to 2026-11-02 UTC. Initial generator scripts are archival provenance, not rerun instructions. Use the shared `scripts/run-trials.py` for local validation; do not rerun the historical authoring scripts over frozen sources. No remaining local execution is required for these twelve retained trials. Future baseline fixes, additional visual iterations beyond the agreed budget, and exact reference-font matching remain Codex work, clearly distinct from work claimed complete here.
