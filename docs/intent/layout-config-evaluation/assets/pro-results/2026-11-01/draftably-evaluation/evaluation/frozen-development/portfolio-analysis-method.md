# Portfolio analysis and replay

This is the analysis specification implemented in `analyze-portfolio.py`. It is not a report of heldout results. The program reads results produced by the shipped Draftably compiler, engines, router, and production label placement. It never implements or substitutes a layout algorithm.

## Replay sequence

From the extracted deliverable directory:

```bash
python evaluation/portfolio-selfcheck.py
python evaluation/analyze-portfolio.py --phase tune
node evaluation/run.mjs evaluation/tasks/selected-presets-development.json
python evaluation/analyze-portfolio.py --phase develop --include-tuned
node evaluation/audit-result-archives.mjs
```

The controller must finish the main development screen, documented-default supplement, selected-preset supplement, and visual/edit/routing review before sealing a policy. The analysis program writes `data/policy-proposal.json` with `frozen: false`. It never creates the policy freeze file.

After the controller writes `data/policy-freeze.json` with `frozen: true` and the complete proposal (directly or under a `proposal` key), the following commands are available:

```bash
python evaluation/analyze-portfolio.py --phase emit-heldout
node evaluation/run.mjs evaluation/tasks/selected-presets-heldout.json
python evaluation/analyze-portfolio.py --phase heldout
node evaluation/audit-result-archives.mjs --heldout
```

The controller also runs the independently generated `screen-heldout.json` and `documented-default-heldout.json` task files before heldout analysis. No selector, preset, engine subset, or threshold is refitted during heldout analysis. The program refuses incomplete task/result sets unless the explicit `--allow-partial` debugging flag is supplied. Partial outputs are not a policy freeze.

## Trial identity and failures

A trial's **first terminal result** is canonical. Terminal states are `ok`, `failed`, and `timed_out`. Subsequent results with the same ID remain raw attempt diagnostics and cannot improve coverage or policy selection. The loader merges each canonical row with its task definition so that timeouts lacking a tag or settings object remain attributable to the intended candidate.

The runtime addendum sets a uniform 15,000 ms trial budget. Earlier 90,000 ms timeouts also fail that budget. Their actual spent time remains available in the raw logs. A layout checkpoint saved before routing establishes that the layout stage returned; it does not establish that the complete diagram can be routed. Checkpoints receive no invented paths or complete-quality scores. Completed latency quantiles are conditional on completion and are shown alongside timeout rates. Exact-route caching is recorded separately; dedicated uncached timing batches, owned by the experiment controller, supply timing comparisons.

`audit-result-archives.mjs` recomputes the exact geometry signature from every canonical successful row's saved document and routes, using the same serialization function as the worker. An overwritten artifact with a different signature is flagged. This check runs no compiler, layout engine, router, or label placement.

## Hard validity and preference scores

A result must complete successfully, have `metrics.hardValid === true`, have zero required-intent failures, and have no intent-checker failures before receiving a finite preference score. Failures never become acceptable through a favorable soft score.

The five predeclared profile scores are:

| Profile | Score |
| --- | --- |
| Readable | Direct DI per ten edges + 2 × aspect error |
| Compact | Balanced DI per ten edges + 8 × ln(area / smallest valid area for the same base) + 2 × aspect error |
| Traceable | Traceable DI per ten edges |
| Stable | Balanced DI per ten edges for static screening; edit displacement/24 + 5 × changed-side rate are added for edit records, except requested global reflow |
| Specialist | Balanced DI per ten edges, with required structural semantics enforced as hard gates |

Aspect error is the absolute logarithm of actual aspect divided by the predeclared job's target aspect. Targets are wide 2.0, slide 1.78, square 1.0, page 0.77, tall 0.6, and free 1.6. The original worker field computed against 1.6 remains visible, while analysis uses the approved job-target clarification.

For the final development comparison, the reference pool includes current authored source, engine defaults in both declared directions, recipe baselines, the documented default when measured, and the selected global presets. Default and retuned policy comparisons share this same pool and the same compactness normalization. Unselected tuning configurations do not enter this pool. A default-only preview is labeled as such until selected-preset results exist.

For each base/profile, the hard-valid candidate with the lowest profile score is the reference oracle. Ties resolve by smaller area, shorter total route length, and stable trial ID. A candidate is acceptable if its score is within one unit, its area is no more than 10% larger, and its route length is no more than 10% longer than that oracle. All three tests must pass. Hard validity is mandatory. Zero route length uses a direct non-dividing comparison.

## Coverage denominators and acceptance gate

Every report retains absolute all-base coverage. A base for which the full pool has no valid result remains in that denominator. The original contract's relative feasible-pool measure excludes bases with no valid oracle; its denominator and the absolute all-base counts must both remain visible.

