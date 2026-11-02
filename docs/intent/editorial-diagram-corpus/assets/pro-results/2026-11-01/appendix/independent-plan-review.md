# Independent review of the consolidated gap audit and methodology

**Disposition: the consolidated audit is substantially supported by the immutable baseline and the retained corpus.** The immediate plan should prioritize bounded source persistence, meaningful text/connection controls, and the narrow reproduced contrast and endpoint defects. Larger geometry and repeated-panel proposals remain explorations. No recommendation in this review is an implemented or tested application change.

This review checks `gaps.json` and `methodology.md`, rather than assessing a finished patch. The reviewer also authored E01–E10; this is an independent review of the consolidation and proposed implementation boundaries, not a blinded second evaluation of those ten attempts. Repository paths below refer to the supplied immutable Draftably snapshot. Case paths, source counts, warnings and ratings refer to this archive.

## What was checked and corrected

The review reread the native syntax/persistence guards, label placement, note painting, state-panel semantics, group framing and relevant endpoint-routing paths and tests. It cross-checked the gap incidence against `sources.csv`, recalculated current source hashes against the validation records, and examined the final E11, E21 and E24 PNGs in addition to the previously inspected E01–E10 corpus.

At this review, all **90 current native source hashes** match the corresponding successful validation records, and all **30 v0 hashes** match the frozen hashes. `validation.csv` records all four commands succeeding for each final stage. These checks establish source/run correspondence; they do not imply that every route is satisfactory or that every diagnostic is a true visual defect. The final packaging integrity check remains the sealing step, separate from this analysis review.

Two bounded documentation changes were made:

1. **Methodology:** v1 reserves exact **node sizes**, pins and nudges for v2; it does not exclude every dimensional control. The 19 v1 dimensional lines are all explicit note widths: E03 has 2, E10 has 9, E13 has 5 and E22 has 3. V1 pins, nudges and stays are all zero. V0 has zero manual-size, note-width and styling lines, as well as zero pins, nudges and stays. This reconciles the written protocol with `effort.csv` and the actual source.
2. **G08:** the boundary now explicitly acknowledges native named emphasis states, `inspect --states`, unchanged shared positions, fading of nonfocused objects, and aligned before/after comparison panels. E09's rejected `state=muted` node attribute is an authoring error; it is not evidence that focus or dimming is absent. The proposed repeated-panel work must first assess the existing state/compare paths.

No native attempt, rating, reference, image, baseline application file or numerical default was changed. The two edits and the unchanged 90-source check are recorded in `appendix/proofs/final-review-edits.json`.

## Incidence and the meaning of “common”

The source inventory has 30 cases: 22 computing and eight adjacent. Its 24 displayed publisher names reduce to 22 independent publisher groups under the stated conservative grouping. The table recomputes incidence directly from the cases named in `gaps.json`; overlapping rows are not additive and must not be summed as independent findings.

| Gap | Accepted cases | Independent groups | Development cases / groups, excluding six confirmations | Incidence judgment |
| --- | ---: | ---: | ---: | --- |
| G01 Local text hierarchy | 7 | 6 | 6 / 5 | Common at the category level |
| G02 Anchored labels and captions | 9 | 9 | 6 / 6 | Common; contains both exposure and new behavior |
| G03 Semantic connections and ends | 6 | 5 | 5 / 4 | Common connection-style category; separate subfeatures |
| G04 Quiet retained containment | 8 | 6 | 6 / 5 | Common |
| G05 Native route and edge-label controls | 6 | 6 | 5 / 5 | Common authoring/persistence category |
| G06 Contours, loops and cyclic regions | 5 | 5 | 4 / 4 | Common geometry limitation; multiple distinct primitives |
| G07 Small semantic shape vocabulary | 3 | 2 | 3 / 2 | Threshold met only for the vocabulary category |
| G08 Repeated-panel geometry | 5 | 3 | 5 / 3 | Common authoring burden; existing panel capability must be assessed |
| G09 Dark-note contrast | 2 | 2 | 2 / 2 | Reproduced stress case, below common threshold |
| G10 Metric time | 2 | 2 | 2 / 2 | Temporal stress cases, below common threshold |
| G11 Cell/group endpoint defaults | 2 | 2 | 2 / 2 | Targeted routing stress, below common threshold |
| G12 Fit diagnostics | 2 | 2 | 2 / 2 | Diagnostic stress, below common threshold |

The common threshold is at least three accepted cases and two independent publisher groups. All G01–G08 still meet it after removing confirmations. G09–G12 need no inflated commonness claim to justify a narrow fix or exploration.

Two qualifications are essential. First, G07 does not establish that a cylinder, octagon or chevron is individually common: each specific outline appears in one accepted case. Second, G03 does not make every arrow-end subfeature common. E05 and E07 are the two duplex-connection stress examples; broader semantic line identity has additional independent evidence. Similarly, G06's curves, directed closed contours and annular phase regions should not be collapsed into one supposedly proven “curved edge” solution. These distinctions are already substantially present in the consolidated boundaries and should remain in the main report.

