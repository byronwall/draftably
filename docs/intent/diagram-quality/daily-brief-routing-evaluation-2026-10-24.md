---
origin: repo-reading-brief
source_editions: [2026-10-19, 2026-10-23, 2026-10-24]
topic_id: draftably-constrained-routing-evaluation
artifact_type: assistant-generated-research
activity_ranking: excluded
status: proposed-investigation
reviewed_at: 2026-10-24
repository_baseline: 58ff142b9be0bc0fc29888f71dfed6a9389c584c
---

# Evaluate constrained routing without tuning to the corpus

Define a frozen fixture and evaluation contract before another routing change. This is a research handoff, with no executed experiment or runtime change. Assistant-generated briefs, documents, commits and PRs are excluded from future activity ranking. Later independent implementation/evaluation is a separate signal.

## Origin and primary evidence

The [October 19 brief](https://chatgpt.com/space/page_9bc9855faafc8191a9294d5839647e01) connects constrained layout to editable author intent; [October 23](https://chatgpt.com/space/page_53e9b8a325b481919db0329bb3f1ecc7) discusses routing stages; [October 24](https://chatgpt.com/space/page_07e288cdd0fc8191abed3e556b747d4a) sharpens the question to generalization and evaluation. These are secondary, assistant-generated sources. The synthesis below distinguishes published evidence, repository observations and proposed local tests. Primary links were reopened on 2026-10-24; no paper code or dataset conversion was executed.

- Kieffer, Dwyer, Marriott and Wybrow, [Incremental Grid-like Layout Using Soft and Hard Constraints](https://arxiv.org/html/1308.6368v1), preprint 2013-08-29. Grid-like node placement can incorporate soft preferences and hard constraints, including interactive user constraints. This is a placement framework, not evidence that a connector repair preserves Draftably's authored geometry.
- Wybrow, Marriott and Stuckey, [Orthogonal Connector Routing](https://research.monash.edu/en/publications/orthogonal-connector-routing/), GD 2009 / proceedings 2010, pp. 219–231; [author-uploaded full text](https://www.researchgate.net/publication/43433430_Orthogonal_Connector_Routing). Object-avoiding visibility paths optimize a length/bend objective; shared-path ordering and final positioning are separate concerns. Optimality under that objective does not imply an optimal whole editor drawing or agreement with FEEL.md.
- Di Bartolomeo et al., [Evaluating Graph Layout Algorithms: A Systematic Review of Methods and Best Practices](https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.15073), first published 2024-05-03. Its dataset-reporting recommendations support recording graph properties, exact selection/exclusion and reproducible materials. Our family split and regression gates below are local proposals, not results of this review.
- Di Bartolomeo et al., [GLaDOS](https://journals.aau.dk/index.php/jovi/article/view/11236), published 2026-01-27, with [data/conversion repository](https://github.com/VisDunneRight/benchmark_sets_analysis_data). It organizes and preserves graph benchmark inputs. Here it supplies topology candidates only: geometry, ports, hierarchy and editor intent need an explicit adapter. Archive downloads, licenses of individual selected graphs and conversion behavior remain to be checked before importing fixtures.

## Existing work and the remaining question

[PR #37](https://github.com/byronwall/draftably/pull/37) introduced the corpus, follow-ups, defect rubric and held-out evaluation. [#74](https://github.com/byronwall/draftably/pull/74) expanded metrics and documented thresholds/false alarms. [#85](https://github.com/byronwall/draftably/pull/85) introduced `pnpm audit:compare`; use that harness rather than rebuilding it.

Read [CHECKS](../../CHECKS.md), [RUBRIC](RUBRIC.md) and [CORPUS](CORPUS.md). At the baseline, `scripts/diagram-audit.mjs` already distinguishes proper segment crossings and collinear overlap; it also measures geometry, labels and stability. `scripts/audit-compare.mjs` evaluates corpus, heldout and examples using the same evaluator and inputs for both engines. The existing defect index is useful, but a scalar can conceal a protected regression.

[Open #103](https://github.com/byronwall/draftably/pull/103), inspected at `2e69ef16c253ca25b238cd1cc60014d6203aebfe`, already adds bounded pair repair after single-edge improvements. Its acceptance guard requires fewer crossings and lower drawing cost including length, bends, lanes and standoff, while rejecting newly backwards arrivals, far-side entries and U-turns. It reports all three sets; those are author-reported results, not reproduced here.

[Open #104](https://github.com/byronwall/draftably/pull/104), inspected at `4ab72dd0a96317f5cee4cf5d9897511a90bfae9a`, reorders eligible flow ranks by preceding-neighbor barycenter. Its unchanged held-out result has no affected rank, as its own body states. That supports compatibility on untouched cases but says little about generalization to a new eligible rank. These heads are stacked: compare each against its immediate parent and preserve all parent changes in the baseline. Do not attribute their combined delta solely to pair repair.

The added question is whether the fixture split exercises each mechanism on structurally independent cases, and whether an apparent improvement survives edge order, edit history and final rendering. This note proposes no new crossing heuristic.

## Separate four stages

| Stage                           | Repository anchor                          | Evaluation responsibility                                                                                                                                   |
| ------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node placement and constraints  | `src/dsl/compile.ts`, refinements/pins     | Preserve pins, explicit ordering and hard author intent; measure displacement separately from routing. Include an eligible multi-member flow rank for #104. |
| Visibility/path choice          | `src/engines/routing-engine.js`            | Fixed rectangles and port constraints; compare baseline, existing single-edge improvement and #103 pair repair at immutable revisions.                      |
| Shared-segment ordering/nudging | Later passes in the same router            | Inspect intermediate and final polylines; a path improvement can be undone by final spacing or fan changes.                                                 |
| Final stroke/render             | `src/model/routes.ts`, scene/SVG consumers | Check labels, arrowheads, halos, export bounds and apparent touches at the final stroke width. Geometric centerlines alone are insufficient.                |

FEEL.md is introduced on the open feedback stack, not present at this main baseline. Read its current version on that stack before any experiment. Its author preferences, pins and hard constraints outrank aggregate metric gains. Identify any conflict rather than relaxing a constraint to win a score.

## Proposed fixture contract

Start with 6–10 native/synthetic families plus two external topologies. A workable first set is: fan-in/out at tight ports; nested container exit; return/skip lanes; long chain with fold and side branch; diamond decisions; labeled narrow corridor; an eligible sibling-group flow rank with conflicting declaration/neighbor order; and a pinned/waypoint case where repair must abstain. Include both reading directions and at least one unaffected structural case. Choose two externally sourced topologies with different degree/cycle structure, recording why they add coverage.

Freeze a manifest before scoring: family ID, provenance/license, source hash, node/edge counts, hierarchy, dimensions, ports, hard constraints, recipe/options, font/theme/stroke context, seed, declaration/edge order, edit sequence and expected mechanism eligibility. Freeze the geometry adapter separately from topology. Keep variants and all edits of one family on the same side of the split. Existing corpus use in repeated tuning makes it development evidence; do not silently call renamed variants fresh hold-outs. Reserve untouched families, including a rank that actually triggers #104. Once inspected for tuning, retire that hold-out designation and record the exposure.

Define the measurement contract before the run:

- Proper crossing: transversal intersection of segment interiors, excluding shared endpoints and collinear runs. Record event location and edge pair; explicitly choose whether a multi-segment event is deduplicated. Reconcile this with the existing segment counter rather than silently changing historical counts.
- Touch: endpoint/interior or coincident endpoint contact, classified by whether the graph actually shares that node. Never count an accidental touch as a successful crossing removal.
- Shared segment: positive-length collinear coincidence; record related-edge status and overlap length even below existing issue thresholds. Parallel close runs are a separate clearance measure.
- Geometry validity: finite orthogonal segments, obstacle clearance, valid terminal/port sides, no node penetration, valid labels/arrowheads and export bounds. Report zero-length segments explicitly. A forbidden entry or pin movement is a violation even if crossings decrease.

For each fixture and edit, report the vector **crossings / total and worst-edge length / bends / node and unchanged-route displacement / violations by kind / runtime**. Keep touches, overlap length and visual clearance alongside it. Define displacement in absolute coordinates and with the rubric's allowed global/band shift removed; preserve pin displacement as an absolute hard check. Separate compile, routing and rendering timing; record machine, warm-up and repeated-run range. No runtime budget is justified by these papers alone.

## Small experiment for a later agent

1. Recheck main and #103/#104 status, freeze SHAs and evaluator version, and annotate mechanism eligibility. Run the existing `pnpm audit:compare --base <parent-sha>` on its three sets first. Keep experiment inputs and reports in ignored `tmp/`; this documentation PR adds no fixtures or harness code.
2. Reuse the harness for the frozen small set. Compare the existing baseline/single-edge pass and pair-repair revision with placement held fixed when testing routing. Test #104 separately against its parent with layout enabled. If stage snapshots or pass controls are unavailable, record that limit and propose a test-only probe for review; do not claim to have isolated a mechanism.
3. Repeat fixed geometry with original, reverse and several seeded edge-order permutations. Preserve semantic IDs/intent; check whether internal length sorting or ID ties nullify a permutation. A no-op permutation is not robustness evidence. Retain the worst route as well as typical results.
4. Run frozen grow, relabel, drag/pin and undo/redo sequences. Compare identical final input reached through different histories, separating intentional layout movement from unrelated-route churn. Inspect before/after nudge routes and final renders on every disputed case with `pnpm shoot`.
5. Publish per-family wins/ties/regressions, worst counterexamples and protected violations before aggregate DI. Reject a gain that hides a protected regression. If tradeoffs remain, propose a small blinded path-tracing task with correctness/time and counterbalanced presentation; a metric improvement alone is not reader-task evidence.

## Questions and stopping rule

Which families truly activate pair repair or rank ordering? Are hard constraints honored at every stage? Can a crossing become an uncounted touch or overlap? Does the repair cap privilege one edge order? Does nudging reverse an accepted gain? Which regressions appear only after an edit? Can an independent agent reproduce the exact baseline with the frozen evaluator?

The research deliverable is the fixture manifest, definitions, stage-attribution limits and complete per-fixture report. Continue to implementation only through separate authorization. Stop short of a generalization claim if no untouched eligible family exists, or if geometry adaptation dominates external results. No benchmark, task study or routing experiment was run for this note; the only verification here is source/repository review and documentation checks recorded in the PR.
