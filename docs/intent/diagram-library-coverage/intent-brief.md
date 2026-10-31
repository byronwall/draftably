---
title: 'Diagram library coverage'
slug: 'diagram-library-coverage'
phase: intent
status: draft
last_updated: '2026-10-30'
---

# Diagram library coverage

## My read

You asked which diagram types and features draftably should gain next. You did not ask for parity:
the research prompt says not to turn frequency into a demand to copy every competitor.
[PR 221](https://github.com/byronwall/draftably/pull/221) answers with five bets. Those bets are
agent-authored recommendations. They are not your decisions yet, and "Build" in that PR means
"include in a plan".

The durable goal that I can recover is this: a person and an agent share one readable `.draft`
file, and the drawing says what it means without prose workarounds. A drawing must never claim
something false. That second part is why the comparison defect outranks every new feature.

The audience for each bet is not settled. The comparison work serves an automated PR summary tool
in another repository. The schema and sequence work serves hand-written technical documents. These
jobs compete for the same language surface.

## What matters most

- A comparison must not misstate what changed. This protects a feature that the research could
  not find natively in any of the 15 alternatives.
- Keep the source compact and easy for an agent to write. Each new word costs the DSL guide, the
  skill and the round trip.
- Depth in current diagrams comes before new diagram families.
- Layout quality stays the standing bar. [FEEL.md](../diagram-quality/FEEL.md) is the tie-breaker.

## The behavior you appear to want

Someone runs `draftably compare` on two versions. The result is either true or it says what it
left out. Later, a schema or sequence diagram states its meaning in the language: what an edge
end means, and which messages are alternatives. Nobody needs to read a subtitle to get this.

## Boundaries

### Must be true

- Plain edges and existing files keep their meaning.
- CLI and browser share one geometry.
- A language change updates the DSL guide, the skill, an example and a changeset in one PR.

### Must be avoided

- Parity as a goal. Full BPMN, full UML, Gantt, Sankey and foreign-format import stay out for now.
- Arbitrary HTML, embedded scripting and a framework rewrite.
- A generic comparison framework before small cases need one.

## What seems settled

- Research is not approval to implement.
- `kind=async` keeps its dashed meaning unless you decide otherwise.
- A note never moves the layout. Notes shipped this way in PR 282, which answers one of the
  research's open questions.

## Possibilities, not decisions

- The rank order. The scores are judgments, and the top-five gap is small.
- All syntax sketches in the Pro report: `role=`, `data-type=`, `key=`, `port`, `view`,
  `activation` and `start-head=`.
- Fragments as an extension of `phase`.
- Typed field rows and named ports, which arrived bundled with endpoint markers.

## Current reality that matters

- The research baseline is 118 commits behind `main`. Notes and viewer PDF export shipped after
  it, so two of its judgments are out of date.
- The comparison defect is on `main` and is wider than the PR reports. See
  [the PR review](pr-221-review.md).
- Real diagrams give thin support to the schema and sequence bets. Of 93 corpus, held-out and
  example files, one uses a sequence, four use cells, and none has PK/FK or cardinality text. The
  corpus was built to test layout, so this is a weak signal, not proof of low demand.

## What still needs your input

1. What does a Before panel promise?
2. Which job leads the language work: PR review, hand-written technical documents, or adoption?
3. How should PR 221 land, given that it is stale, conflicted and red?

## Next step after confirmation

Shape the comparison slice first. It needs no new grammar and does not depend on the other bets.