The original contract gate requires at least **95% of the full pool's acceptable common-base coverage separately under each of the five preference profiles**, with no new hard-failure case where current authored source was valid and no lost supported specialist task without an explicit escape hatch. Its relative denominator is the common subset with a valid full-pool oracle. A high pooled average across profiles cannot hide a failing profile.

A separately named conservative stress test requires95% absolute coverage of **all** common bases. This is stricter than the supplied contract and is not presented as the user's threshold. On the24-base heldout set there are14predeclared common bases, so13/14 fails this absolute stress test. Full-pool failures remain visible in exact all14 counts even when relative contract coverage is high.

`commonAbsoluteProfileCoverage`, `commonFeasibleProfileCoverage`, and `commonProfileCounts` expose both denominators and exact counts. `specialistCurrentValidLossCases` includes protected nested cells as well as root sequence/lanes. Root sequence and lanes are dispatched to their existing structural recipe instead of a generic root engine. Their designed preservation and their measured validity are reported separately.

Equal-family aggregation gives every family equal weight, every base within its family equal weight, and every profile within a base equal weight. The common80/niche20 and common50/niche50 assumptions redistribute weight between the predeclared groups while retaining equal family/base weighting inside each group. Worst-family coverage is also reported. These are benchmark assumptions, not population frequency estimates.

## Exhaustive engine subsets and theoretical oracles

The program enumerates every nonempty engine subset: **1,023 subsets**. The mandated size-one-through-five curve contains10 +45 +120 +210 +252 =**637subsets**; sizes six through ten extend the diagnostic without any new geometry execution. Default subsets expose RIGHT and DOWN for each retained engine. The selected-preset subset exposes its one frozen global RIGHT preset per engine. Structural recipes remain separate from generic-engine candidates.

The within-subset coverage oracle may choose a candidate after seeing the outcome. If an acceptable candidate exists, it selects one; otherwise it selects the lowest-scoring valid result. This is a theoretical upper bound, not an automatic selector. The scalar profile oracle and the coverage oracle have different roles and remain explicit.

All1,023subsets are evaluated with and without current-source fallback. The latter cannot justify deleting an implementation: the current source may still invoke an engine outside the smaller visible menu. Subsets are ranked first by hard-valid coverage, then weighted acceptable coverage (worst-family coverage in that sensitivity), then common coverage and finite regret. When a subset at a given size meets the original relative per-profile contract gate and has no current-valid hard regressions, the best qualifying subset is the candidate passed to selector fitting; otherwise the overall best subset at that size is used.

Leave-one-engine-out tables separate a practical acceptance loss from a tiny numeric score win inside the bands. Every practical loss includes its base, family, profile, and with/without trial IDs, providing replayable witness pairs. Fixed-default and retuned removals share the full reference pool.

## Global presets and fair tuning budget

Every engine receives four predeclared parameter presets on the same 12 development bases, for 480 distinct tuning tasks. The global preset is selected by hard-valid coverage, then five-profile acceptable coverage within the tuning pool, then finite regret, with lower preset index breaking ties. This phase is explicitly a training estimate.

Selected presets are then evaluated across all 46 development bases applicable to generic root engines. Already measured selected configurations are reused. A selected default preset always reuses the canonical main-screen result, even on a tuning base, so a more fortunate repeat cannot improve the default. A tree-root preset, if selected, resolves its `last-node` rule separately for each source rather than copying an unrelated fixture's ID.

## Actual pre-layout selector and goal policies

The selector uses only declared source information available before layout:

- Node, edge, and group counts.
- Density, undirected fraction, connected components, and maximum degree.
- Maximum containment depth and presence of a directed constraining cycle.
- Declared target aspect.

Undirected edges are read from `directed=false`, and cycle detection excludes `constraint=false` edges. Connected components use authored edge connectivity over node/group endpoints; containment does not create artificial graph edges. IDs, family names, provenance, geometry, quality, and observed winner labels are not predictive features.

A deterministic greedy tree has maximum depth three and at least four development bases in every trained leaf. Leaf selection minimizes hard-invalid weight first, unacceptable weight second, and bounded finite regret third. Thresholds are midpoints of observed development feature values. A single tree serves automatic selection; separate profile-specific trees model goal presets. The bounded tertiary regret never overrides a hard-validity or acceptance improvement.

The reported selector is fitted for one oracle-selected portfolio at each size. Thus the oracle frontier is exhaustive, while selector minimality is limited to these five proposals. The study does not claim an exhaustive optimum over every possible subset/tree combination.

The proposed validity guard for both smaller cold UI policies retains current authored output when the selected candidate is hard-invalid and current output is valid. This is proposed wrapper behavior evaluated from measured results; it is not presented as an already shipped automatic feature. Its quality, fallback count, and implementation implications remain separate from unguarded selection.

## Sensitivity and uncertainty

