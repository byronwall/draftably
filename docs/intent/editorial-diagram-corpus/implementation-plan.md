# Editorial controls: implementation plan

Status: proposed follow-on work. The corpus and audit are complete. No product fix is included.

Use the [summary dispositions](research-summary.md) as the reviewed decision list.
The [original detailed plan](assets/pro-results/2026-11-01/implementation-plan.md) names further cases,
tests, and risks. The [asset index](assets-index.md) preserves all original evidence.

## 1. Repair dark-note contrast

Change `src/model/note.ts::noteMarkup` after defining how note surfaces and ink should pair.
It currently combines slate-50 panel fill with global `look.text`. Those choices conflict in
E05 v1 and E23 v1. Reuse resolved appearance roles; do not introduce hard-coded dark-theme colors.

Prove the unchanged failing sources become readable in SVG and PNG. Check light themes and custom
swatches. Note geometry must stay fixed. Extend the existing notes/themes/drawn-colors tests with
one focused contrast regression. Add one small runnable example and document the chosen behavior.

Risk: choosing only a different ink can repair contrast while leaving an unintended surface.
Decide that policy explicitly. Do not change global shade ordering.

## 2. Add bounded text roles and durable annotations

Start with local roles for titles, fields, values, and captions. Keep measurement and rendering
consistent across `src/model/fonts.ts`, `labels.ts`, appearance resolution, and both renderers.
Extend native syntax, compilation, and translation together. Update `docs/DSL.md` and the bundled
Draftably skill in the same change.

Develop on E08 records and E29 prose. Confirm with E10. A reader must distinguish the roles at
the same publication width without removing wording or adding one helper node per style.

Then expose existing primary-label and edge-label placement state through native files.
`src/model/types.ts` already stores these fields. `src/dsl/translate.ts::rejectUnsupported`
currently rejects their edits. Additive captions are a separate behavior: define anchor identity,
optional leader, bounds, and opt-in space reservation. Preserve layout-neutral note behavior.

Develop annotation proofs on E03 and E13. Save, reopen, and lengthen one caption.
The caption must retain its subject and avoid unrelated text. Use existing translate, notes,
edge-label, bounds, and file-session tests. Add a documented runnable caption example.

Risk: unmanaged local type sizes or caption overlays can produce new collisions.

## 3. Express relation meaning and quiet containers

Design semantic edge paint and visible arrow ends separately from logical graph direction.
Touch edge model/syntax, compilation, translation, shared color resolution, and both renderers.
One duplex declaration should replace paired routes in E07 while preserving the relation.
E05 must distinguish request, response, and neutral transport with a truthful legend.
Test diff/emphasis paint precedence and the existing sequence/undirected behaviors.

Keep `frame=soft` and `frame=none` scope semantics. Add an explicit quiet appearance for a retained
layout scope if the proof supports it. Develop on E08 records and E15 agent groups.
Membership, local recipes, and parent-relative positions must survive save/reopen.
Update native docs, the authoring skill, examples, and relevant translation/group tests.

Risk: treating arrowheads as direction or border visibility as scope can change the graph's meaning.

## 4. Repair record endpoint behavior

Reduce E21's `upvalue_stack` route to a small regression fixture. Preserve the semantic target.
Inspect `src/model/routes.ts::cellEnds/routeInput/drawRoutes` and routing-engine endpoint stubs.
The selected bottom endpoint must receive an outward approach that avoids unrelated title/field text.

Keep E17's valid cell pointer and E22's repaired field target as controls.
Do not ban all interior-cell crossing segments. Use focused cells/ports/direction/clearance tests
and matched SVG/PNG proof. Document endpoint semantics with a small record example.

Risk: global clearance changes can break legitimate memory diagrams.

## 5. Run bounded design proofs before expanding the DSL

| Exploration           | First proof                                     | Decision needed                                                                  |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| G12 diagnostics       | E11/E24 plus genuinely clipped text             | Distinguish padding policy from escaped glyphs before changing thresholds.       |
| G05 route persistence | E05/E11 corridor plus moved endpoint            | Define coordinate ownership, stale waypoints, and partial route authority.       |
| G08 repeated panels   | Compare E04/E09 with existing state exports     | Add correspondence constraints only if existing features remain inadequate.      |
| G07 shape vocabulary  | One cylinder or chevron                         | Require measured bounds, label fit, attachment, and export parity.               |
| G10 metric time       | E02 shared offsets 0, 1, 2, 4, 8                | Keep quantitative time distinct from ordinal sequence rows.                      |
| G06 cycles/regions    | One independent development fixture per grammar | Do not combine arbitrary curves, contours, and sectors into one feature promise. |

## Acceptance and delivery

Keep the original corpus source and images immutable. Compare an unchanged source on the old and
new engine before attempting a shorter source with new controls. Report quality, fidelity, semantics,
and source effort separately. A lower defect index or smaller file does not establish success.

For any resilience claim, perform an actual label/content edit and inspect the result.
Choose numeric defaults on development cases. Run the six confirmation cases after those choices.
If confirmation changes the design, record a new iteration.

Each product change needs the repository's required checks, a changeset, and screenshot proof.
No proposed acceptance outcome has been executed by this research PR.
