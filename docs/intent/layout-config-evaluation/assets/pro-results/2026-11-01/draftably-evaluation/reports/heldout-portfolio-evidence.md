# Frozen heldout portfolio evidence

Original-experiment report. This helper verifies the exact raw inputs listed in `data/analysis/original-report-inputs.json` and refuses fresh replay results, whose timestamps and measurements identify a different run. Dynamic core analyzers remain available for fresh-result reporting.

**No frozen reduced portfolio or automatic selector passed the experiment’s heldout acceptance rule.** The development minimum of six dependency-safe engines did not retain 95% acceptable common-job coverage in every profile. Restricting those engines to the eleven development-selected global configurations lost further coverage. The selector trained on source features performed substantially below either availability oracle.

These findings support retaining the shipped engine implementations and their explicit advanced escape path. The six-engine set is a measured development candidate, not a validated implementation-deletion plan. A goal-oriented interface can still be proposed, but this experiment does not validate automatic replacement of current source layout by the fitted selector. Actual editing behavior is evaluated separately in the E experiment.

## Exact common-case counts

There are **14 common heldout bases**, of which the full measured pool has a hard-valid output for **12**. Current authored source is hard valid on **11**. The contract requires at least 95% of the 12 feasible bases separately in each profile, plus no new current-valid hard failure and preservation of specialist escapes. At this sample size, 11/12 is insufficient. The stricter absolute sensitivity uses all 14 bases and is reported separately.

| Frozen policy | Readable | Compact | Traceable | Stable proxy | Specialist proxy | Lowest relative | Lowest absolute | New current-valid hard losses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| current-authored | 3 | 3 | 2 | 2 | 2 | 16.7% | 14.3% | 0 |
| implicit-recipe | 3 | 3 | 3 | 3 | 3 | 25.0% | 21.4% | 0 |
| documented-default | 4 | 5 | 3 | 3 | 3 | 25.0% | 21.4% | 0 |
| best-fixed-global-validity-guard | 3 | 2 | 4 | 3 | 3 | 16.7% | 14.3% | 0 |
| k1-configuration-oracle | 3 | 4 | 4 | 4 | 4 | 25.0% | 21.4% | 0 |
| k2-configuration-oracle | 5 | 7 | 5 | 5 | 5 | 41.7% | 35.7% | 0 |
| k3-configuration-oracle | 7 | 7 | 7 | 6 | 6 | 50.0% | 42.9% | 0 |
| k4-configuration-oracle | 8 | 8 | 8 | 7 | 7 | 58.3% | 50.0% | 0 |
| k5-configuration-oracle | 8 | 8 | 10 | 8 | 8 | 66.7% | 57.1% | 0 |
| k5-prelayout-selector-validity-guard | 5 | 4 | 3 | 3 | 3 | 25.0% | 21.4% | 0 |
| k5-goal-selector-validity-guard | 3 | 3 | 3 | 3 | 3 | 25.0% | 21.4% | 0 |
| frozen-six-engine-recipe-oracle | 11 | 12 | 11 | 10 | 10 | 83.3% | 71.4% | 0 |
| frozen-minimum-configuration-oracle | 10 | 12 | 10 | 8 | 8 | 66.7% | 57.1% | 0 |

Each profile column is an accepted-base count: divide by 12 for the contract’s relative rate, or by 14 for the absolute rate. These counts assess frozen practical-equivalence bands, not just hard validity. The preferred guarded selector and both dependency oracles preserved both currently valid protected specialist cases.

## What was retained in the dependency candidate

The frozen six-engine set is **boundary-align, tidy, force, layered, tree, grid**. All six structural recipe implementations remain available. Source-dependent current layouts remain available only when their explicitly named engine dependencies are retained. The five-choice UI-fallback scenario still uses hidden implementations and is not evidence for deleting them.

The eleven global configurations are:

- `engine:boundary-align:DOWN`
- `engine:boundary-align:RIGHT`
- `engine:force:RIGHT`
- `engine:layered:DOWN`
- `engine:layered:RIGHT`
- `engine:tidy:RIGHT`
- `engine:tree:RIGHT`
- `tuned:force:RIGHT:p3`
- `tuned:layered:RIGHT:p1`
- `tuned:tidy:RIGHT:p3`
- `tuned:tree:RIGHT:p1`

Grid remains an implementation dependency of authored nested layout, even though it is absent from those eleven global configurations. The configuration search was conditional on the chosen engine set; it was not joint global optimization over every possible engine/parameter combination. No set or configuration was retuned on heldout.

## Paired uncertainty

The following differences are acceptable-coverage changes versus current source across **all oracle-feasible families**, with profiles clustered within each base. The frozen bootstrap resamples families and then bases, with 2,000 draws. Its phrase “common full-pool oracle feasibility” refers to feasibility shared by both compared policies; its code does not filter to common-job families. These intervals are therefore distinct from the exact common-job gate above.

