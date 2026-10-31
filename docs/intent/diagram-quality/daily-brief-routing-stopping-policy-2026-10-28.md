---
origin: repo-reading-brief
source_edition: 2026-10-28
source_url: https://chatgpt.com/space/page_892fe1c3f46081919af32c827335b1b2
topic_id: draftably.routing-improvement-stopping-policy.v1
artifact_type: assistant-generated-research
activity_ranking: excluded
status: proposed-investigation
reviewed_at: 2026-10-28
repository_baseline: 2995a98eef31803fa8669a7ada5c8f8892486bb7
---

# When another routing pass is worth its time

Research handoff only. This document adds no application code, fixtures, instrumentation, DSL, dependencies, or benchmark changes. All experiments below remain proposed. Publishing this draft does not authorize implementation, merge or deployment. Exclude this document, branch, PR, commits and eventual merge from future substantive-activity ranking; later independent user evaluation is a separate signal.

Source edition: [Repo Reading Brief October 28 2026](https://chatgpt.com/space/page_892fe1c3f46081919af32c827335b1b2).

## The decision this investigation should support

Keep the current four-attempt crossing-repair cap unless evidence shows that a cheap, state-informed stopping policy yields a useful time/quality tradeoff. The deliverable is an attempt-trajectory report and a recommendation to retain the cap, investigate a simple alternative, or defer. It is not a mandate to implement a learned controller or replace the router.

[Issue 213](https://github.com/byronwall/draftably/issues/213) already owns the performance target and implementation direction. Its [latest tally and options](https://github.com/byronwall/draftably/issues/213#issuecomment-6451194023) prioritize a narrower A* search window. This note must not displace that work: the remaining cost is not solely crossing repairs. An improvement-stopping investigation is useful only if the residual pass has sufficient cost and variance after the independently planned work.

## Primary reading and transfer limits

Eric A. Hansen and Shlomo Zilberstein, [Monitoring the Progress of Anytime Problem-Solving](https://cdn.aaai.org/AAAI/1996/AAAI96-182.pdf), AAAI 1996, pp. 1229–1234. The complete publisher PDF was read on October 28, 2026.

The paper models improvement conditional on current solution quality and extra computation time. A monitoring policy chooses when to inspect and when to stop, accounting for inspection cost. Its dynamic-programming optimality result assumes a Markov quality process and accurate observation; estimated quality weakens the guarantee. The worked experiment uses 1,000 random twelve-city traveling-salesman problems, with a lower-bound-based quality estimate, and reports small gains in that low-variance setting. It does not evaluate diagram routing, browser interaction, or Draftably's repair policy.

The proposed transfer is the question and measurement structure, not an algorithm transplant. A crossing count is not a sufficient state description by default: two drawings with equal counts may have different eligible pairs, constraints and search costs. Nor is Draftably's best longer run a known optimum. Treat local improvement predictions as hypotheses, not probabilities with established calibration.

## Verified repository baseline

Inspected default branch `2995a98eef31803fa8669a7ada5c8f8892486bb7`, following the 0.7.0 release merge. The following are implementation evidence, not research-promotion activity:

- [Merged 218](https://github.com/byronwall/draftably/pull/218) changes the crossing-pair cap from 24 to four. Its author reports no route-point, side or blocked-flag changes across 98 files, with all retained repairs among the first four attempts. It explicitly acknowledges the unseen useful-fifth-repair case. These measurements were not rerun for this note.
- [Merged 214](https://github.com/byronwall/draftably/pull/214) already moves full file routing into the worker, avoids duplicate full routings, and reuses exact-input results. [Merged 216](https://github.com/byronwall/draftably/pull/216) already caches compiled sources/routes across loads and separates never-seen source timing from cache hits. [Merged 217](https://github.com/byronwall/draftably/pull/217) already draws a compiled scene with quick routes before full routes arrive.
- [Merged 192](https://github.com/byronwall/draftably/pull/192) already gives `vary` progress and a budget that stops starting variants. It does not interrupt an engine mid-run.
- Issue 213's author-reported post-stack large-fixture tally distinguishes 277 ms to the newly drawn box from 1,525 ms to a settled node-and-edge edit. Warm opening at 181 ms is not the never-seen source at 1,867 ms. Do not report the fast path as completion of the settled target.

Static inspection of [`src/engines/routing-engine.js`](../../../src/engines/routing-engine.js) establishes the relevant boundary:

1. `MAX_REPAIRS = 4` limits distinct crossing pairs in `tried`, not a uniform amount of CPU time or a count of accepted repairs.
2. The repair block runs only for non-quick routing when `facingFans` applies. It considers both pair orders, respects waypoint-fixed edges, and can perform multiple `find` calls for a pair.
3. A candidate must reduce crossings and the local drawing value, and cannot newly introduce the guarded backward/far-side/U-turn conditions. Keep those guards unchanged when measuring stop policies.
4. At most two sweeps run; a sweep with no accepted change ends the pass. A pair is not tried twice. The report's `repaired` count records accepted repairs, not rejected attempts or time spent.
5. Later geometry passes still run after pair repair. An intermediate accepted improvement must be checked against the final rendered result, not advertised as final quality.

These observations do not demonstrate a current defect or prove a state-informed policy is worthwhile.

## Existing ownership and deduplication

Read [CHECKS](../../CHECKS.md), [FEEL](FEEL.md), [RUBRIC](RUBRIC.md) and [NEXT](NEXT.md) before designing a probe. Existing harnesses, protected constraints, visual judgment and author intent remain authoritative.

[Open draft research PR 105](https://github.com/byronwall/draftably/pull/105) already owns family-level fixture splits, routing-stage separation, edge-order/edit probes and per-fixture runtime/quality reporting. Reuse that contract; do not create another corpus or duplicate its study. This note adds the narrower within-run trajectory and stopping-policy comparison. [Open draft 116](https://github.com/byronwall/draftably/pull/116) owns before/after source-fidelity semantics; [open draft 158](https://github.com/byronwall/draftably/pull/158) owns diagnostic attribution versus scratch-verified repair. They are deduplication evidence only, not the reason to do this work.

Recent open, closed and merged performance PRs and current plans were inspected. Searches for `anytime` and `stopping` found no existing PR for this specific investigation. The current issue's proposed search window, candidate-side reduction, incremental routing and drawn-versus-settled contract remain its work, not new proposals here. Do not reopen deferred channel repacking in NEXT.md.

## Proposed bounded investigation

### First decide whether there is a reason to continue

Recheck main and issue 213, pin the source/evaluator SHAs and identify any intervening router changes. Use current author-approved fixtures and the existing quality audit. Start with a few cases that actually exercise repair: a beneficial early pair, many rejected pairs, a waypoint-constrained pair, and a busy grouped drawing. Record eligibility; an unaffected fixture is not evidence of policy quality.

If repair cost is now negligible, or almost all eligible cases have the same outcome, stop with a short negative report. The most useful conclusion may be that the fixed cap is simpler and adequate.

### Capture one attempt trajectory

A later agent may propose a small test-only probe for review, in ignored `tmp/` work, without changing the production algorithm. The existing public report does not expose all of these fields. Do not claim the current CLI already provides them.

For each distinct pair attempt, retain:

- Fixture family/source hash, exact rectangle/port/waypoint inputs, router SHA and settings.
- Pair IDs and iteration order; which candidates are actually eligible after fixed-edge checks.
- Elapsed and incremental time; number of `find` calls; accepted or rejected; candidate rejection reason if available.
- Before/after crossings, local value, route length/bends, blocked flags and protected violations.
- Full final geometry/labels and existing audit result after all subsequent passes.
- Measurement overhead, separately from the measured computation.

Keep a deterministic baseline before adding any timer or instrumentation. Verify that merely collecting the trace has not changed route outputs. Do not export private diagram labels or source into a public artifact.

### Compare stopping choices without claiming optimality

Use the current four-pair cap as the baseline. In a disposable experiment, compare a longer fixed cap as an offline reference; call it a reference, not the optimum. Deliberately search for a late-benefit counterexample, but do not tune and evaluate on that same example as if it were held out.

First report the empirical curves: additional elapsed time versus additional accepted benefit. Only if they differ meaningfully by observable state should a later agent test a simple rule, such as continuing only for a demonstrably eligible unresolved pair after an early gain. That example is not a prescribed rule: previous rejection may predict little about a later pair, so “stop after a failure” is not justified without evidence.

Keep the chosen features small, and record both their cost and false confidence. Freeze a candidate rule before trying untouched cases under PR 105's family discipline. Compare the same router, inputs, guards and final evaluator; changing the search window at the same time prevents attribution. Report per-case time saved, useful repairs lost, later-pass reversals, protected regressions and policy overhead before aggregate gains. Include worst cases and no-benefit cases, not only the showcase diagram.

### Respect product and execution boundaries

- FEEL outranks a scalar score. A short, readable route with one crossing may beat a long detour with none. Do not learn a policy from crossing counts alone and call it reader quality.
- A stop between attempts is not preemption inside `find`. Measure the slowest indivisible attempt and deadline overshoot. A soft budget cannot promise a hard 200 ms completion bound.
- Do not silently redefine settled as first drawn. If choosing a quick-result/background-refinement contract is desirable, present it separately as the product decision already listed in issue 213.
- Preserve CLI/viewer final-route parity unless a separate reviewed design explicitly changes it. Input-dependent adaptivity can still be deterministic; wall-clock-dependent cutoffs can make outputs machine-dependent.
- Retain current cancellation/fingerprint safeguards. This proposal does not add worker lifecycle management or authorize application edits.

## Review package and stopping rule

Return the pinned baseline, fixture manifest, complete attempt trajectories, overhead measurement, before/after final renders for disputed cases, and one of three recommendations: keep the fixed cap; investigate a specific simple rule with its counterexamples; or defer because the residual cost is too small.

Do not proceed from a favorable average alone. Stop short of a generalization claim if no untouched eligible cases remain, if quality is not measurably predicted, if monitoring costs erase the saving, or if a protected regression is unresolved. All implementation, runtime instrumentation and policy rollout require separate review/authorization. This PR only prepares the research handoff.
