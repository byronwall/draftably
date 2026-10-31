# Sequence design recommendations

**Decision.** Improve Draftably’s sequence explanations through a small semantic layer and deterministic, measured layout. Repair the existing order, phase, edit-cleanup, and label-envelope defects first; then add explicit local work, response identity, visible scope, and shared rendering contracts. Preserve the four participants and seven sign-in facts. Build only the distinctions needed to explain them, and keep exploration features separate from the static figure’s meaning. The proposed syntax and behavior remain unimplemented. **Build means proposed plan scope, not approval to implement, merge, deploy, or ship.**

Baseline: `2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4`. This register complements [sequence-design-report.md](sequence-design-report.md) and [sequence-implementation-plan.md](sequence-implementation-plan.md). The report contains the full evidence and limits; the plan owns exact implementation contracts. Recommendation IDs are stable and should be retained in implementation and review notes.

## Dispositions

- **Build:** included in the staged proposed plan, with concrete acceptance criteria.
- **Explore:** a bounded prototype or reader comparison; no production grammar is promised.
- **Defer:** potentially useful, but outside the present explanatory need.
- **Avoid:** reject this approach because it undermines an explicit design constraint.

## Build: repair existing behavior

### SEQ-01 · Build · Phase integrity and reference cleanup

**Reason:** legal-looking phase memberships can produce misleading overlapping bands, and deleting a phased event can fail source revalidation.

- **Consequence and acceptance:** M1 validates disjoint contiguous event intervals, removes deleted references atomically, and removes emptied phases. A phase containing e1/e3 around another phase’s e2 must be rejected. Deleting an event must save and undo successfully without a dangling phase reference.
- **Evidence:** `validateReferences`, `sequenced`, `translateEdit`, and source-reference cleanup in [syntax.ts][R1], [compile.ts][R2], [translate.ts][R3], and [source-edits.ts][R4]; executed probes in report §2.1.

### SEQ-02 · Build · Honor hierarchical participant order

**Reason:** the sequence pass currently ignores valid root group ordering and member order while packing groups contiguously.

- **Consequence and acceptance:** M1 resolves the existing declaration/order hierarchy directly. For A/C inside G and B at root, `order root g b` must put G’s members before B; authored member order must hold. No second participant-order language is needed.
- **Evidence:** `sequenced` and parser order validation in [compile.ts][R2] and [syntax.ts][R1]. Preserve group boundaries and all explicit author intent.

### SEQ-03 · Build · Enforce actual interval widths

**Reason:** dividing a distant label requirement by its span does not ensure the accumulated endpoint distance meets that requirement.

- **Consequence and acceptance:** M1 solves forward center-distance constraints against actual earlier centers. The executed small-header fixture changes centers `36,116,212` to **`36,116,228`** for a 176-unit padded label plus 16-unit endpoint clearance. Assert the full interval after rounding.
- **Evidence:** `sequenced` in [compile.ts][R2] and `edgeLabelSize` in [labels.ts][R5]; report §5.2. This does not require a general constraint solver.

### SEQ-04 · Build · Reserve self-message envelopes and panel bounds

**Reason:** the baseline’s attached four-point self-loop is already present, but its side label is not reserved against the neighboring lifeline.

- **Consequence and acceptance:** M1 reserves the loop, label, stroke and marker horizontally and vertically. Keep the baseline’s four attached points. Include a rightmost loop’s label in the inner panel. The measured baseline hash-check label must stop crossing the User store lane.
- **Evidence:** `messageRoute`/`drawRoutes` in [routes.ts][R6], `sequenced` in [compile.ts][R2], and bounds handling in [bounds.ts][R7]. Do not misreport existing export expansion as clipping.

### SEQ-05 · Build · Correct neutral header contrast

**Reason:** the baseline’s muted header treatment exists, but automatic white accent styling makes Web app’s border disappear against the light fill.

