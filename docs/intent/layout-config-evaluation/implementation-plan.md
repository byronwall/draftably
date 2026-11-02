# Implementation plan

Build a smaller editing surface with truthful controls and reversible previews. Preserve current
defaults, all ten rebuild engines, Separate, all six recipes, and exact source values.

This plan integrates the completed [evaluation](README.md). It does not approve implementation,
merge, or deployment. The [original Pro plan](assets/pro-results/2026-11-01/draftably-evaluation/implementation-plan.md)
contains detailed witnesses. The [asset index](assets/pro-results/2026-11-01/README.md) preserves all
results. [Dispositions](dispositions.md) cover every recommendation.

## 1. Correct controls that do not affect file operations

**Build first.** This work does not depend on a better automatic selector.

Update `src/components/comparison/ComparisonSidebar.tsx`, `src/state/comparison.ts`,
`src/state/file-session.ts`, and `src/dsl/layout-edits.ts`.

- Hide Release fixed port sides in file-based routing comparison. Keep the raw operation and
  explicit Use auto ports action. `candidateSource` writes router settings but does not read `autoPorts`.
- Hide file-rebuild effort, manual protection, drawing intent, and pass controls when the source
  path does not consume them. Retain them on supported warm paths.
- Preserve `fit=` when replacing a recipe without an explicit format change. Current replacement
  retains only min-width/min-height. Preserve nested recipes, pins, and exact sizes.
- Show the pending source line and removed soft refinements. Keep preview nonpersisting; Keep
  writes once and Undo restores the exact source.
- Hide cold ordering where it is ineffective; preserve the active warm ordering choice.

Use direct path conditions and existing parameter tables. A new generic capability framework is
not required. Add shared metadata only if it removes actual repeated conditions.

**Proof:** Extend existing layout-edit and file-session regressions with two focused fixtures.
One has explicit endpoint sides; the other has fit=slide, a nested recipe, a pin, and soft stays.
Verify source equality for irrelevant changes, explicit auto-port changes, fit preservation,
preview/save/reopen parity, and exact Undo. Run the real Compare/Keep flow in the browser.

**Docs/example:** Add a short truthful-controls section to `docs/DSL.md` using the grouped fixture.
Update `skills/draftably/SKILL.md` if syntax or language behavior changes. Include a changeset for
product-source changes.

**Risk:** Preserving fit can change the result compared with the current writer. Keep that change
visible in preview and test authored intent explicitly.

## 2. Reduce the routine panel to three fields

**Build.** Update `src/components/LayoutLab.tsx`, `Menus.tsx`, `LayoutPreviewBar.tsx`,
`Inspector.tsx`, and existing controls/CSS. Keep state changes in the existing layout/file seams.

Show Scope, Reading direction, and Format. Use As authored for direction and format until the user
requests a change. Remove the Diagram type aliases from the basic panel. Put exact methods,
separate spacing dimensions, roots, fold, and supported protection options in Advanced.

Move all nine main routing sliders into Advanced. Keep current-default Balanced and the existing
explicit route actions. Move corner shape to Appearance. Preserve exact From/To, Pin, size, and
group controls beside their selected object.

Keep the current selected-engine bounded action for Improve. Do not silently replace it with a
new dispatcher. Direction and format changes require a source rebuild. Appearance changes retain
geometry. Selection repair and root/group rebuild have different applicable scopes.

Retain current fit semantics initially. When fit is active, disclose that best fit may change
direction. Do not show a direction-success badge based only on `doc.settings.direction`.
A direction lock requires a separate source-semantics decision.

**Proof:** Run the ten [scripted jobs](assets/pro-results/2026-11-01/draftably-evaluation/data/ui-task-proxies.json)
as browser tasks. Verify discovery, preview, save, Undo, keyboard access, and reopen. Count visible
fields independently from option values. Confirm unchanged files remain byte-identical on open.
Do not report the scripted 45→36 step estimate as a measured usability result.

**Docs/example:** Update the layout/routing editor guide in `docs/DSL.md`. Use checkout, a nested
architecture, and the existing sequence example. Keep specialist source access documented.

**Risk:** Excessive disclosure can make rare tasks hard to find. Advanced must have a clear entry,
plain labels, and complete source access.

## 3. Make comparison smaller and more informative

**Build presentation; Explore candidate policy.** Update the comparison dialog/sidebar, preview bar,
`src/state/comparison.ts`, and existing Explorer/variant helpers.

Always show the current drawing. Initially display up to three materially distinct alternatives,
with More exposing the complete method set. Show fewer when outputs are equivalent. Report hard
defects before crossings, area, and route length. Explain measured tradeoffs and keep generation
failure/timeout visible. Keep explicit constraints in every candidate.

Do not equate three displayed cards with three computations. Preserve the existing candidate
generation policy until a cheaper policy is validated. If useful, expose the frozen six-engine
pack as an explicitly experimental comparison mode. It is not a replacement default.

The exact routing trio is also experimental: clearance 4, clearance 22, and port gap 28, with all
other values at defaults. Keep custom source values until a deliberate replacement. High clearance
needs both favorable and adverse witnesses; never label it universally better.

**Proof:** Use architecture-05, cycles-06, routing-06, the high-clearance failures, and an equivalent
pair from the asset corpus. Confirm current output and omitted niche methods remain reachable.
Verify exact source writeback, shared warm history, failure visibility, and Undo. Record actual
candidate-generation cost separately from displayed-card count.

**Docs/example:** Document Compare's current card, tradeoff labels, and More in the editor guide.
Add one favorable and adverse routing example without changing defaults.

**Risk:** Soft ranking misses some text and annotation defects. Keep image inspection and authored
constraints. Do not claim that a numerical winner is always the readable choice.

## 4. Improve measurement before another reduction attempt

**Build small diagnostics; Explore new policies.** Use the archived code as reference material.
Do not make the 387 MB evidence collection part of ordinary fast checks.

Prioritize route/label completion on dense inputs, annotation collisions, text overflow, and the
direction-versus-fit contract. Convert only small decisive witnesses into existing regression
suites. Add phase timing where a timeout currently hides whether layout or routing stalled.

Develop any new selector or preset on the current corpus as development evidence. Use a genuinely
new heldout set, including lanes and cell-access routes. Keep failure denominators, family/tail
results, preference profiles, visual disagreements, and a declared practical-equivalence rule.
Compare runtime and user choice effort as separate costs.

**Proof:** Reproduce the existing failed reduction arithmetic. For a new policy, freeze the rule
before unseen evaluation. Require no new hard-defect case, preserved specialist escapes, and
the declared coverage threshold in each profile. Report strict and relaxed sensitivity bands.
Run `pnpm bench` for desktop budget claims; cloud measurements cannot establish them.

**Docs/example:** Update `docs/CHECKS.md` and the diagram-quality rubric only when a metric changes.
Recompute old/new measurements on the same metric version. Add a small runnable dense-route witness.

**Risk:** Two heldout bases per family cannot establish market prevalence. A failed candidate is
evidence about that candidate and rule, not proof that simplification is impossible.

## Deferred or excluded work

Defer engine deletion, removal of exact source controls, and automatic-default changes. Defer a
universal repair dispatcher and native recipe wizard. Avoid migration/compatibility machinery,
an external layout-library swap, and silent clearing of explicit sides.

Each implementation PR needs its changeset, relevant browser screenshots, `pnpm check:fast` while
iterating, and `pnpm check` before push. Use separate stack layers for the shippable milestones if
implementation is later requested. This research PR stops at the reviewed plan.