## Source capability boundaries that the implementation plan must preserve

### Existing label placement is real; native save support is missing

`src/model/types.ts:LabelLayout` already contains `mode`, `dx`, `dy`, `width` and `leader`. `src/model/labels.ts:nodeLabel` implements exterior and detached modes and defaults a detached label to a leader; `visualBounds` includes the label footprint. `EdgeLayout` already contains `labelDx`, `labelDy` and `waypoints`, and `src/model/routes.ts:drawRoutes` uses edge-label offsets.

The decisive evidence is `src/dsl/translate.ts:rejectUnsupported`: it explicitly rejects changed connection bends, changed edge-label positions, changed node-label positions, and images/icons because these are not saved to native diagram files. `tests/translate.test.ts` checks unsupported waypoint edits. Thus G02/G05 are partly **native authoring and persistence exposure**, not proof that the whole model or canvas cannot draw leaders or manual bends.

A successful implementation must add syntax, parsing/printing, projection and edit translation together. Merely removing the guard can create an edit that appears accepted and disappears on reopening. Acceptance must cover create, save, reopen, parent movement and export; ordinary sources without new controls should retain their behavior.

### Moving the primary title does not create a second caption

E03 needs Redis/Git object names plus support captions. E10 needs component names plus mechanism captions. Existing primary-label placement cannot produce both by moving one title. `src/model/note.ts:Note` supports `text`, `near`, `side` and `width`; it has no independent leader or exact offset. `placeNotes` searches nine nearby positions after graph layout. Existing note behavior deliberately preserves the graph arrangement, as documented and tested in `tests/notes.test.ts`.

G02 should therefore have separate acceptance gates for existing-label persistence and new additive captions with optional reserved space. Preserve the layout-neutral behavior of old notes. A new room-reserving caption must be explicit, because making every note enlarge or move its subject would change existing diagrams.

### Native shapes and asset persistence are different work

`src/dsl/syntax.ts:DslShape` excludes `icon` and `image` from the wider `ShapeKind`; `DSL_SHAPES` lists box, pill, circle, diamond, text and marker. The model has icon/image kinds, but the native translator rejects their persistence. This supports the precise G07 boundary and contradicts a broad claim that the application cannot render images or icons.

A new geometric shape must update label room, port contact, bounds, canvas rendering and CLI outlines, including `src/model/labels.ts:titleArea`, `src/model/routes.ts:portPoint`, `src/cli/svg.ts:outline` and `src/components/scene/NodeView.tsx:ShapeOutline`. Exposing a small asset is a separate persistence/export problem. Importing an entire reference as one image does not recreate its native structure.

### Semantic paint is distinct from routing

`src/dsl/syntax.ts` permits edge kind, endpoint sides, prior labels, constraint and directedness; `src/model/types.ts:DiagramEdge` has status/emphasis and a single directed Boolean. `src/cli/svg.ts:sceneMarkup` applies one end marker when directed. Native `directed=false` removes that head; it does not produce two heads. Status and emphasis already change edge paint, but they describe change/focus semantics rather than arbitrary request, response or material classes.

G03 is justified, but a new two-ended connector needs a decision about ranking/topological direction, one label, marker orientation and style precedence. It should not silently double the graph edge count. G05's waypoint persistence can improve a selected corridor without improving the automatic router; report those outcomes separately.

### Quiet framing already exists, with different layout semantics

`src/dsl/compile.ts:dissolved` removes soft/frameless groups from independent layout and returns their members to the nearest retained scope. `tests/soft-groups.test.ts` rejects a layout on a soft group and a pin on a frameless group. `src/cli/svg.ts:sceneMarkup` draws soft tints and omits a none frame.

G04 is correctly about quiet presentation **while retaining a layout scope**. Do not repurpose `frame=soft` or `frame=none`, or conflate this with G08's correspondence across panels. Any quiet retained frame also needs explicit routing-boundary and group-endpoint behavior.

### Repeated states are already a first-class feature

`docs/DSL.md`, “Emphasis states,” states that every state uses the same layout and that `inspect --states` draws labeled panels with objects in the same positions. `tests/states.test.ts` checks focus/dimming, no shape movement and identical route paths across state panels. `src/model/panels.ts` and `src/dsl/compare.ts` similarly preserve correspondence for before/after version semantics.

The observed E04/E09/E14/E15/E22 source duplication is real, but this study did not exhaustively test whether existing state or comparison mechanisms could reduce every part of that burden. G08 should remain **Explore**. First distinguish cases requiring changes in graph membership, text, framing or arbitrary panel composition from cases requiring only emphasis. A new macro/template language is not yet demonstrated necessary.

### Endpoint repair must respect intentional cell crossings