- **Consequence and acceptance:** M1 gives neutral sequence participants a visible neutral outline without assigning semantic meaning to decorative color. Verify all themes, and keep authored nonneutral accents intentional.
- **Evidence:** `drawnSwatch`/`participantAccent` in [colors.ts][R8] and the supplied baseline render. This is a contrast repair, not a new color taxonomy.

### SEQ-06 · Build · Preserve explanation metadata across appearance edits

**Reason:** replacing the appearance object can discard subtitle and other framing fields during a theme change.

- **Consequence and acceptance:** M1 preserves unrelated appearance properties directly. Verify subtitle, heading width, notes, legends and named states through document mode, file-backed translation, reload and undo; distinguish actual source loss from projection restoring unchanged declarations.
- **Evidence:** `chooseTheme` in [actions.ts][R9], appearance translation in [translate.ts][R3], and the report’s exact-ref analysis.

## Build: measured layout and rendering

### SEQ-07 · Build · Share sequence geometry and persistent paint

**Reason:** separately maintained CLI and Solid edge/header paint can diverge despite using the same diagram data.

- **Consequence and acceptance:** M2 uses one narrow sequence helper for geometry, labels, markers, phases and persistent styles. CLI SVG and Solid static output agree; selection handles remain UI-specific. M1 fixes must land without requiring a renderer rewrite.
- **Evidence:** `sequenceBackdrop`/message rendering in [svg.ts][R10], [EdgeView.tsx][R11], and [Lifelines.tsx][R12]. Validate actual browser/PNG parity during implementation; this mission did not prove it.

### SEQ-08 · Build · Compact headers, bounded phases and clear label slots

**Reason:** measured text should control local space, while participant headers and long phase titles should not dominate the explanation.

- **Consequence and acceptance:** M2 bottom-aligns measured headers, caps the phase text gutter at 96 logical units, wraps without ellipsis, grows phase height for its title, and uses a 16-unit phase gap. Distant labels occupy a clear neighboring-lane slot chosen once from base geometry. Test the already-fitting off-center slot and keep M1/M2 geometry expectations distinct.
- **Evidence:** [compile.ts][R2], [labels.ts][R5], [routes.ts][R6]; report §§5.3–5.5. These dimensions are proposed design values, not research standards.

### SEQ-09 · Build · Visible scope, notation and accessible description

**Reason:** an exported figure must state its scope and notation without requiring hover, source comments or surrounding prose.

- **Consequence and acceptance:** M3/M4 preserve authored scope and emit a used-notation key plus an order-not-elapsed-time statement. The sign-in view visibly identifies success-only coverage. SVG title/description supplements the visible text; PNG retains the visible explanation.
- **Evidence:** existing frame/appearance support in [svg.ts][R10] and [appearance.ts][R13]; [Mermaid’s official accessibility guidance][S1]. Metadata is not a substitute for visible scope.

## Build: explicit meaning and source fidelity

### SEQ-10 · Build · A small typed hybrid

**Reason:** generic edges and numeric row geometry cannot preserve actions, authored message meanings or mixed event order through editing.

- **Consequence and acceptance:** M3 keeps ordinary node/edge payloads and adds source-owned event order, actions, phases, scope and a **sparse classifications map containing only explicitly authored new meanings**. Legacy edges are absent from that map and retain their old styling/literal kind until deliberately classified. Typed paint overrides styling only after that action. No DSL version fork or broad normalization framework.
- **Evidence:** [types.ts][R14], [project.ts][R15], [document.ts][R16], and the mismatch between the [DSL][R17] and [agent skill][R18]. [OMG interaction semantics][S2] informs distinctions, not a claim of UML conformance.

### SEQ-11 · Build · Explicit response identity

**Reason:** reverse direction and dashed styling cannot reliably identify which exchange a response answers.

