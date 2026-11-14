# Sequence diagrams as explanations

Make a sequence diagram explain an exchange: correct order and phases, measured layout, and
messages that say what they are. The plan came from a Pro research run on 30 October 2026.

Status on 14 November 2026: milestones M1 to M4 are shipped. Each committed milestone of the plan
is done. The Explore list and the deferred items stay open; none of them has a build commitment.

- [Implementation plan](implementation-plan.md), with the status of each milestone
- [Research summary and dispositions](research-summary.md)
- [Initiative map](initiative-map.json)
- [Original Pro results](assets-index.md): the full report, the detailed plan, 26 recommendations
  and 22 fixtures
- [Source note](source-note.md), [baseline review](baseline-review.md), [prompt](pro-prompt.md)
  and [run record](run.md)

## What shipped

| Milestone                        | Status    | Where                                                    |
| -------------------------------- | --------- | -------------------------------------------------------- |
| M1: correct existing sequences   | Completed | PR #386, with PR #397 and PR #398                        |
| M2: measure the whole drawing    | Completed | PR #560                                                  |
| M3: explicit event meaning       | Completed | PR #560                                                  |
| M4: focus and standalone exports | Completed | PR #560                                                  |
| Notes on messages                | Completed | PR #388                                                  |
| Mermaid sequence import          | Completed | PR #389; kinds, `answers=` and bars in PR #560           |
| Activation bars                  | Completed | PR #560. The plan deferred them; Byron added them later. |

The language is in [docs/DSL.md](../../DSL.md#sequence-diagrams) and the code map in
[docs/ARCHITECTURE.md](../../ARCHITECTURE.md).

## Decisions made while building

- **Spellings.** `message=interaction|call|send|reply|outcome`, `action id participant "label"`,
  and `answers=id` in place of the plan's `reply-to=`. Byron wants no dash in a new word.
  `answers=` alone makes a reply.
- **No `scope` statement.** The plan left this open: reuse notes unless a field has a clear need.
  A `footnote` states the scope, and the examples do so. A second way to say it adds nothing.
- **The order caption is fixed.** Each sequence draws "Rows show order, not elapsed time." in its
  key. An author cannot remove it, as the plan asks.
- **An action is an edge with a kind**, from a participant to itself, not a separate record. The
  plan sketched a separate sequence record. One record keeps order, phases, states, notes,
  deletion and renaming on one path.
- **Marks.** A call has a solid head and a send leaves a dot on its sender. The plan asked only
  for a visible cue.
- **Compare refuses kinds.** `draftably compare` refuses a file with `message=`, `answers=` or
  `action`, as the plan asks, because change marks cannot show a change of kind.
- **Moves are explicit.** The editor moves a message one place at a time. It refuses a move that
  puts a reply above its message or splits a phase. It never changes a phase to follow a move.
- **Pair focus.** A selected call shows its replies, and a selected reply shows its call, from
  `answers=` only. Named emphasis states keep their rule: they list what is in focus.
- **Activation bars** are off by default (`layout root sequence activations=on`). A bar runs from
  a call to the last reply that answers it. Without a reply it ends at the participant's next
  message, or it is a short stub.

## What remains

None of these has a build commitment.

- **Explore:** phase collapse with a count of hidden events, navigation on a phone, one local
  alternative, parallel operands, and order suggestions (SEQ-17 to SEQ-21).
- **Fragments** (`alt`, `opt`, `loop`): out of scope by Byron's decision on 14 November 2026. The
  Mermaid import still turns each top-level branch into a phase band and warns.
- **Deferred:** the full UML notation and measured time (SEQ-22, SEQ-23).
- **Reader questions** (SEQ-16): no reader study was run. Tests cover geometry and meaning only.
- **Activation import limits.** The Mermaid import turns bars on only when each bar in the source
  runs from a call to its reply. A bar from a bare `activate` line stays off, with a warning. A
  dotted line with a cross, no arrowhead or two arrowheads becomes a reply with a plain arrowhead.
- **Editor.** A new message is not selected after Tab. A sequence in a document that is not a
  file cannot add or move messages. The Inspector still shows port fields for a message.
- **Comparison of kinds.** A before and after view of a change of kind is not built.
