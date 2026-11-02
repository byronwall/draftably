# Independent review of the proposed implementation plan

**Disposition:** Build a small source-persistence and editorial-hierarchy layer before broad geometry expansion. Repair demonstrated defaults separately from exposing existing manual controls. The corpus supports both kinds of work, but combining them would obscure whether a fix improves first renders or merely makes manual reconstruction possible.

This review covers the parent-provided global themes rather than an implemented patch. No application or native corpus source is changed. The baseline and completed attempts remain the evidence. Paths below refer to the immutable source packet.

## 1. Claims to narrow before publication

### Existing model capability is not native-file capability

`src/model/types.ts:LabelLayout` already has mode, dx, dy, width, and leader. `src/model/labels.ts:nodeLabel` handles top/bottom/left/right/detached modes, including a leader default for detached labels; `visualBounds` combines shape and label extents. `EdgeLayout` already has labelDx/labelDy and waypoints, and `src/model/routes.ts:drawRoutes` uses the edge label offsets. These are not hypothetical future primitives.

More decisively, `src/dsl/translate.ts:rejectUnsupported` explicitly rejects:

- Changes to connection waypoints: “Connection bends are not saved to diagram files yet.”
- Edge label offsets: “Connection label positions are not saved to diagram files yet.”
- Changes to `layout.labels`: “Label positions are not saved to diagram files yet.”
- Images/icons: “Images and icons are not saved to diagram files yet.”

`tests/translate.test.ts` contains an explicit test expecting a waypoint edit to throw `UnsupportedEdit`. This is intentional native-file persistence/exposure work. Do not describe it as proof that Draftably's model or canvas cannot render these features. A proposed fix must replace rejection with correct serialization and reprojection, not simply remove the guard.

### A primary label leader is not an additional annotation

Exposing `LabelLayout` could move a node's existing title and attach a leader. It does not automatically create a second caption while leaving the node's main label inside. E03 needs both “Redis” and a separate support caption. E10 similarly needs a component name and a mechanism caption. Existing `Note` is a separate structure with text, near, side, and width, but no independent identity, leader, exact offset, or layout footprint. The plan should split:

1. Native persistence of existing primary-label placement.
2. A genuine attached-caption/annotation capability, including optional reserved layout room.

`tests/notes.test.ts` deliberately asserts that adding notes does not move nodes. Preserve that behavior for existing `note` sources; do not silently turn every note into a layout object.

### Curves, waypoints, and radial layout are different tasks

`EdgeLayout.waypoints` are route control points. `src/model/geometry.ts:roundedPath` emits line segments with quadratic rounding at corners. This is not arbitrary Bézier authoring or a circular/radial layout recipe. Source persistence of waypoints can improve awkward orthogonal routes, but it will not reproduce E08's sweeping curves or scientific radial/process figures by itself.

A general curve feature also affects label placement, obstacle checking, arrowhead tangents, bounds, hit testing, and halo/crossing calculations. `haloPath` reasons about upright and level segments. A plan that only changes the SVG path string is incomplete.

### Quiet groups already exist, but their layout semantics differ

`frame=soft` and `frame=none` flatten a group's members into its nearest boxed scope; they do not retain an independently arranged container. `docs/DSL.md` makes layout/refinement on soft groups invalid. `src/cli/svg.ts:sceneMarkup` also distinguishes the soft/none drawing paths from boxed frames. The gap is **quiet presentation while preserving a boxed layout scope**, not an absence of transparent groups.

Do not change the meaning of existing `frame=none` to solve this. Add presentation choices independently of scope behavior, with explicit decisions about invisible routing boundaries and group endpoint visibility.

### Avoid overstating the routing evidence

E07's v0 tangle is partly an authoring result: client/server were declared before resource groups in a row recipe, and twelve duplex connections became twenty-four competing directed edges. Correct order and explicit ports are already native controls and substantially improve it.

There is nevertheless genuine recurring evidence of boxed-group endpoint routes passing through descendants/header regions: E04, E05, E07. E21/E22 add narrower cells/group endpoint stress. Those findings justify targeted default-side/obstacle investigation; they do not show that the router generally cannot handle groups or cells.

