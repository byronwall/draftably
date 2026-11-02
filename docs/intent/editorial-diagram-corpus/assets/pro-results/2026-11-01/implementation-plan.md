# Implementation plan: improve editorial control without weakening native defaults

**Status: proposal only. No application fix or new syntax was implemented in this study.** The baseline remains `f14d9b891adba75de6cc172b190017ea5a5ca091`. All cited case images and source burdens are observed; the acceptance criteria below describe future work.

## Recommended order

Begin with the demonstrated dark-note defect, then support readable text hierarchy and anchored annotations, semantic connector paint, and quiet containers that retain layout scope. Repair the specific record endpoint cases with minimized regression fixtures. Explore manual route persistence and higher-level repeated composition only after those narrower changes establish stable behavior. Pictorial terrain, unrestricted vector editing and exact publisher fonts should not lead this program.

The reason is visible across the corpus: many failures involve a correct relationship whose label, caption, color or framing cannot be authored precisely enough. Those changes can improve ordinary architecture, records, explanations and workflows. Illustrated terrain or annular biology requires a larger product decision and should not be smuggled into an automatic router patch. [Evidence: `report.md`, `gap-audit.md`, `gap-mapping.csv`.]

| Rank | Disposition | Work | Evidence and reason |
|---:|---|---|---|
| 1 | **Build** | G09 note surface/foreground pairing | Reproduced in E05 and E23; a narrow contrast failure with a direct source explanation |
| 2 | **Build** | G01 bounded text roles and G02 anchored captions/labels | Repeated across unrelated publishers; source already contains part of the label model |
| 3 | **Build** | G03 semantic connector paint and independent arrow ends | Relations lose category or duplex meaning; repeated edges increase source and route competition |
| 4 | **Build** | G04 quiet appearance for retained layout scopes | Existing soft/none frames intentionally dissolve scope; a separate visual control is needed |
| 5 | **Build** | G11 focused record endpoint behavior | Actual E21 geometry still crosses a title; E22 and E17 supply repaired and positive controls |
| 6 | **Build** | G12 diagnostic specificity | Distinguish glyph clipping from conservative padding violations without weakening checks |
| 7 | **Explore** | G05 saved route controls | Internal waypoints exist, but coordinate, edit and persistence contracts need proof |
| 8 | **Explore** | G08 shared geometry across panels | Duplication is measured; existing emphasis-state export must be tested before a new template abstraction |
| 9 | **Explore** | G06 cyclic paths/regions, G07 selected shapes, G10 metric time | Meaningful needs, but separate abstractions with different risks and uneven incidence |
| 10 | **Defer** | Exact font matching, shadows, freehand texture, scientific illustration | Sometimes central to the reference, but outside the highest-value semantic authoring work |
| 11 | **Avoid** | Reference-image backgrounds, status paint abuse, default-wide tuning to minimize DI | These hide limitations, misstate semantics or optimize a heuristic instead of the reading task |

## Stage 0 — Preserve the study and establish proof fixtures

Codex should ingest the archive without rewriting it, verify `manifest.sha256`, and reproduce the complete run in a separate copy. All 90 final baseline attempts already have successful local execution in this environment; this replay establishes the target machine, not a missing result. Keep a before/after set from this fixed baseline. Do not combine changes to the study's source, the engine and the reference imagery in one comparison.

Reduce the chosen development cases to small repository fixtures while retaining the semantic target and failing geometry. Store original corpus IDs beside the fixture. Public repository image inclusion requires a separate license/attribution disposition; a self-authored native regression fixture can usually be reviewed without copying the third-party image into the repository. This is an implementation proposal, not a rights determination.

**Development cases:** the 24 cases other than E06, E10, E16, E20, E28 and E30. **Confirmation cases:** those six remain reserved from selecting constants or layout heuristics. An observation in a confirmation case may identify a feature boundary; it must not supply the chosen padding, bend penalty or threshold. Run confirmation after the implementation design and development acceptance criteria are fixed. Record any changes made after that evaluation as a new development cycle rather than pretending the cases remained held out.

## Stage 1 — Fix note contrast and clarify fit diagnostics

### G09: pair the note foreground with its intended surface

**Source:** `src/model/note.ts::noteMarkup` currently gets the panel fill from `swatchFor(look, 'slate', 50, 'group')` and the text from `look.text`. The surface and foreground can diverge on a dark canvas. Inspect `src/model/appearance.ts` for swatch resolution and override precedence.