| Policy | Coverage difference | Paired 95% interval |
|---|---:|---|
| best-fixed-global-validity-guard | +7.4 pp | -5.0 to +22.5 pp |
| k5-prelayout-selector-validity-guard | +11.6 pp | -5.6 to +33.7 pp |
| k5-goal-selector-validity-guard | +7.4 pp | -4.0 to +18.1 pp |
| frozen-six-engine-recipe-oracle | +73.7 pp | +50.0 to +94.4 pp |
| frozen-minimum-configuration-oracle | +65.3 pp | +41.7 to +87.1 pp |

Only two heldout bases were constructed per family. The intervals describe this stratified corpus and cannot establish real-user prevalence. An oracle’s positive difference does not establish that an automatic selector can realize it.

## Weighting and band sensitivity

Equal-family, 80/20 common/niche, 50/50, and worst-family views all retain the same common-profile count failures. The preferred selector has at least one feasible family with zero accepted jobs. Its all-feasible acceptable coverage changes only modestly with common/niche weighting; weighting does not repair the missing cases.

| Frozen policy | Band multiplier | Lowest relative common coverage | Selection interpretation |
|---|---:|---:|---|
| k5-configuration-oracle | 0.5 | 50.0% | configuration oracle reselected within fixed portfolio |
| k5-configuration-oracle | 1 | 66.7% | configuration oracle reselected within fixed portfolio |
| k5-configuration-oracle | 2 | 83.3% | configuration oracle reselected within fixed portfolio |
| k5-configuration-oracle-current-fallback | 0.5 | 58.3% | configuration oracle reselected within fixed portfolio |
| k5-configuration-oracle-current-fallback | 1 | 66.7% | configuration oracle reselected within fixed portfolio |
| k5-configuration-oracle-current-fallback | 2 | 91.7% | configuration oracle reselected within fixed portfolio |
| k5-prelayout-selector-validity-guard | 0.5 | 25.0% | frozen deployed selection |
| k5-prelayout-selector-validity-guard | 1 | 25.0% | frozen deployed selection |
| k5-prelayout-selector-validity-guard | 2 | 33.3% | frozen deployed selection |
| k5-goal-selector-validity-guard | 0.5 | 16.7% | frozen deployed selection |
| k5-goal-selector-validity-guard | 1 | 25.0% | frozen deployed selection |
| k5-goal-selector-validity-guard | 2 | 33.3% | frozen deployed selection |

A band multiplier of 0.5 means +0.5 score and +5% area/length; 2 means +2 score and +20% area/length. Trees and retained subsets remain fixed. Oracle sensitivity may choose a different already-measured configuration inside the same frozen subset; deployed selectors retain their frozen decisions. No new policy was selected from this sensitivity.

## Failures and concrete witnesses

The full pool has no acceptable hard-valid result for: **architecture-06, containers-05, containers-06, dags-06, networks-06**. These five bases stay in the absolute denominator and in the failure ledger. Two are common cases: architecture-06 and dags-06.

The six-engine oracle misses architecture-05 on readable/stable/specialist and cycles-06 on traceable/stable/specialist; it also misses the niche routing-06 compact job. The eleven-configuration restriction additionally loses pipelines-05 on four profiles and cycles-05 on stable/specialist. A score tie can still fail because area or route length exceeds the frozen +10% bands; the witness ledger preserves those separate reasons.

For example, the selector chooses force RIGHT for pipelines-05. It passes the hard gates but misses all five profile acceptance tests. The traceable score ties the full-pool oracle while its geometry falls outside a practical-equivalence bound. This demonstrates why the comparison cannot be summarized by score or crossing count alone.

Use `data/analysis/heldout/portfolio-failure-witnesses.csv` for case/profile reasons, chosen and oracle trial IDs, geometry paths, and size/length ratios. `frozen-engine-recipe-witnesses.csv` contains every applied six-engine oracle decision. `minimum-configuration-frozen-selections.csv` contains the frozen eleven-configuration choices used for visual matching.

## Verification and related artifacts

- `archive-hash-audit.json` verifies all 673 successful heldout source artifacts, with zero missing files and zero hash mismatches.
- `../family-tails-heldout.md` summarizes 852 logical method observations from 829 physical source trials: 673 completed, 607 hard valid, and 156 timed out. These are repeated measurements of 24 bases, not independent users.
- `frozen-policy-acceptance.json` retains every tested policy gate result, including unguarded tuned-policy hard regressions.
- `portfolio-evidence-summary.json` supplies the compact machine-readable evidence table.
- `renders/analysis/heldout-portfolio-coverage.*` and `heldout-profile-coverage.*` show the frozen size curves and exact profile counts.

The completed supplementary heldout cell-access census inspected **1,286 saved artifacts** containing **34,912 drawn routes**, across the finished source, routing, joint, and edit stages. It found **0 cell-access cross routes**, **0 new unscored native-node findings**, **0 canonical geometry-hash mismatches**, and **0 recorded coverage gaps. No actual cross route was present, so this is an unexercised production path, not proof that the frozen exception is safe. Timeout checkpoints lack complete drawn routes and are outside that geometric census. The separate development census is preserved; neither audit changes a score or gate in this memo.