`src/model/routes.ts:cellEnds` intentionally routes a cell with no free exposed side via an external stub and a cross-cell continuation. `tests/cells.test.ts` verifies that behavior. A test that bans every route crossing a cell would break a supported semantic case. E21's final explicit ports remove field-through warnings but leave a Stack-title crossing; E22's ports repair its record attachment. Keep both the successful workaround and residual failure visible.

### Severity is not the same as commonness

The dark-note contrast defect is narrow and actionable with two observed cases; it does not need to be renamed common to justify building a fix. E01/E02 are two-publisher temporal stress cases, not yet a common metric-timeline demand. E21/E22 are two-source endpoint stress cases. Preserve the corpus threshold of three accepted examples from at least two publishers for each actual common claim, rather than grouping unrelated failures to reach it.

## 2. Recommended dispositions and acceptance gates

| Proposed area | Disposition | Why / implementation boundary | Acceptance evidence and risks |
| --- | --- | --- | --- |
| Text roles and local typography | **Build** bounded roles first | E03/E08 show small uniform labels inside manually enlarged panels; source typography communicates hierarchy, not just brand. Add explicit local role resolution through measurement and rendering, not SVG-only styling. `labels.ts`, `fonts.ts`, `appearance.ts`, syntax/compile/project, CLI and scene views all participate. | Develop on E03/E08/E22. At equal publication width, entity/component/field/value/caption roles are distinguishable and full text remains legible. Change a label to a longer real phrase and rerun. Preserve font embedding and default-source geometry invariants. Risks: inconsistent wrap/measure between canvas and CLI; palette/theme slot regressions. |
| Primary-label and edge-label persistence | **Build** with strict round trip | Existing LabelLayout and EdgeLayout features are currently rejected by `translate.ts`. Add source syntax, parsing, projection, and edit translation as one coherent change. | `tests/dsl.test.ts`, `translate.test.ts`, `cli-edit.test.ts`, `layout-edits.test.ts`, `edge-labels.test.ts`. Test create, save, re-open, move parent, and export. No apparently saved edit may snap back or vanish. Do not claim this alone solves additional captions. |
| Attached annotations/captions with optional room | **Build** a small additive form | E03 captions and E22 record annotations need clear association. Existing overlay notes are intentionally layout-neutral. Add an explicit attached/reserving behavior instead of changing all note semantics. | Keep current `notes.test.ts` no-movement assertion for old syntax. New mode preserves node title and separate caption, with a leader when appropriate and clear group-border handling. No fake semantic node/edge is introduced. Risk: layout cycles when caption size changes the object/route geometry it anchors to. |
| Semantic edge paint and arrow ends | **Build** with restrained model extension | Native ModelEdge allows kind/from/to/constraint/directed but no direct family, width, or end-style. `DiagramEdge` has one directed boolean. Status colors should not be abused for traffic roles. | Develop on E01/E05/E07 and another appropriate computing case. One duplex connector has one route, two heads, one label, and specified ranking semantics. A request/response color key agrees with paths. Preserve ordinary directed and undirected imports. Risks: “arrow decoration” accidentally changes graph semantics; reverse path orientation swaps heads; theme contrast weakened. |
| Group/cells endpoint defaults | **Build** narrow regression fixes | Investigate `routeInput`, group stubs, `cellEnds`, `facing`, and routing engine obstacles. Separate choosing a sensible initial face from allowing manual override. | Use E04/E05/E07 failing v0 snapshots and E21/E22 retained cycle-2 trials. Avoid the observed unnecessary child/title crossings without retargeting endpoints. Maintain the tests for interior cells that intentionally need a cross-cell continuation. Risk: a local port heuristic increases other crossings or makes true internal-field attachments impossible. |
| Quiet containment independent of layout | **Build** a small presentation option; **Explore** broader behavior | Repeated panels need a scope and spacing without a heavy border/glyph/header. Existing soft groups deliberately dissolve scope. | Develop on E04/E09/E22. Hiding frame chrome must leave arrangement, semantic membership, and content extents predictable. Test edges to hidden/quiet groups explicitly. Keep old soft/none behavior. Risks: invisible endpoint boundaries, accidental flattening, and header-space changes invalidating stored pins. |
| Manual route waypoint persistence | **Explore**, then Build if the round-trip design is clear | Existing model geometry is an escape hatch, not a replacement for better default routes. Decide whether coordinates are global, scope-relative, or anchored to endpoints before syntax is committed. | Use an awkward return route from E05/E08/E21. Save/reload and move its parent group; the route must move predictably or clearly remain fixed according to documented semantics. Keep automatic routing available when controls are removed. Risks: brittle hard coordinates and path drift after label edits. |
| Repeated-panel shared geometry | **Explore** constrained correspondence before a template language | E04/E09/E22 have high pin/size cost. Start with shared tracks/equal footprints and per-role alignment; do not add a general macro system just to shorten text. | Compare non-comment lines, manual geometry assignments, and one meaningful label-edit workload. Keep explicit per-panel semantic differences and stable IDs. Risk: abstraction hides omitted nodes/edges, or incorrectly forces panels with genuinely different geometry into identical boxes. |
| Simple semantic shapes | **Build** only the few recurring shapes confirmed across the full corpus | A cylinder, record/pointer endpoint, or simple polygon is distinct from a freeform illustration. New shape work must update ports, label room, bounds, canvas and SVG rendering. | `syntax.ts:DSL_SHAPES`, `types.ts:ShapeKind`, `labels.ts:titleArea`, `routes.ts:portPoint`, `cli/svg.ts:outline`, `components/scene/NodeView.tsx:ShapeOutline`. Test exact edge contact and text fit, not only path existence. Risk: a nice outline with incorrect routing geometry. |
| Native icon/image exposure | **Explore** persistence and asset policy | The model has icon/image kinds; translate explicitly rejects native persistence. This is partly exposure, but self-contained export and asset identity remain real work. | Small licensed/local assets with deterministic export, save/reload, and retained accessible text. Do not import a reference diagram as one image node. Risks: external asset loss, nondeterministic fetches, unavailable fonts/icons, and disguising missing native structure. |
| Curved or radial geometry | **Explore** one bounded semantic recipe; **Defer** arbitrary illustration editor | The adjacent corpus shows real explanatory geometry, but arbitrary splines are much larger than waypoint persistence. A simple cycle/radial recipe may be testable without becoming a vector editor. | Development cases must exclude held-out E30 for numerical tuning. Verify arrow direction/tangent, label association, line intersections, and whole-figure bounds. Risks: new geometry bypasses existing conflict checks and looks correct while topology is wrong. |
| Dark-note contrast | **Build** narrow fix now | `noteMarkup` chooses slate-50 fill and global look.text. With the light foreground used on a dark canvas, those are nearly the same light tone. Existing swatches already pair fill/ink. | E05 plus E23 and all five theme fixtures. Test computed note foreground/background contrast and inspect actual SVG/PNG. A minimal ink-pairing fix may leave a light panel on a dark canvas; that is distinct from a later dark-surface aesthetic choice. Do not flip global shade ordering. |
| Metric timeline / timed sequence | **Explore** after common hierarchy issues | E01 horizontal equal-row flights and E02 manual proportional x positions expose different temporal needs. A general chart system is not justified by two cases. | E02: shared scale retains exact event offsets and synchronization after inserting an event. E01: clearly distinguish order-only sequence from timed transit. Preserve the current sequence recipe defaults. Risk: treating message order as measured latency or visually implying unsupported time values. |
| Exact source fonts, shadows, hand drawing | **Defer** | They affect fidelity, but the corpus shows more consequential hierarchy and semantic connection gaps. E06/E09 include true illustration content that should remain an honest boundary. | Keep readable bundled substitutes and record losses. Avoid claiming exact reference match or taking a raw raster difference as a quality gate. |