**Development proofs:** E05 v1 and E23 v1, plus their explicit v2 palette workarounds. A future fix should make the original v1 note text readable without adding the workaround. Do not use a changed v2 source to demonstrate that an engine defect was fixed.

**Acceptance:** the same native sources render a coherent surface/ink pair in light, dark and custom-palette themes; text is readable at the original publication comparison width; the expected swatch policy is tested in actual SVG and PNG output. Avoid a universal hard-coded ink color. Note border, diff/emphasis precedence and other uses of slate-50 retain their documented intent.

**Tests:** `tests/notes.test.ts`, `tests/themes.test.ts`, `tests/drawn-colors.test.ts`; add a minimal dark note fixture. **Main risk:** a seemingly correct global foreground replacement changes custom palette behavior. Establish the surface/ink contract first.

### G12: distinguish clipping from tight padding

**Source:** `src/model/labels.ts::titleArea/diamondMeasure`; the `text-overflow` diagnostic in `src/dsl/compile.ts`.

**Development proofs:** twelve final E11 labels and four final E24 YES/NO labels receive fit warnings while visibly contained. These cases do not justify suppressing every warning. Add a genuinely clipped long-label control and a second bundled font.

**Acceptance:** a diagnostic tells the author whether text escapes the shape, exceeds the recommended padding box or needs a larger manual size. Source locations remain actionable. The deliberately clipped control continues to warn. No threshold is tuned against a confirmation case.

**Tests:** `tests/title-wrap.test.ts`, `tests/dsl.test.ts`, `tests/quality-notes.test.ts`, `tests/bounds.test.ts`. **Main risk:** removing warnings by globally reducing safety margins creates unseen clipping regressions. Improve specificity before changing margins.

## Stage 2 — Make typography and annotations native, durable authoring controls

### G01: add a bounded local hierarchy

**Source:** `src/dsl/syntax.ts` attribute allowlists, `src/dsl/compile.ts`, `src/model/appearance.ts`, `src/model/fonts.ts`, `src/model/labels.ts`, `src/model/heading.ts`, and `src/dsl/translate.ts`.

The baseline already has global title, group and annotation roles with bundled deterministic font metrics. The first design should extend that system with a small number of locally assignable roles or bounded overrides. Do not accept arbitrary CSS as a shortcut: the text measurer, layout and both renderers must agree about every supported property. Decide separately whether italic/mixed runs and scientific notation belong in the first release. E12's notation motivates a need but does not prove a full math typesetter is required.

**Development proofs:** E08 entity/field/value distinctions; E29 short role labels versus long prose; E22 narration versus NS/A records. Compare at the same full-sheet width. **Confirmation:** E10's layer/component/caption hierarchy.

**Acceptance:** the reader can distinguish those text roles without adding a separate helper node for every style change. A longer value or caption stays within a measured region or gives an explicit diagnostic. Save/reopen preserves the role. Readable text must not be purchased by silently dropping wording. Keep the existing default appearance unchanged when no new control is supplied.

**Tests:** `tests/themes.test.ts`, `tests/theme-slots.test.ts`, `tests/title-wrap.test.ts`, `tests/heading.test.ts`, `tests/edge-labels.test.ts`, `tests/translate.test.ts`. **Main risk:** adding apparently local styling whose size is ignored by layout creates new collisions.

### G02: distinguish primary label placement from additive captions

**Source:** `src/model/types.ts::LabelLayout` already includes placement, offsets, width and leader information; `EdgeLayout` contains label offsets. `src/dsl/translate.ts::rejectUnsupported` rejects changed native label placement. `src/model/note.ts` currently provides post-layout proximity notes, not a fully anchored caption model.

First make existing primary-label and edge-label state durable through an explicit native parse/compile/serialize design. Then evaluate additive captions as a separate semantic object: stable identity, node/group/edge anchor, side, optional leader and an explicit choice about reserving space. Native notes currently avoid moving nodes; preserve that behavior unless the author opts into reservation.

**Development proofs:** E03 component descriptions, E13 annotation relationships, E21 exterior record labels, E29 caption-rich workflow. **Confirmation:** E20 conceptual landmarks and E28 station labels; they test boundaries, not a promise that ordinary captions alone will reproduce those references.