Half/double practical bands do not change an engine subset, global preset, tree threshold, or tree leaf. The theoretical oracle may reselect among configurations inside the same fixed portfolio under each band. Actual pre-layout choices remain frozen.

Heldout uncertainty uses a paired two-stage bootstrap: sample families, then sample whole bases within each sampled family. The five profile jobs remain clustered within each base. The statistic recomputes the same weighted acceptable numerator and feasible-oracle denominator as the displayed conditional coverage difference. Oracle-unavailable bases stay in the sampling frame. Absolute coverage and exact failures are also reported; a favorable conditional interval does not erase absolute failures or the separately reported conservative stress-test result.

The bootstrap uses 2,000 draws by default and a recorded seed. With only two heldout bases per family, intervals are descriptive and cannot establish real user prevalence or satisfaction. Static stable-profile scores do not replace the separately executed edit-stage evidence.

## Machine-readable policy and edit handoff

`data/policy-compact.json` provides `bestSingle.layout`, exact portfolio IDs by size, `preferredSelector.tree`, profile-specific `goalTrees`, `presetMap`, and three distinct-engine global `jointLayoutChoices` for the controller's layout × routing experiment. These choices are proposals until the controller freezes them.

Both proposed cold UI policies—best-single and feature-selector—have an explicitly declared hard-validity guard. Raw candidates still execute under their own trial IDs, and raw unguarded results remain available. Guarded policy output is selected from measured candidate/current results; it is not represented as another engine execution.

`data/edit-policy-predictions.json` contains a base decision and an edit-specific decision for each policy, so a topology edit can legitimately cross a frozen tree threshold. Each row refers to the same policy's pre-edit output. A pre-edit guard can make that effective reference current authored source; the file records this explicitly. A canonical timed-out pre-edit trial points to its layout checkpoint, if present, with unavailable route history marked. A later successful retry cannot supply a better canonical reference.

Explicit direction-change edits override a fixed or learned direction before compilation. This represents the user's requested direction control and prevents the policy from silently undoing the task. Pins, required relative relations, and nested structural recipes remain in the source. Color is not a predictor, so a color-only change cannot alter the predicted method.

For an individual prediction:

```bash
python evaluation/predict-cold-policy.py pipelines-03 --edit direction_or_remove --policy selector
```

For a heldout edit handoff after frozen main-screen and selected-preset outcomes have completed:

```bash
python evaluation/analyze-portfolio.py --phase edit-predictions --split heldout
```

This step resolves runtime guard/reference availability without fitting any policy. It preserves development predictions already in the handoff file.

## Source-aware engine deletion diagnostic

`analyze-dependencies.py` evaluates every nonempty engine subset, plus a zero-engine native-recipe baseline, under three explicit availability scenarios:

1. **Recipe baselines with safe dependencies:** root engine candidates plus all measured native recipe baselines; current authored source is also available when it names no engines. Every named nested engine must be retained.
2. **Recipes and authored source with safe dependencies:** current authored source is additionally available if every engine it names is retained.
3. **Current-source UI fallback:** current source and recipes stay available even when their engine dependencies are absent from the visible menu. This scenario can justify hiding choices, not deleting implementations.

Each scenario is evaluated for default configurations, the selected global presets, and their combination. All scenarios share the same measured full-pool oracle. The implementation follows the baseline compiler's source dependency rule: `engineArrangement` in `src/dsl/compile.ts` calls `LayoutLab` for explicit engine declarations. Native `flow`, `row`, `column`, `lanes`, `sequence`, and `cells` recipes do not silently name one of the ten generic engines. Nested explicit engine declarations survive a root override. For example, the existing `authored-01` fixture has three nested `engine=grid` declarations, so replacing its root layout does not make the grid implementation dispensable.

The source-aware analysis records the smallest development subset meeting the original relative per-profile gate, with zero new hard failures where current source was valid. It also records the stricter all-common absolute result, all family weights, and every marginal removal witness. Newly lost witnesses exclude jobs already uncovered by the original candidate subset.

For the selected minimum engine set, a second exact search minimizes the number of additional global configurations from the measured default RIGHT/DOWN and selected-preset options. Native recipes and supported authored source remain separately available. This is minimum configuration count **for that engine set and measured candidate pool**, not a joint proof of optimality over every possible parameter value or engine/configuration set. Its theoretical oracle can choose after outcomes. A successful oracle portfolio does not establish a successful pre-layout selector.

Before heldout analysis, the controller embeds the complete development diagnostic as `engineRecipeDiagnostic` in the policy freeze. The heldout command applies only those stored engine sets and the stored configuration list:

```bash
python evaluation/analyze-dependencies.py --split heldout
```

It refuses to use a mutable development diagnostic to select new heldout subsets. These calculations execute no compiler, engine, router, or label placement. They do not establish that deleting code is safe: public IDs, existing stored documents, source migrations, shared code paths, warm repair actions, and compatibility remain separate implementation obligations.
