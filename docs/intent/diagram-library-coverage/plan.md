---
title: 'Diagram gap plan'
slug: 'diagram-library-coverage'
phase: plan
status: active
last_updated: '2026-11-01'
---

# Diagram gap plan

Byron chose this direction on 2026-11-01, after the [PR 221 review](pr-221-review.md). This file
is the current decision. Where the review or the research disagrees with it, this file wins.

## Decisions

- **Lead job:** make diagrams top notch. Rank each gap by how much it improves the drawing.
- **PR analysis:** it may move to a separate static analysis repository. Do not add `compare`
  work for that tool here. `compare` work stops when its output is true.
- **Before panels:** honest now, faithful next. First report each difference the panels don't
  draw. Then draw real old values for shape, count and message order.
- **PR 221:** merge it without a refresh. Its stale claims stay until retirement.
- **Retirement:** after the slices land, reconcile this initiative with the code and record the
  residuals.

## Slices, in order

| #   | Slice                   | Scope                                                                                                             | Status    |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Comparison honesty      | Any parsed field marks a line `~`. `compare` lists changes with no old version. No new grammar.                   | In review |
| 2   | Sequence correctness    | PR 331 M1: group order, contiguous phases, deletion of a phased message, label clearance. No new grammar.         | In review |
| 3   | Endpoint markers        | A small marker set. Plain edges keep their meaning. DOT and Mermaid imports use the markers instead of a refusal. | In review |
| 4   | Notes on messages       | `note … near=m1`, and the sequence text in `docs/DSL.md`.                                                         | In review |
| 5   | Mermaid sequence import | Your 20 Mermaid sequences come across. `alt` and `loop` need a mapping or a clear refusal.                        | In review |
| 6   | Faithful Before panels  | Real old values for shape, count and message order.                                                               | In review |

Slice 2 comes before the new language because it fixes meaning in a family that you use often.
Slice 5 follows 2 and 4, so that imported sequences land on a correct renderer. Slice 6 is last
because slice 1 makes the panels honest, and PR analysis is no longer the lead job.

Each slice is one PR. A language change also updates the DSL guide, the skill, an example and a
changeset. [FEEL.md](../diagram-quality/FEEL.md) stays the test for layout, routing and color.

## Evidence behind the order

Counted on 2026-11-01 from 123 diagrams in Byron's own projects:

| Kind      | Diagrams |
| --------- | -------- |
| Flowchart | 79       |
| Sequence  | 20       |
| Wireframe | 11       |
| ER/schema | 3        |
| State     | 3        |
| Other     | 7        |

Those 94 Mermaid, DOT and D2 blocks hold 3 `alt`, 1 `loop`, and no `Note`, `activate`, `opt` or
`par`. They hold no `<|--`, `*--` or `dir=both`. Crow's-foot ends appear only in 3 ER diagrams.
So sequence correctness has direct demand. Endpoint markers get their demand from the importers,
which now refuse `--o`, `--x`, `<-->`, `arrowhead=` and `dir=both`.

Nothing in these projects calls `draftably compare`. The landing page still promises
"Review a change as a picture", so slice 1 fixes a public claim.

## Out of this plan

These stay below the line. Reopen one only with a real diagram that needs it.

- Sequence fragments. PR 331 keeps them as an exploration.
- Typed field rows, cardinality and named ports. Three ER diagrams don't justify them yet.
- Views, rich text and icons.

## For retirement

Retire this initiative after the stack merges. These items stay open until then:

- Decide whether `run.md` stays. It holds local paths and heartbeat notes in a public repository.
- Keep one CSV set. `docs/research` and `assets/pro-results` both hold one.
- Close PR 116 if slices 1 and 6 cover its semantic signature idea.
- Close or rebase PR 331. Slice 2 builds its first milestone, and M2 to M4 stay open there.
- Check these limits, which the slices report but don't fix:
  - A crossing halo can cut a short marked line.
  - An old label taller than its new one can crowd its row in a Before panel.
  - The Inspector still shows pin and position fields for sequence participants.
  - `writeArrangement` can still write `stay` hints from a layout pass.
  - `#` still starts a comment inside a bare word, so an unquoted URL fragment is lost.
  - A compare panel keeps the empty side margin of a message note, because panels draw notes in the frame.