`src/model/routes.ts:cellEnds` chooses a free exposed cell side when possible. For a truly interior cell it intentionally creates an external stub and a crossing continuation. `tests/cells.test.ts` tests that behavior. Open expanded group endpoints use a frame-sized stub so the group's frame does not obstruct its own route.

The final E21 image visibly retains a route through the Stack title and awkward attachment approach; E22 demonstrates that semantic field targeting and explicit ports can repair its retained final case. G11 therefore supports a focused regression investigation, not a claim that cells/groups are unsupported or a rule banning every cross-cell line. A fix must preserve the intended record-versus-field target. Retargeting an edge merely to make it look clear can change meaning.

### Contrast and fit diagnoses are narrow, actionable findings

`src/model/note.ts:noteMarkup` uses slate-50 group fill with global `look.text`, explaining E05/E23's pale foreground on a pale note panel in their dark themes. Fix their surface/foreground pairing; do not invert the global shade scale. A minimal compatible-ink fix and choosing a dark panel aesthetic are different decisions. Test actual SVG/PNG plus the note/theme fixtures and custom swatches.

For G12, the compiler reports `text-overflow` when `leaf.overflow` follows its fit policy. `src/model/labels.ts:titleArea` and `diamondMeasure` reserve shape-dependent room. The inspected E11 labels and E24 YES/NO words are visibly contained despite the 16 retained final warnings. This supports more specific diagnostics, not wholesale suppression or proof that the current padding policy has no value. A deliberately clipped control must continue to warn. No new pixel-clipping algorithm was implemented in this study.

## Authoring errors and residual choices must remain visible

| Evidence | Appropriate interpretation |
| --- | --- |
| E05's solid Lambda/API return despite the blanket solid=request/invocation note | A retained authoring/legend inconsistency. Semantic completeness is 4; do not turn this exception into a new product gap. |
| E07's tangled v0 | Declaration order and duplicated reverse edges contribute alongside route behavior. Native ordering and port controls already improve it. |
| E03/E04/E05/E08 publication text scale | Missing local text controls contribute, but author-chosen large panels and minimum dimensions also shrink text at equal publication width. |
| E08's missing stack marks | Potential record/collection multiplicity cue, not safely dismissed as decoration. All stages retain semantic score 4. |
| E09's invalid `state=muted` attribute | Author syntax error; named emphasis states already exist. The retained trial is useful evidence of friction, not missing dimming. |
| E06's rejected negative pin | A documented coordinate-range failure; the earlier valid v2 was restored and rerun unchanged, not a fourth refinement. V1 can remain the better communication stage. |
| E12's plus shorthand and E14/E22's reserved `root` identifier | Author-introduced semantic shorthand or invalid naming. Do not attribute either directly to a router or missing primitive. |

The three axes of communication quality, fidelity and semantic completeness should remain separate. Retaining every named box does not restore metric time, collection multiplicity, terrain, radial extent or route color. Conversely, weaker resemblance does not automatically mean worse communication. The per-case residuals and anchored scores are more informative than a synthetic total.

## Confirmation discipline and future acceptance

The six confirmations are **E06, E10, E16, E20, E28 and E30**. They are visible in the present audit and therefore are not an unseen or blinded test set. Their defensible role is a fixed set excluded from selecting future numerical engine/default values. Authoring a manual native attempt from a reference is not itself engine tuning; using those coordinates or preferred gaps to optimize a future default would be.

Choose any new numerical defaults from the 24 development cases and explicit design constraints, lock those choices, then run the six confirmations. Their qualitative presence in gap coverage is acceptable and transparent. A holdout failure may motivate a new documented iteration; it must not be followed by silent numerical retuning and a claim of independent confirmation. No implemented change has passed those future tests yet.

For each proposed change, require a small acceptance packet: source before/after, a semantic inventory, native diagnostics and geometry, actual SVG plus publication-width/detail PNGs, source-burden counts, and a meaningful longer-label or panel-edit exercise. Preserve default behavior when new controls are absent. Do not promise fewer pins solely from route controls: many pins encode the chosen editorial composition, and the isolated causal cost of one missing feature was not measured.

## Remaining recommendations for the main report and plan

The consolidated boundaries are suitable for publication with the two corrections above. Keep G09–G12 labeled as stress evidence; keep G07's per-shape limitation explicit; keep G08 exploratory until existing state/compare paths are assessed. Split G02's primary-label exposure from additive captions, and do not double-count edge-label persistence under both G02 and G05 as two independent delivered features.

Build proposals should name focused tests and observable acceptance, while Explore proposals should identify the unanswered design decision. Defer arbitrary illustration, exact proprietary fonts and a general-purpose vector editor. Avoid whole-reference image imports, generic global routing penalty tuning from these pictures, change-status misuse to fake semantic traffic colors, and claims that successful parsing or warning-free output equals publication quality.

The report can state that this baseline exposes real recurring authoring and visual limits. It cannot yet state that a proposed API reduces effort, that a new default generalizes, or that a future implementation passes the corpus. Those remain testable predictions for the local implementation phase.