- **Consequence and acceptance:** M3 validates `reply-to` against an earlier interaction/call/send with reversed endpoints. Reject forward, absent and wrong-endpoint targets, and targets that are replies, actions or outcomes. **Multiple explicitly paired replies are allowed.** An unpaired reply remains possible with a review diagnostic. Pairing never promises job completion, persistence or blocking; a response to an informal interaction remains informal.
- **Evidence:** current dash-only projection in [project.ts][R15]; [PlantUML’s activation-based return behavior][S3] is a comparison, not the chosen pairing mechanism.

### SEQ-12 · Build · Local actions and presented outcomes

**Reason:** “check password hash” and “signed in” answer different responsibility questions from network-style requests.

- **Consequence and acceptance:** M3 introduces an authored action on its participant’s lane and an explicit presented-outcome meaning. Reserve action clearance on both sides. Keep the seven original facts; never automatically turn every self-call into an action or treat a human outcome as token transport.
- **Evidence:** the supplied `login-sequence.draft`, source note §§7/11/12, and current self-message routing in [routes.ts][R6]. The conversion is an author decision.

### SEQ-13 · Build · Source transactions and undo

**Reason:** semantics are useful only if they survive the full parser-to-editor-to-source path and can be reversed safely.

- **Consequence and acceptance:** M3 updates parse/project/normalize/translate together. Event edits preserve IDs, order, classifications, legacy kind literals, comments, scope, phases and pairing. Delete operations clean references in one transaction. Reordering edits source intent rather than meaningless pins. Undo restores the recorded before-source; selection survives recompilation by ID.
- **Evidence:** [syntax.ts][R1], [project.ts][R15], [document.ts][R16], [translate.ts][R3], and [file-session.ts][R19]. This is semantic fidelity, not a promise that formatting never changes whitespace.

### SEQ-14 · Build · Response-aware named focus

**Reason:** Draftably already has emphasis states, so useful sequence focus can extend existing machinery.

- **Consequence and acceptance:** M4 highlights an event, its explicit response relationships and participants, while retaining context and lane geometry. A visible caption explains exported focus. Multiple replies are handled from the authored pairing map; no nearest-arrow guess. Temporary selection does not mutate semantics.
- **Evidence:** named-state rendering in [svg.ts][R10] and [appearance.ts][R13]; context-preserving exploration in [Sharp and Rountev][S4]. That paper motivates the prototype direction, not a proven comprehension benefit here.

### SEQ-15 · Build · Engineering, overview and honest companions

**Reason:** the same sign-in facts support different reader questions, while a failure path cannot be verified from success-only evidence.

- **Consequence and acceptance:** maintain the detailed seven-fact view and a separate brief overview. Use consistent participant order in companions. The supplied failure scaffold remains explicitly hypothetical with unknown continuation until evidence supplies it. Exact x alignment requires shared measured geometry, not merely matching order.
- **Evidence:** source note §§8/12/13, supplied example, and [C4’s selective dynamic-diagram guidance][S5]. Do not invent authentication transport, storage or rejection behavior.

### SEQ-16 · Build · Adversarial fixtures and reader questions

**Reason:** geometry alone cannot detect a reader inferring unshown latency, ownership or completion.

- **Consequence and acceptance:** retain the exact counterexamples and check message/action bounds, phase intervals, hierarchy, deletion, source undo and render parity. Review readers’ answers about hash ownership, returned values, omitted errors and timing. Keep execution evidence separate from proposed tests; the 52 passing baseline tests do not validate future features.
- **Evidence:** existing sequence/label/translation suites, report §9, and the task-specific results and limits of [Nickerson/Corter][S6] and [Kutar/Britton/Barker][S7]. No outside-demand gate is added.

## Explore: bounded prototypes

### SEQ-17 · Explore · Honest phase collapse

**Reason:** reducing visible detail can help exploration only if omission remains unmistakable.

- **Prototype acceptance:** after M3/M4, replace Verify with an explicit “3 events hidden” marker, preserve original numbering and horizontal geometry, and retain participant/boundary context. The summary is not a synthetic message and must survive static export. Decide saved-view syntax only after testing the interaction.
- **Evidence:** existing phases and states; [Sharp/Rountev][S4] describes collapsed placeholders. Its experience does not establish a quantitative benefit for this design.