**Acceptance:** captions remain associated with the same object through a label edit and save/reopen; leaders do not cross the target label; bounds include the caption; optional reserved space prevents the documented overlap without moving unrelated scopes unnecessarily. E03 should need fewer fixed width/height accommodations. Count the actual source reduction after implementation rather than promising a percentage now.

**Tests:** `tests/notes.test.ts`, `tests/edge-labels.test.ts`, `tests/heading.test.ts`, `tests/bounds.test.ts`, `tests/translate.test.ts`, `tests/file-session.test.ts`. **Main risk:** treating captions as ordinary graph nodes changes topology, while treating them only as overlays hides their layout cost.

## Stage 3 — Express relation meaning and quiet containment

### G03: semantic connector paint and arrow ends

**Source:** `src/model/types.ts::DiagramEdge`, DSL edge allowlists/compilation, `src/cli/svg.ts::sceneMarkup/arrowsFor`, shared appearance/status resolution, and the corresponding canvas connection renderer discovered during implementation.

Design semantic color/width or a small relation-style vocabulary independently from change status and emphasis. Design logical direction separately from visible arrow ends. `directed=false` currently means an undirected relation; it is not a presentation-only hide-arrow switch. Native duplex relationships should not require two separately routed logical edges merely to get an arrow at both ends.

**Development proofs:** E05 request/response/neutral HTTP categories, E07 twelve duplex links, E27 biological and technical return streams. E01 verifies that sequence message behavior remains coherent. **Confirmation:** E16 hierarchy with restrained arrowheads and E28 transit service identity.

**Acceptance:** one duplex declaration preserves both endpoint meanings without route duplication; all E05 legend categories are true, including the neutral return currently misdescribed by the author's v2 note; edge text, arrowheads and path inherit the same intended paint; color distinctions have a non-color cue when necessary. Test diff/emphasis/status precedence. Do not use a source edit to hide an unfixed author legend mistake.

**Tests:** `tests/undirected.test.ts`, `tests/drawn-colors.test.ts`, `tests/themes.test.ts`, `tests/edge-labels.test.ts`, `tests/translate.test.ts`, `tests/sequence.test.ts`. **Main risk:** conflating visual endpoints with graph direction changes layout depth and semantic exports, as E16 illustrates.

### G04: quieter group appearance while retaining scope

**Source:** `src/dsl/frame.ts`, scope handling in `src/dsl/compile.ts`, `src/model/types.ts::DiagramGroup`, group rendering in `src/cli/svg.ts`, and `src/dsl/translate.ts`.

Keep existing `frame=soft` and `frame=none` meanings intact: both dissolve the group's own layout scope. Add an explicit appearance choice for an ordinary retained scope if the design proof supports it. Determine header placement/visibility, stroke and fill behavior without letting presentation change membership or coordinate ownership.

**Development proofs:** E08 quiet nested record scopes, E14 comic panels, E15 dense agent groups. **Confirmation:** E10 layered captions and E30 membership visibility.

**Acceptance:** the new quiet group retains its own recipe and parent-relative geometry; nesting and record order remain unchanged; removing chrome does not turn captions into ambiguous free text. Labels still fit and exports agree. **Tests:** `tests/soft-groups.test.ts`, `tests/group-fit.test.ts`, `tests/group-packing.test.ts`, `tests/theme-slots.test.ts`, `tests/compare.test.ts`, `tests/translate.test.ts`. **Main risk:** silently redefining soft groups breaks existing intentional scope dissolution.

## Stage 4 — Repair endpoint behavior; then explore saved route controls

### G11: preserve semantic targets and require a sensible endpoint approach

**Source:** `src/model/routes.ts::cellEnds/routeInput/drawRoutes`, `src/engines/routing-engine.js`, and `src/dsl/conflicts.ts::sceneConflicts`.

E21 is the development regression: the final `upvalue_stack` path is `(700,287) → (35,287) → (35,487)` despite explicit bottom-to-bottom endpoint sides. It approaches the lower endpoint from above through the Stack title/field. Another route runs on a record border. Those are inspectable geometry facts, independent of a subjective fidelity score. Preserve the actual record or field the pointer means while minimizing the fixture.

E22 supplies an earlier container-target route and a successful semantic-field/explicit-side repair. E17 supplies a valid bottom-entry cell pointer. Interior cells with no free side intentionally use a crossing segment in current `cellEnds`; a blanket prohibition would be wrong.