## 3. Duplicates to merge, and distinctions to retain

**Merge presentation symptoms into one typography workstream:** fixed group-heading alignment/scale, uniform entity/value styles, and publication-size labels. They share type resolution/measurement paths. Report relevant subfeatures so “local typography” does not become an unbounded rich-text editor.

**Keep label exposure separate from new notes:** moving an existing title with a leader is exposure; adding a second caption with a footprint is new behavior. They can share placement utilities, but should have separate acceptance tests and evidence.

**Keep edge semantics separate from route geometry:** color/head/dash identity can be useful on an unchanged route. Route repair should not require adding duplicate reverse edges or changing endpoint targets. A two-headed connector has a particular topology/ordering decision; it is not just another stroke width.

**Keep improved defaults separate from manual escape hatches:** a waypoint that repairs one picture does not show the default engine improved. Report v0 gains separately from v2 source reduction and manual control fidelity. The corpus already makes this comparison possible.

**Keep quiet containment separate from repeated-layout correspondence:** a quiet box can still have content-driven dimensions; a repeated grid can still need visible boundaries. A single “panels” feature is likely to hide two different requirements.

**Split geometric primitives from native image/icon serialization:** `ShapeKind` exposure helps illustrated labels, but it does not make an octagon/cylinder or an explanatory freeform state editable as native geometry. Avoid counting those as one fully solved gap.

