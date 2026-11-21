---
origin: repo-reading-brief
source_edition: 2026-10-27
source_url: https://chatgpt.com/space/page_04f3f61beb208191855a6e3ebf0e6748
topic_id: draftably.diagnostic-attribution-contract.v1
artifact_type: assistant-generated-research
activity_ranking: excluded
status: proposed-investigation
reviewed_at: 2026-10-27
repository_baseline: 367e474188fa50f67249db9a6d718b01c5b8c1c2
---

# Separate diagnostic attribution from verified repair

Investigate what evidence should accompany a drawing-conflict suggestion before an agent acts on
it. This note supplements the diagnostic loop shipped in [#156](https://github.com/byronwall/draftably/pull/156);
it does not propose that loop again. No experiment below has been run. No application code,
diagnostic wording, agent skill, fixture or release behavior changes in this research PR.

## Origin and reading

The [October 27 reading brief](https://chatgpt.com/space/page_04f3f61beb208191855a6e3ebf0e6748)
connects the new conflict feedback to Ulrich Junker's
[QUICKXPLAIN: Preferred Explanations and Relaxations for Over-Constrained Problems](https://cdn.aaai.org/AAAI/2004/AAAI04-027.pdf),
AAAI 2004, pp. 167–172; [conference dates](https://aaaipress.org/Conferences/AAAI/aaai04.php)
were July 25–29. The complete publisher paper was read on October 27, 2026.

The paper distinguishes a conflict from a consistency-restoring relaxation, uses preferences to
choose among alternatives, and reduces checking with divide-and-conquer. Its minimality guarantee
is not a minimum-cardinality guarantee. The algorithm assumes monotone satisfiability; its
guarantees cannot simply be attached to a heuristic layout run.

The local proposal below is an adaptation about evidence and repair verification, not an
implementation recommendation for QuickXplain or a claim that the paper evaluated diagram agents.

## What already exists

At the baseline above, #156 is merged to `main`:

- [`src/dsl/conflicts.ts`](../../../src/dsl/conflicts.ts) detects five geometric warning classes
  from projected rectangles, drawn routes and labels. `sceneConflicts()` reroutes using no previous
  routes, while the viewer supplies the routes it draws to `findConflicts()`.
- `blame()` visits implicated IDs in caller-supplied order and selects the first matching hint in
  `PLACING`: `pin`, `near`, `nudge`, `stay`, `size` or `align`. It returns a removal suggestion and,
  where available, a move or new pin coordinates calculated from the current geometry. It does not
  compile or route the candidate edit before suggesting it.
- `hintMoves()` compiles the source with all hint lines blanked out. Its raw/final table is a
  useful joint-refinement baseline; it is not a per-line causal attribution experiment.
- [`tests/conflicts.test.ts`](../../../tests/conflicts.test.ts) checks the boxed-in-edge warning,
  a cross-scope overlap and the displacement table. The edge test asserts the chosen ID, line and
  suggestion syntax. It does not apply the suggested removal or coordinates and inspect the result.
- [Drawing conflicts](../../DSL.md#drawing-conflicts) and the
  [agent skill](../../../skills/draftably/SKILL.md) already teach the check, fix, check loop.

These are static source observations, not reproduced defects. In particular, no existing suggested
fix has been demonstrated to fail by this note. #156's reported corpus run and checks are its
authors' results, not reruns of this investigation.

The [DSL shape brief](../diagram-dsl/shape-brief.md) already requires explicit pin preservation,
deterministic relaxation of relative preferences and feedback about affected rules. Its
[implementation plan](../diagram-dsl/implementation-plan.md) already owns that feedback. The
[recovered Meld research](../../../reference/meld/original/research.md) also explicitly states that
diagnostics do not prove a better solution impossible. Preserve these existing boundaries.

## Proposed evidence contract

Keep three statements separate in an investigation report:

| Claim                 | Evidence to retain                                                                                            | What it does not establish                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Observed geometry     | Source hash, engine revision, warning rule and stable IDs, rectangles and final route/label geometry          | Which authored statement caused the observation               |
| Suspected contributor | Candidate hint identity and why it entered the candidate list, including ancestor/endpoint context            | That removing it clears the target or is authorized           |
| Verified local repair | Exact scratch edit, successful recompile/reroute, target outcome, complete diagnostic delta and intent checks | Unique cause, globally best drawing or globally smallest edit |

For now these are proposed report fields, not new CLI or DSL fields. The source line remains a
navigation aid; use stable IDs plus the original source hash to recognize the same hint after
unrelated comments or lines move.

An agent-facing recommendation should be no stronger than the evidence retained. A candidate that
has only been geometrically estimated remains a candidate. A failed or incomplete recheck must not
be represented as a verified fix. A warning-free result is not permission to delete author intent.

## Applicability boundary: do not use the renderer as a satisfiability oracle

Consider a fixed semantic diagram and two hint sets, `A` contained in `B`. A clean render with `B`
does not establish that the render with `A` is clean: deleting a hint invokes packing and routing
again and can change which drawing the heuristics find. Conversely, an overlap in the chosen
drawing does not establish that every drawing satisfying the source must overlap.

Therefore:

1. Do not call a set of hints a minimal unsatisfiable core merely because a rerender has warnings.
2. Do not use subset pruning whose correctness requires a monotone warning predicate. A small
   empirical subset check can falsify that assumption, not prove it for the general engine.
3. An absence of refinements does not establish unavoidability. Record a warning in that baseline
   as an unrefined rendering outcome, not proof of impossible geometry.
4. Keep parse failure, compile error, incomplete execution and a successful warning-bearing render
   distinct. None can be silently reclassified as a clean candidate.

Any future exact-constraint formulation would need its own explicitly defined variables, immutable
background, relaxable requirements and checked oracle assumptions before using the paper's
guarantees. That solver project is outside this proposal. Existing engines remain the baseline.

## Small, bounded investigation

Read [CHECKS](../../CHECKS.md) and [FEEL](FEEL.md). Use ignored `tmp/` copies and the existing
compiler, routes, checks and screenshot tooling; do not alter user files or add a new production
repair engine. Freeze the source hash, repository SHA, rendering settings and warning identity
before running any candidate. Use the same cold-route path on both sides of a CLI comparison;
investigate viewer-route differences separately rather than mixing histories.

Start with the existing boxed-in-edge test and the following deliberately small variations:

| Case                                                   | Question                                                                        | Required observation                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Existing boxed-in edge                                 | Does each current suggestion work when actually applied?                        | Independently try removal and the proposed coordinates; retain the full resulting diagnostics            |
| Irrelevant refinement                                  | Does an unrelated hint change attribution or the apparent cure?                 | Preserve the original semantic diagram; identify whether the added hint was selected or changed geometry |
| Two independent obstructions                           | Does clearing one warning hide another?                                         | Track each warning by rule and stable objects, plus new warnings                                         |
| Multiple applicable hints or nested container movement | Is the selected statement useful, or only first in the current candidate order? | Record the selected hint, ancestor context and each tested alternative                                   |
| Protected pin                                          | Is apparent success purchased by discarding a required position?                | Mark the result ineligible unless the manifest explicitly permits relaxing that pin                      |
| Tiny subset family                                     | Does warning-free rendering behave monotonically on this example?               | For at most six selected hints, inspect all subsets and retain any violating pair                        |

For each fixture, define a manifest of protected intent before generating candidates. Pins are
parent-local in this DSL: check their declared local coordinates and parent requirements; report
absolute movement separately. Preserve graph IDs, endpoints, containment and required labels.
Do not infer permission to relax a pin from its presence in a warning.

Apply each candidate to a fresh copy of the identical starting source. Record:

- exact removed or replaced statement and candidate rationale;
- parse/compile result and whether routing completed;
- original target warning present/absent, all other warnings added/removed and errors;
- protected-intent pass/fail and displacement outside the intended region;
- elapsed compile/routing time and the number of attempted candidates;
- final SVG and, for disputed cases, a `pnpm shoot` image.

Do not equate target disappearance with a successful repair. For example, moving an obstruction to
another edge can remove the old warning while creating a new one. Conversely, an independent
pre-existing warning may remain after a useful local edit; report partial success instead of
either claiming a fully clean diagram or declaring the local edit useless.

The tiny-subset exercise is for understanding the checker. It does not authorize exhaustive search
on large files, certify irreducibility outside the selected hints, or demonstrate a globally
smallest repair. Any candidate cap or timing budget must be reported, including untried options.

## Decision and stopping rule

Deliver a suggestion-application table and the smallest concrete counterexamples, if any. Separate
target-clearance rate, new-conflict rate, protected-intent failures, collateral displacement and
checking cost. Aggregate defect index alone cannot answer whether advice is safe to act on.

If all selected suggestions work, report the scope and keep the current heuristic; do not invent a
failure to justify a subsystem. If candidates fail or create collateral changes, first propose a
bounded verification step or more cautious evidence wording for review. If checking is too costly,
retain the observed-warning/suspected-contributor distinction rather than claiming verification.

Stop with that evidence packet. Implementation, diagnostic wording changes and automatic repair
require a separate decision. No experiment, reader study or diagnostic repair was run for this
research note; documentation validation belongs in the PR record.

## Deduplication and provenance

The October 18–26 coverage record and existing open research
[#105](https://github.com/byronwall/draftably/pull/105) and
[#116](https://github.com/byronwall/draftably/pull/116) were checked. #105 owns constrained routing
evaluation; #116 owns source-faithful comparison projections. Neither is an evaluation of the
evidence behind a suggested source edit. Current DSL plans, quality follow-ups and recovered
research were checked for existing ownership. Repository searches for QuickXplain, explanation,
blame and minimal conflict did not find another proposal; search results alone are not an
exhaustive absence proof.

This assistant-generated research, its branch, commits, PR and any eventual merge are excluded
from future substantive-activity ranking. Later independently requested implementation, feedback
or evaluation is a separate signal. Publication does not authorize implementation, merge,
auto-merge or deployment.