### SEQ-18 · Explore · Mobile context at readable scale

**Reason:** shrinking the desktop figure to phone width makes the labels too small; zoom alone can lose endpoints.

- **Prototype acceptance:** after stable layout, compare horizontal navigation with a sticky participant strip and an endpoint detail panel. Verify keyboard/touch access, context and unchanged semantic order. Treat reader findings as local evidence. Static exports must still explain themselves without these controls.
- **Evidence:** report §6’s explicit scaling calculations and [Sharp/Rountev’s exploration problems][S4]. No phone-width or universal text-size standard is inferred.

### SEQ-19 · Explore · One local alternative

**Reason:** a small choice may explain a scenario, but multiple nested branches can obscure the main reading path.

- **Prototype acceptance:** depend on M3’s event ownership. Author explicit guards and operand membership; distinguish the operator from editorial phases. Start with one shallow choice and compare a separate companion/decision table. Do not add `alt` to the production grammar through a styled phase name.
- **Evidence:** official [Mermaid][S8], [PlantUML][S3] and [OMG][S2] constructs; the recommendation is a scoped design choice.

### SEQ-20 · Explore · Explicit parallel operands

**Reason:** when overlap is the question, row positions and phase labels cannot honestly encode it.

- **Prototype acceptance:** only after M3, model ordered events per operand and author cross-operand constraints separately. Validate dependency contradictions. Distinguish possible interleaving from measured simultaneous execution; avoid assuming phase-end synchronization. Formal occurrence-level fidelity requires an explicit further decision.
- **Evidence:** [OMG §§17.6.3.10–12][S2] and current `SequenceLayout` in [types.ts][R14]. Keep this out of the first production grammar.

### SEQ-21 · Explore · Reviewable reorder suggestions

**Reason:** lane order can affect a task, but silent optimization would undermine author intent and companion stability.

- **Prototype acceptance:** suggest only after measuring the explanatory benefit on a difficult case. Preview changed lanes, honor group boundaries, and apply one undoable source-order edit. Keep the sign-in order unchanged. Do not optimize a set of companions independently.
- **Evidence:** hierarchical order in [compile.ts][R2] and the limited topology-inference experiment of [Nickerson/Corter][S6]. It is not evidence that dynamic reordering universally improves understanding.

## Defer

### SEQ-22 · Defer · The full UML notation catalog

**Reason:** activation bars, object lifecycle, gates and deeply nested fragments do not resolve this example’s remaining defects.

- **Consequence:** add none merely for notation completeness. Revisit when a specific explanation needs the distinction and its source/editor/export meaning can be specified. Keep explicit calls usable without mandatory activation bars.
- **Evidence:** current useful sequence subset and source note §§2/14; [OMG chapter 17][S2] defines a substantially larger semantic system than this product needs now.

### SEQ-23 · Defer · Measured time and latency

**Reason:** no timestamps or durations in the supplied source support a performance interpretation.

- **Consequence:** retain order-not-time framing. Revisit measured timing only with real units, timestamps, uncertainty and a suitable trace/timing representation. Never infer duration from row gaps or arrow length.
- **Evidence:** source note §10 and [OMG lifeline semantics, §17.3.3.1][S2]; current numeric rows are layout coordinates.

## Avoid

### SEQ-24 · Avoid · Recovering semantics from appearance or proximity

**Reason:** guessing phases, response pairs, asynchronous work or completion would turn ambiguous input into false certainty.

- **Acceptance:** semantic edits require explicit source or author action. Legacy dashed edges stay unclassified. Phase gaps are not barriers; return values do not prove persistence; collapse does not synthesize communication.
- **Evidence:** dash-only projection in [project.ts][R15], conflicting async guidance in [DSL][R17]/[skill][R18], and the distinction between interaction and occurrence semantics in [OMG][S2].

