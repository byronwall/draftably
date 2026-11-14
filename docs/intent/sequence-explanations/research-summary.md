# Sequence diagrams as explanations

Build on the current renderer. First fix ordering, phase integrity, deletion, and label clearance. Then improve measured layout and add explicit local actions and response relationships. Keep the seven sign-in facts and four participants. Use three authored phases, a clear takeaway, and visible success scope.

This is a research decision and implementation proposal. Product behavior has not changed. Implementation needs a separate request.

- [Implementation plan](implementation-plan.md)
- [All original Pro results](assets-index.md)
- [Full design report](assets/pro-results/2026-10-30/sequence-design-report.md)
- [Source note](source-note.md)
- [Pro conversation](https://chatgpt.com/c/6ae555db-ae90-83e9-aaeb-2334c9842b57)

## What changes the decision

The note describes an older-looking diagram. The baseline already has continuous shafts, above-line wrapped labels, narrow headers, muted accents, attached self-loops, and phase bands. Rebuilding these would waste effort.

The important remaining problems affect meaning and editing:

| Finding                                       | Local review                                                                     | Proposed repair                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Group order is ignored                        | A/C inside G with `order root g b` draws B/A/C. Reproduced with the CLI.         | Resolve root slots, then group member order.                                        |
| Phase bands can include unlisted events       | Interleaved memberships compile. Source uses minimum/maximum rows for the band.  | Require contiguous, disjoint authored intervals.                                    |
| Deleting a phase member fails                 | A contiguous two-message phase fails CLI deletion with `Unknown message m1`.     | Clean phase/state references in the same transaction.                               |
| A distant label violates its width constraint | Lane centers are 36/116/212. The endpoint span is 176; the required span is 192. | Use actual earlier centers. The M1 target is 36/116/228.                            |
| The hash-check label crosses the store lane   | Baseline image and route formulas confirm the overlap.                           | Reserve the complete self-message envelope.                                         |
| Theme changes discard framing fields          | `chooseTheme` replaces the appearance object.                                    | Preserve unrelated fields directly; prove file and document persistence separately. |

The self-label is inside the baseline panel. Describe this as a clearance defect, not clipping. File-session validation rejects invalid deletion rather than saving corrupt source.

## Recommended direction

Keep graph nodes as participants and graph edges as message payloads. A small sequence record can own mixed event order, local actions, phases, and explicit response relationships. Derived layout must not become the owner of meaning.

Distinguish a generic interaction, synchronous call, asynchronous send, reply, and presented outcome. Convert a self-message to local work only when the author chooses it. Do not infer response pairs from direction or dashes.

`kind=async` currently controls dashes and has conflicting guidance. Preserve its present meaning during unrelated edits. A future semantic change must be explicit. Do not add schema versions, dual parsers, or migration services. The proposed literal-preservation field addresses an existing source boundary; it is not a reason to build a compatibility system.

Use content envelopes for row spacing and self-loop clearance. Add phase spacing after measuring each phase title and event block. Keep participant order stable. A later clear-slot policy can stop distant labels from crossing intermediate lifelines. Its geometry intentionally differs from the first interval repair.

Exports should show the takeaway, scope, used notation, and that spacing indicates order. Reuse existing frame notes first. Decide whether a dedicated scope field adds enough value during the semantic milestone. New warnings should explain concrete ambiguity or overflow, not enforce a generic completeness checklist.

## Recommendation dispositions

The [original register](assets/pro-results/2026-10-30/sequence-recommendations.md) gives evidence and acceptance criteria for all 26 IDs. This review adopts its groups with these limits:

| IDs       | Disposition | Reason and boundary                                                                                                |
| --------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| SEQ-01–06 | Build       | Repair reproduced defects and source-confirmed risks in existing behavior.                                         |
| SEQ-07–08 | Build       | Share measured sequence values; avoid a general rendering framework.                                               |
| SEQ-09    | Build       | Make framing visible and accessible. Reuse existing notes before adding a second scope mechanism.                  |
| SEQ-10–13 | Build       | Plan a complete semantic editing slice. Proposed names and storage fields remain subject to implementation review. |
| SEQ-14–16 | Build       | Reuse named focus, retain clear companion views, and test meaningful invariants.                                   |
| SEQ-17–21 | Explore     | Prototype collapse, mobile context, limited fragments, and reviewable reordering separately.                       |
| SEQ-22–23 | Defer       | Full UML and measured timing do not solve the supplied explanatory problem.                                        |
| SEQ-24–26 | Avoid       | Do not guess semantics, replace the working renderer, or optimize one geometry score.                              |

“Build” means included in the plan. It does not approve implementation or shipment.

## Sources and confidence

Local review confirmed the decisive code paths and reran four failure cases. The baseline image matches Pro's preserved copy byte for byte. Both JSON companions parse. All six visual categories were inspected in a contact sheet. The current-language example passes the actual CLI checker.

[D2](https://d2lang.com/tour/sequence-diagrams/) supports reuse of ordinary diagram primitives under sequence rules. [C4](https://c4model.com/diagrams/dynamic) supports choosing selective interaction views. These support the direction; neither proves this proposed layout works.

The [Nickerson/Corter paper](https://www.tc.columbia.edu/faculty/jec34/faculty-profile/files/ntendedinteractionstodesigninformationsystems..pdf) supports taking participant order seriously for a specific inference task. It does not justify universal comprehension claims or silent reordering. Pro also reviews Mermaid, PlantUML, OMG semantics, and exploration research with stated limits.

Pro ran 52 selected tests. The local full `pnpm check` also passed with approved browser/port access before collection. The final run record records checks after integration. Pro's PNG companions use SVG rasterization; they do not prove live browser parity. Manual proposals and future-language files remain clearly marked.

## Open choices

The first correctness work needs no further design decision. Later work must test the proposed header height and phase gutter across themes. Review whether explicit call controls and a separate scope declaration earn their added UI. Keep the failure companion hypothetical until real failure behavior is supplied. Keep semantic comparison honest: implement a small complete comparison slice or reject unsupported input explicitly.