## 4. Suggested staging

### Stage A — preserve behavior, fix the demonstrated contrast bug

Create immutable baseline replay outputs for selected development cases and keep the current thirty-case source manifest. Add a targeted dark-note fill/ink contrast regression and fix only the note pairing. Confirm no content/layout movement for existing notes and no accidental theme shade inversion. Run the focused notes/themes checks and actual `inspect --svg` plus supplied-shoot images.

### Stage B — source-persistence contract and bounded visual roles

Add the smallest native text-role and label/edge-label persistence surface. Cover parser/printer round trips, project/translate parity, and CLI/canvas font measurement. Extend tests that currently reject unsupported edits to accept only the newly serializable edits; leave all others guarded. Develop on E03/E08/E22, and inspect at the same publication width as the reference, not merely at 200% zoom.

Add the explicit attached-caption behavior as a separate opt-in. Verify that existing note sources remain layout-neutral. This stage should improve meaningful type hierarchy and annotation association before a broad geometry project begins.

### Stage C — edge semantics and default endpoint behavior

Introduce consistent stroke family/end controls through the model and native syntax. Separately repair narrow route defaults using retained failing group/cell endpoint cases. Measure warning changes and inspect arrows at both ends. The desired result is fewer manual repairs with unchanged semantic endpoints, not a global promise of zero crossings.

### Stage D — quiet scope presentation and repeated geometry

Add quiet rendering for a retained layout scope and evaluate whether simple shared tracks/footprints reduce E04/E09/E22 geometry source. Use label edits and panel insertion as resilience exercises. Reserve a general reusable-template language until these smaller controls prove insufficient.

### Stage E — controlled exploration of curves, shapes, and time

Prototype one representative simple shape and one bounded curved/radial or temporal recipe. Require the same source/save/export/conflict parity as existing shapes. Defer arbitrary vector drawing, proprietary font replication, and any feature that merely hides the original in an imported image.

## 5. Confirmation discipline and proof quality

The six confirmation cases are **E06, E10, E16, E20, E28, E30**. They may inform qualitative gap coverage because they were audited now, but do not use their coordinates, gaps, font sizes, or preferred port choices to select numerical tuning values. Choose numerical defaults from development fixtures and explicit design constraints; lock them before running the six holdouts. A holdout failure may trigger a new documented iteration, never silent retuning followed by a claim of independent confirmation.

A useful acceptance packet contains source before/after, semantic inventory, compiler diagnostics, actual CLI geometry/SVG, publication-sized and detail PNGs from supplied shoot, source-cost counts, and a small label-edit exercise. Pixel registration is not valid for many of these different compositions. Use exact assertions for topology, source round trips, attachment geometry, bounds, and type measurements; use anchored human judgment for readability and fidelity. The final report must continue to distinguish observed results in this baseline from predicted benefits of future fixes.
