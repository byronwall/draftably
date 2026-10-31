# Sequence explanation implementation plan

Start with the correctness defects in existing syntax. Preserve current graph, source editing, and rendering paths. Add sequence semantics only after geometry is reliable.

This plan records proposed work. It does not start implementation. The [full Pro plan](assets/pro-results/2026-10-30/sequence-implementation-plan.md) supplies detailed fixtures and module contracts. Read it with the [review dispositions](research-summary.md) and [original asset index](assets-index.md).

Baseline: `2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4`. Reconcile later product changes before implementation. Use TypeScript, SolidJS/TSX, and pnpm. Avoid version coexistence and general solver or renderer frameworks.

## M1: correct existing sequences

Outcome: authored order holds, phases describe their actual events, deletion works, and measured ink has space.

1. In `src/dsl/syntax.ts::validateReferences`, validate contiguous phase intervals against edge declaration order. Keep unphased events legal. Reject group message endpoints and empty participant bands. An empty diagram must remain editable and finite.
2. Add a narrow reference cleanup helper in `src/dsl/source-edits.ts`. Use it from `src/dsl/translate.ts` and `src/cli/edit.ts`. Remove deleted messages from phases/states; remove empty phases. Collect incident edge IDs before participant deletion.
3. In `src/dsl/compile.ts::sequenced`, resolve root slots containing groups and ungrouped participants. Apply root order, then member order. Preserve the default group position at its first member.
4. Replace divided label-width estimates with actual interval constraints. Index constraints by their ending lane. Reserve self-loop path and label extents horizontally and vertically. Reuse measurements from `src/model/routes.ts` and `labels.ts`.
5. Fix neutral header outlines through shared color values. In `src/state/actions.ts::chooseTheme`, preserve unrelated appearance fields. Do not rewrite general graph appearance.
6. Prevent sequence dragging from saving ineffective placement hints. Either disable free movement clearly or save an explicit order change.

Acceptance:

- A/C inside G and `order root g b` yields A/C/B. Adding `order g c a` yields C/A/B.
- A phase listing m1/m3 around m2 reports m2 as skipped. Contiguous phases remain valid.
- Deleting m2 from a phase m1/m2/m3 saves a phase m1/m3. Deleting its last member removes the phase. Undo restores exact source.
- The delivered nineteen-M distant-label fixture changes centers 36/116/212 to **36/116/228**. Its span becomes **192**.
- A self-loop at x200 with excursion 36, label offset 4, width 147, and clearance 8 requires the next lane at **395 or greater**.
- A self-row at 100 with a 57-high label requires the following 23-high labeled row at **172 or later** under the supplied envelope contract.
- Theme changes preserve subtitle, notes, legend, and saved states in both file and document modes.

Extend sequence, translation, and existing label tests only for these meaningful boundaries. Update `docs/DSL.md` and `skills/draftably/SKILL.md` together. Add a changeset. Main risk: stricter phase validation exposes misleading existing sources. Report fixes instead of silently splitting phases.

## M2: measure the complete explanation

Outcome: compact headers, readable phase titles, clear distant labels, and equal persistent paint across output paths.

Extract a small pure sequence-layout helper from `compile.ts` when needed. Share routes, label lines, marker extents, phase measurements, and persistent styles with CLI SVG and Solid components. Keep hit targets and selection UI separate.

Use bottom-aligned measured headers. Proposed one-line height is 32 units. Preserve explicit sizes. Bound phase text width at 96 units with 12 units of side padding; wrap titles without ellipsis. Let title or event content determine phase height. Proposed phase gap is 16 units.

For distant messages, choose a clear neighboring-lane slot once from header geometry. Prefer an already fitting slot nearest the span midpoint; break ties left. Grow that gap only as required. The forward solve is linear after constraints exist; naive slot planning can cost O(participants × messages). No optimizer dependency is needed.

Acceptance includes the full ink union inside panel bounds, at least 20 units of panel padding, and equal text/route geometry in CLI, Solid, and static output. The distant-label fixture's later slot-policy target is **36/228/308**. Keep that separate from M1's **36/116/228**.

Inspect the sign-in at actual 900, 1000, and 1100 pixel display widths. Do not confuse raster pixels with logical units. The authored current-language alternative is wider than baseline; it demonstrates useful framing without proving every metric improved.

Main risk: shared paths can conceal different label or marker paint. Extend the existing browser proof to check actual text lines and bounds.

## M3: add explicit event meaning

Outcome: local work, replies, sends, and presented results retain meaning through source edits and exports.

Keep participants and message payloads on existing graph records. Add one source-owned sequence record for mixed event order, explicit message classifications, local actions, phases, and scope if it earns a dedicated field. Do not duplicate endpoints or labels.

The Pro proposal uses `message=interaction|call|send|reply|outcome`, `reply-to=`, and `action`. These spellings are unsupported at baseline. Review them before coding. Reuse frame notes for scope unless a distinct field has a clear product need.

Land parser, compiler, projection, normalization, selection, source translation, CLI editing, rendering, and undo support together. Preserve IDs and unrelated source. A local action must not become a fake participant. Response pairing must be explicit and validate earlier reversed endpoints. Pairing does not imply completion or persistence.

Do not classify existing dashed edges automatically. Preserve the current source literal through unrelated edits. Use narrow source fidelity handling; do not introduce schema versions or parallel formats. Comparison must represent new meanings correctly or reject them explicitly. Copy operations must preserve references or reject unsupported partial copying.

Acceptance: all seven facts survive self-call-to-action conversion, one undo, redo, save, reload, and embedded-source extraction. Invalid pair references fail before save. Multiple explicitly authored replies remain legal. New visible meanings must have static notation and scope text.

Main risk: parser support ships before the translator can retain it. Do not split this vertical slice across independently usable partial releases.

## M4: useful focus and standalone exports

Reuse named emphasis states for explicit event and response focus. Keep lane geometry fixed. An auth action must not highlight every exchange touching Auth service.

Exports retain takeaway, scope, used notation, and order-not-time text. Add an accessible ordered description and keyboard access to equivalent actions. Existing notes can supply framing while semantic controls mature.

Maintain an engineering view and a brief overview. Keep companion participant order consistent. Shared coordinates need shared measurements; equal order alone does not ensure alignment. The failure sketch remains hypothetical with unknown continuation.

Acceptance: reader questions identify hash ownership, returned values, omitted failures, and lack of timing claims. Geometry tests alone cannot prove those outcomes. Main risk: focus creates a false causal story despite stable geometry.

## Explore after the core

Prototype honest phase collapse, readable mobile navigation, one local alternative, explicit parallel operands, and reviewable reorder suggestions separately. Collapse must count hidden events and preserve a visible summary in exports. Never invent a message through hidden work. Defer full UML notation and measured timing.

## Validation and review

Use the [22-fixture corpus](assets/pro-results/2026-10-30/sequence-fixtures.json). Separate observed baseline defects, analytical geometry, and future acceptance cases.

Run affected tests while iterating, then `pnpm check`. Extend existing file/theme browser proofs for sequence behavior. Use `pnpm shoot` and `pnpm audit:compare` for visible layout changes. Await `window.diagramStudio.ready()` before browser geometry reads. Product edits need changesets; DSL edits need guide and agent-skill updates.

Review each implemented milestone independently. Preserve the original reports and visual proposals as research assets. Do not use manual mockup coordinates as renderer golden outputs.
