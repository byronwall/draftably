---
title: 'Comparison source fidelity: review contract'
phase: research
status: proposed
last_updated: '2026-10-26'
origin: repo-reading-brief
source_edition: '2026-10-26'
source_url: 'https://chatgpt.com/space/page_2001ade04fc48191b5d74a298bfd3b64'
topic_id: draftably.comparison-source-fidelity.v1
artifact_type: assistant-generated-research
activity_ranking: excluded
---

# Comparison source fidelity: review contract

**Research only.** This note proposes review questions and future fixtures; it changes no
application code, DSL, tests, or benchmark. The comparisons below have not been executed.
Static inspection supplies a candidate failure mechanism, not a reproduced bug.

Source: [Repo Reading Brief, October 26, 2026](https://chatgpt.com/space/page_2001ade04fc48191b5d74a298bfd3b64).

## Why this is not another comparison implementation plan

[PR 106](https://github.com/byronwall/draftably/pull/106) already owns the union-layout proposal
and the broad fixture plan. [PRs 107–114](https://github.com/byronwall/draftably/pull/114) already
implement headings, change marks, ID-matched merging, projected panels, PNG output, panel fitting,
counts/links, and panel direction on an open draft stack. They were unmerged when checked on
October 26. The snapshot inspected here is top-of-stack
`94354445fcdaf4f18edf237dbe491cb7867a3c94`; the default branch is
`fd5310c8009cb99d4bd7e8bdc6a1d6e188d10db8`.

The existing plan calls for a connectivity-change fixture and exact alignment of unchanged nodes.
This supplement adds a narrower prerequisite: a panel labelled **before** must encode the agreed
before-state relationships, not merely share positions with the after panel.
It does not prescribe another layout engine, compaction policy, or benchmark corpus.

The [earlier daily-brief routing note, PR 105](https://github.com/byronwall/draftably/pull/105),
covers constrained placement/routing evaluation, family holdouts, and edit-order probes. This
topic is different: preservation of the two source models through a comparison representation.
Reviewed recent open, closed, and merged PR metadata did not reveal a separate source-fidelity
investigation. Existing research promotions were consulted for deduplication only.

## Reading that motivates the question

L’Yi, Jo and Seo, [_Comparative Layouts Revisited_](https://arxiv.org/pdf/2009.00192),
[preprint September 1, 2020](https://arxiv.org/abs/2009.00192), TVCG February 2021,
distinguishes local and whole-configuration comparison tasks and recommends considering hybrid
views. Its heterogeneous studies and citation-centered sampling limit transfer to this editor;
the findings motivate questions, not a guaranteed layout winner.

Sambasivan, Shafer, Mazurek and Ganger,
[_Visualizing Request-Flow Comparison to Aid Performance Diagnosis in Distributed Systems_](https://raja.cs.tufts.edu/assets/pdf/sambasivan2013gn_paper.pdf),
InfoVis/TVCG 2013 (online October 13), reports mistaken interpretations of union-diff
alternatives and animated states. Accuracy differences were not statistically significant.
The latency-weighted graphs and abbreviated diagnosis tasks do not establish PR-review outcomes.

**Our inference:** representation fidelity and reader comprehension are separate gates.
A useful difference view need not itself be a historical snapshot, but a view presented as a
historical state should preserve the semantic facts promised by that label.

## Static evidence to recheck against the implementation head

At the inspected commit:

- [`compareSources`](https://github.com/byronwall/draftably/blob/94354445fcdaf4f18edf237dbe491cb7867a3c94/src/dsl/compare.ts)
  compares object label, parent, color, shade and shape; edge keys include source, target,
  label, dashed state and port-side fields. The output retains the newer declaration and sets
  `~` when a key differs. The only prior property stored by that function is the old label,
  through `was=` when the label changed.
- [`panelDoc`](https://github.com/byronwall/draftably/blob/94354445fcdaf4f18edf237dbe491cb7867a3c94/src/model/panels.ts)
  removes added objects for the before side, removes deleted objects for the after side, and
  restores `was` labels on the before side. It retains the other fields from the merged
  document. Container fitting changes frame extents, not source relationships.
- [`renderSvg`](https://github.com/byronwall/draftably/blob/94354445fcdaf4f18edf237dbe491cb7867a3c94/src/cli/svg.ts)
  renders each projected document and computes routes for that document.
- [Current comparison tests](https://github.com/byronwall/draftably/blob/94354445fcdaf4f18edf237dbe491cb7867a3c94/tests/compare.test.ts)
  and [panel tests](https://github.com/byronwall/draftably/blob/94354445fcdaf4f18edf237dbe491cb7867a3c94/tests/status.test.ts)
  exercise additions/removals, labels, fitting and orientation, but do not assert source-model
  equality after a stable-ID edge retarget or reparent.

This suggests that a changed edge or parent can be detected without retaining enough old state
to reconstruct its before relationship. A later implementation may already address this;
re-read the then-current head before drawing a conclusion. No execution or visual reproduction
has established the suspected behavior.

## Proposed contract: define semantic equivalence before choosing storage

Let `B` and `A` be two accepted plain source diagrams, `C(B,A)` the comparison model,
and `Pbefore` / `Pafter` its panel projections. Agree on a canonical semantic signature
`S` that deliberately excludes geometry and comparison decoration:

```text
S(Pbefore(C(B,A))) = S(B)
S(Pafter(C(B,A)))  = S(A)
```

The initial signature should include entity kind and identity, node/group label and parent,
and edge identity, source, target and label. Also require referential integrity: every visible
edge endpoint and object parent exists on that side. Decide explicitly which remaining fields
belong to the promise:

| Field family                                     | Review question                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Node shape; synchronous/asynchronous edge kind   | Does it encode a role or relationship that a historical panel must retain?                     |
| Color/shade; comparison marks and quiet context  | Which values are intentionally normalized to status styling rather than reconstructed?         |
| Counts and links                                 | Are these versioned evidence, annotation, or excluded from change detection?                   |
| Ports, positions, routes, pins, refinement order | Which are presentation decisions allowed to differ from independently rendering either source? |

Do not require pixel identity with an independently laid-out source: union geometry and per-panel
routing are intentional. Do not let intentional theme normalization silently excuse topology or
membership changes. Stable source IDs remain the generator’s responsibility; renamed IDs may
correctly appear as removal plus addition under the existing plan.

A future implementation could retain per-version semantic fields, keep both original models
alongside shared geometry, or use removed/added declarations for certain changed relationships.
Those choices have different serialization, editing, ID and routing costs. This note chooses
none. If a supported change cannot be reconstructed, explicitly reject it or label the result
as a lossy difference summary rather than silently claim a faithful before state.

## Minimal proposed review sequence

1. **Freeze inputs and semantics.** Record the field policy alongside #106, the
   implementation SHA, both plain inputs and expected semantic signatures.
2. **Stable-ID edge retarget.** Keep A, B and C present in both inputs. Change only
   `edge route A -> B` to `edge route A -> C`. Require A→B before and A→C after.
   This avoids confounding the first probe with addition/removal filtering.
3. **Stable-ID reparent.** Keep two groups present; move one unchanged-ID node from the first
   to the second. Check the parent in both projected models, including nested groups.
4. **Boundary and policy cases.** Retarget an edge to an added node; remove an old parent;
   change label plus topology; change a shape or edge kind; change only a count/link.
   Expect exact preservation for promised fields or an explicit unsupported-case result.
5. **Then inspect exports.** Check the semantic assertions before looking at SVG/PNG. Confirm
   each historical path and membership remains readable; verify existing alignment, standalone
   framing and grayscale checks without redefining the quality rubric.
6. **Then run a small reader comparison, if warranted.** Use the existing union and panel
   modes at a fixed display size. Ask separately “What changed?” and “What path existed
   before?” Counterbalance view order; record missed changes and invented paths separately
   from completion time and preference. Do not add animation merely to complete a taxonomy.

Stop the investigation when every promised field has a policy and the minimal fixtures either
pass or identify a concrete implementation decision for the owning stack. Do not infer product
superiority from a small convenience sample, and do not expand this into the routing benchmark.

## Scope and verification record

- Research artifact only; all semantic fixtures and reader trials above remain proposed.
- Static code and current PR metadata were inspected; no comparison failure was reproduced.
- No runtime, DSL, test, example, dependency, or release changes are requested by this note.
- This assistant-generated research must be excluded from future substantive-activity ranking.
  Later independent implementation or evaluation is a separate signal.
- Publishing this draft does not authorize implementing, merging, deploying, or changing the
  active comparison stack.