**Acceptance:** the minimized E21 route leaves and approaches the intended endpoint through an outward corridor and avoids unrelated fields/title text; the destination remains semantically the same; E22's repaired field target and E17's valid attachment do not regress. Add export/diagnostic evidence, not only a lower aggregate crossing count.

**Tests:** `tests/cells.test.ts`, `tests/routing-direction.test.ts`, `tests/routing-ports.test.ts`, `tests/routing-group-borders.test.ts`, `tests/routing-clearance.test.ts`. **Main risk:** a global clearance penalty disrupts legitimate memory diagrams. Prefer target-type and stub behavior over corpus-wide constants.

### G05: explore native waypoint persistence with a small contract

The internal `EdgeLayout.waypoints`, `labelDx` and `labelDy` are already present. `rejectUnsupported` prevents saving edited bends and label positions in native files. This is partly an authoring/persistence gap, not proof of a missing rendering primitive.

Before shipping waypoints, decide coordinate ownership, behavior when an endpoint moves, partial versus complete route authority, invalid/obstructed waypoint diagnostics, and deterministic save/reopen. Use E05 and E11 corridors as development proofs; use E28 later to show what octilinear shared-route cartography still needs. A route control must not move semantic nodes just to carry an invisible bend. Label offsets can ship with G02 if their narrower contract is ready first.

**Acceptance:** a controlled corridor round-trips unchanged; a moved endpoint gives a deliberate, documented result; unconstrained routes remain identical; route bounds and labels are included in SVG/PNG. **Tests:** `tests/translate.test.ts`, `tests/layout-edits.test.ts`, routing port/direction/clearance suites and edge-label tests. **Main risk:** stale absolute bends make edits fragile. This remains **Explore** until that behavior is concrete.

## Stage 5 — Explore separate abstractions for repeated scenes, shapes and spatial meaning

**G08 repeated scenes:** first try the documented emphasis-state system and `inspect --svg --states` on an appropriate development fixture. Those states share one geometry and can focus/fade objects. They do not automatically create arbitrary different visible scenes. Compare that supported alternative with E04/E09's repeated explicit geometry. Only then explore correspondence constraints or reusable slots; general macros may make source harder to understand. Test a content edit across repeated scenes and count the real edits required. Relevant files: `src/model/panels.ts`, `src/dsl/compare.ts`, state handling in compile/syntax; tests `states`, `compare`, `refinement-drift`, `group-fit`, `translate`.

**G07 selected shapes:** cylinders (E04), octagons/freeform tokens (E09) and chevrons (E19) are each only single-case motifs here. The combined vocabulary issue meets the commonness threshold, but the study does not establish that each shape is common. Prototype one justified compact shape through shape bounds, connection intersections, text fit, model/native persistence and export parity. Do not infer a demand for arbitrary SVG import from this evidence.

**G10 metric time:** E02 proves that proportional event centers are possible with fifteen pins and fifteen sizes. A future opt-in timeline recipe should derive coordinates from times and a shared scale, preserve those centers through label edits, and leave ordinal sequence defaults untouched. E01's slanted flight/time semantics are a related but different notation. No default sequence constants should be retuned to approximate quantitative time.

**G06 curves and regions:** E27 nested return loops, E26 directed divergence/convergence contours and E30 annular sectors are different visual grammars. Prototype a narrow ordered-loop or directed-band concept on development fixtures before claiming one generic curve option solves them all. Rounded orthogonal corners already exist and are insufficient. E30 is a confirmation case; create an independent development fixture for any radial recipe. Include text/path bounds, direction, membership and renderer parity in the proof. Defer geographic cutaways and pictorial terrain from E25/E20.

## Release evidence and stop conditions

For each implemented stage, preserve unchanged old source renders, changed engine renders, and any separate source simplifications as three distinguishable artifacts. Report quality, fidelity and semantics separately; count declarations, layout/refinement lines, pins, dimensions, styling and ports again. Run the selected meaningful regression tests plus the existing gate required by the repository. Broaden testing only to resolve a specific risk or a required gate.

Evaluate all six confirmation cases only after the development choices are fixed. Accept an improvement when the intended reading task gets clearer, semantics stay correct, supported native source becomes more resilient where claimed, and the strong defaults remain intact. A lower historical defect index, fewer warnings, fewer lines or higher visual fidelity alone is insufficient. Keep unsuccessful proposals and negative results visible. No implementation stage has yet passed these proposed criteria.