### SEQ-25 · Avoid · Wholesale renderer/model replacement

**Reason:** a second sequence product or broad adapter layer would spend the project’s effort recreating working source, editor and export behavior.

- **Acceptance:** extend the direct TypeScript/SolidJS/pnpm boundaries. Reuse graph payloads, deterministic fonts, source history and emphasis. Introduce only the small sequence semantics and geometry needed by the accepted milestones.
- **Evidence:** [ARCHITECTURE.md][R20] and the existing compile/project/translate pipeline; [D2’s reuse of ordinary diagram primitives][S9] is relevant prior art, not a replacement recommendation.

### SEQ-26 · Avoid · Single-score optimization and automatic shrink-to-fit

**Reason:** minimum area or message length can improve a score while weakening meaning or reducing text below useful reading size.

- **Acceptance:** diagnose effective text size, conflicting labels and expansion causes; offer wrapping, edited labels or a companion view. Preserve meaningful information and stable order. Never silently truncate, shrink all type, or claim a lower geometry score proves comprehension.
- **Evidence:** repository quality rubric and report §§6/9; the task dependence in [Kutar/Britton/Barker][S7] supports testing actual questions rather than universal rankings.

## Delivery and validation boundary

All 26 recommendations are research decisions. No product implementation was performed. Baseline probes, documentary verification and artifact checks are reported in the main report; proposed-language compilation, new browser behavior, new source/undo proofs and reader studies remain implementation work. Product/example changes require a changeset, and DSL changes require matching updates to `docs/DSL.md` and `skills/draftably/SKILL.md`, under the repository’s existing checks.

## Primary sources

- [Mermaid accessibility][S1]; [Mermaid sequence syntax][S8].
- [PlantUML sequence diagrams][S3]; [D2 sequence diagrams][S9].
- [C4 dynamic diagrams][S5].
- [OMG UML 2.5.1, official normative PDF][S2], chapter 17.
- Richard Sharp and Atanas Rountev, [Interactive Exploration of UML Sequence Diagrams][S4] (2005).
- Jeffrey V. Nickerson and James E. Corter, [Clarity from Confusion: Using Intended Interactions to Design Information Systems][S6] (2009).
- Maria Kutar, Carol Britton and Trevor Barker, [A Comparison of Empirical Study and Cognitive Dimensions Analysis in the Evaluation of UML Diagrams][S7] (2002).

[R1]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/syntax.ts
[R2]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/compile.ts
[R3]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/translate.ts
[R4]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/source-edits.ts
[R5]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/labels.ts
[R6]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/routes.ts
[R7]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/bounds.ts
[R8]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/colors.ts
[R9]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/state/actions.ts
[R10]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/cli/svg.ts
[R11]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/components/scene/EdgeView.tsx
[R12]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/components/scene/Lifelines.tsx
[R13]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/appearance.ts
[R14]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/types.ts
[R15]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/project.ts
[R16]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/document.ts
[R17]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/docs/DSL.md
[R18]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/skills/draftably/SKILL.md
[R19]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/state/file-session.ts
[R20]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/docs/ARCHITECTURE.md
[S1]: https://mermaid.js.org/config/accessibility.html
[S2]: https://www.omg.org/spec/UML/2.5.1/PDF
[S3]: https://plantuml.com/sequence-diagram
[S4]: https://citeseerx.ist.psu.edu/document?doi=f7309c396b3bc0ff17cd0f8acf30a89e1eef26c2&repid=rep1&type=pdf
[S5]: https://c4model.com/diagrams/dynamic
[S6]: https://www.tc.columbia.edu/faculty/jec34/faculty-profile/files/ntendedinteractionstodesigninformationsystems..pdf
[S7]: https://www.ppig.org/files/2002-PPIG-14th-kutar.pdf
[S8]: https://mermaid.js.org/syntax/sequenceDiagram.html
[S9]: https://d2lang.com/tour/sequence-diagrams/
