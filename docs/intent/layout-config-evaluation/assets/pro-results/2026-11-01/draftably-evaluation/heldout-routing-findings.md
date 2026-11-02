# Frozen heldout routing and joint-context findings

**Measured routing on unchanged source positions; stored development choices only.** No heldout fitting or configuration selection was performed. The original source trials retain their full-pipeline outcomes. Routing trials on a completed layout or checkpoint answer a narrower question and do not establish new cold-render latency or default safety.

## Completion and input integrity

| Stage | Planned | Canonical terminal | Status counts |
| --- | ---: | ---: | --- |
| screen-heldout | 599 | 599 | {'ok': 481, 'timed_out': 118} |
| documented-default-heldout | 23 | 23 | {'ok': 19, 'timed_out': 4} |
| selected-presets-heldout | 207 | 207 | {'ok': 173, 'timed_out': 34} |
| routing-current-heldout | 72 | 72 | {'ok': 57, 'timed_out': 15} |
| joint-heldout | 216 | 216 | {'ok': 186, 'timed_out': 30} |

The cohort has 24 bases in 12 families, including 14 declared common jobs. All successful candidate documents preserve their matched source document exactly except routing settings. 54 trials use explicitly partial layout references; these are not counted as completed default-routing baselines. All canonical successful artifacts used in scoring and direct comparisons passed the geometry-signature check.

## Current-source positions: fixed routes and frozen union

The comparison universe is current source routing plus the three frozen numeric settings. It does not contain the other development-only scalar settings or imputed continuous optima. Retain-current plus alternatives is a Compare upper bound, not a claim that an automatic policy chooses the right alternative.

| Fixed route | Valid /24 | Valid current defaults | New valid | New invalid | Partial refs | Balanced delta, both valid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| clearance-22 | 12 | 16 | 2 | 6 | 6 | -1.446 |
| clearance-4 | 16 | 16 | 0 | 0 | 6 | -1.081 |
| portGap-28 | 16 | 16 | 0 | 0 | 6 | 0.060 |

### Current positions: exact profile denominators

| Policy | Cohort | Profile | Acceptable / all | Acceptable / feasible | Current-valid hard-loss bases |
| --- | --- | --- | ---: | ---: | ---: |
| current-default | all | readable | 11 / 24 | 11 / 18 | 0 |
| current-default | all | compact | 9 / 24 | 9 / 18 | 0 |
| current-default | all | traceable | 9 / 24 | 9 / 18 | 0 |
| current-default | all | stable | 9 / 24 | 9 / 18 | 0 |
| current-default | all | specialist | 9 / 24 | 9 / 18 | 0 |
| current-default | common | readable | 8 / 14 | 8 / 12 | 0 |
| current-default | common | compact | 7 / 14 | 7 / 12 | 0 |
| current-default | common | traceable | 7 / 14 | 7 / 12 | 0 |
| current-default | common | stable | 7 / 14 | 7 / 12 | 0 |
| current-default | common | specialist | 7 / 14 | 7 / 12 | 0 |
| clearance-22 | all | readable | 7 / 24 | 7 / 18 | 6 |
| clearance-22 | all | compact | 10 / 24 | 10 / 18 | 6 |
| clearance-22 | all | traceable | 10 / 24 | 10 / 18 | 6 |
| clearance-22 | all | stable | 10 / 24 | 10 / 18 | 6 |
| clearance-22 | all | specialist | 10 / 24 | 10 / 18 | 6 |
| clearance-22 | common | readable | 3 / 14 | 3 / 12 | 5 |
| clearance-22 | common | compact | 5 / 14 | 5 / 12 | 5 |
| clearance-22 | common | traceable | 5 / 14 | 5 / 12 | 5 |
| clearance-22 | common | stable | 5 / 14 | 5 / 12 | 5 |
| clearance-22 | common | specialist | 5 / 14 | 5 / 12 | 5 |
| clearance-4 | all | readable | 14 / 24 | 14 / 18 | 0 |
| clearance-4 | all | compact | 12 / 24 | 12 / 18 | 0 |
| clearance-4 | all | traceable | 12 / 24 | 12 / 18 | 0 |
| clearance-4 | all | stable | 12 / 24 | 12 / 18 | 0 |
| clearance-4 | all | specialist | 12 / 24 | 12 / 18 | 0 |
| clearance-4 | common | readable | 10 / 14 | 10 / 12 | 0 |
| clearance-4 | common | compact | 9 / 14 | 9 / 12 | 0 |
| clearance-4 | common | traceable | 9 / 14 | 9 / 12 | 0 |
| clearance-4 | common | stable | 9 / 14 | 9 / 12 | 0 |
| clearance-4 | common | specialist | 9 / 14 | 9 / 12 | 0 |
| portGap-28 | all | readable | 11 / 24 | 11 / 18 | 0 |
| portGap-28 | all | compact | 9 / 24 | 9 / 18 | 0 |
| portGap-28 | all | traceable | 7 / 24 | 7 / 18 | 0 |
| portGap-28 | all | stable | 9 / 24 | 9 / 18 | 0 |
| portGap-28 | all | specialist | 9 / 24 | 9 / 18 | 0 |
| portGap-28 | common | readable | 7 / 14 | 7 / 12 | 0 |
| portGap-28 | common | compact | 6 / 14 | 6 / 12 | 0 |
| portGap-28 | common | traceable | 5 / 14 | 5 / 12 | 0 |
| portGap-28 | common | stable | 7 / 14 | 7 / 12 | 0 |
| portGap-28 | common | specialist | 7 / 14 | 7 / 12 | 0 |
| frozen-three-route-union | all | readable | 18 / 24 | 18 / 18 | 0 |
| frozen-three-route-union | all | compact | 18 / 24 | 18 / 18 | 0 |
| frozen-three-route-union | all | traceable | 18 / 24 | 18 / 18 | 0 |
| frozen-three-route-union | all | stable | 18 / 24 | 18 / 18 | 0 |
| frozen-three-route-union | all | specialist | 18 / 24 | 18 / 18 | 0 |
| frozen-three-route-union | common | readable | 12 / 14 | 12 / 12 | 0 |
| frozen-three-route-union | common | compact | 12 / 14 | 12 / 12 | 0 |
| frozen-three-route-union | common | traceable | 12 / 14 | 12 / 12 | 0 |
| frozen-three-route-union | common | stable | 12 / 14 | 12 / 12 | 0 |
| frozen-three-route-union | common | specialist | 12 / 14 | 12 / 12 | 0 |
| retain-current-plus-three | all | readable | 18 / 24 | 18 / 18 | 0 |
| retain-current-plus-three | all | compact | 18 / 24 | 18 / 18 | 0 |
| retain-current-plus-three | all | traceable | 18 / 24 | 18 / 18 | 0 |
| retain-current-plus-three | all | stable | 18 / 24 | 18 / 18 | 0 |
| retain-current-plus-three | all | specialist | 18 / 24 | 18 / 18 | 0 |
| retain-current-plus-three | common | readable | 12 / 14 | 12 / 12 | 0 |
| retain-current-plus-three | common | compact | 12 / 14 | 12 / 12 | 0 |
| retain-current-plus-three | common | traceable | 12 / 14 | 12 / 12 | 0 |
| retain-current-plus-three | common | stable | 12 / 14 | 12 / 12 | 0 |
| retain-current-plus-three | common | specialist | 12 / 14 | 12 / 12 | 0 |

### Frozen joint choices: exact profile denominators

| Policy | Cohort | Profile | Acceptable / all | Acceptable / feasible | Current-valid hard-loss bases |
| --- | --- | --- | ---: | ---: | ---: |
| frozen-joint-global | all | readable | 8 / 24 | 8 / 19 | 0 |
| frozen-joint-global | all | compact | 9 / 24 | 9 / 19 | 0 |
| frozen-joint-global | all | traceable | 11 / 24 | 11 / 19 | 0 |
| frozen-joint-global | all | stable | 11 / 24 | 11 / 19 | 0 |
| frozen-joint-global | all | specialist | 11 / 24 | 11 / 19 | 0 |
| frozen-joint-global | common | readable | 5 / 14 | 5 / 12 | 0 |
| frozen-joint-global | common | compact | 6 / 14 | 6 / 12 | 0 |
| frozen-joint-global | common | traceable | 9 / 14 | 9 / 12 | 0 |
| frozen-joint-global | common | stable | 9 / 14 | 9 / 12 | 0 |
| frozen-joint-global | common | specialist | 9 / 14 | 9 / 12 | 0 |
| frozen-joint-triple | all | readable | 17 / 24 | 17 / 19 | 0 |
| frozen-joint-triple | all | compact | 15 / 24 | 15 / 19 | 0 |
| frozen-joint-triple | all | traceable | 14 / 24 | 14 / 19 | 0 |
| frozen-joint-triple | all | stable | 16 / 24 | 16 / 19 | 0 |
| frozen-joint-triple | all | specialist | 16 / 24 | 16 / 19 | 0 |
| frozen-joint-triple | common | readable | 12 / 14 | 12 / 12 | 0 |
| frozen-joint-triple | common | compact | 11 / 14 | 11 / 12 | 0 |
| frozen-joint-triple | common | traceable | 10 / 14 | 10 / 12 | 0 |
| frozen-joint-triple | common | stable | 12 / 14 | 12 / 12 | 0 |
| frozen-joint-triple | common | specialist | 12 / 14 | 12 / 12 | 0 |
| default-three-layouts | all | readable | 11 / 24 | 11 / 19 | 0 |
| default-three-layouts | all | compact | 11 / 24 | 11 / 19 | 0 |
| default-three-layouts | all | traceable | 12 / 24 | 12 / 19 | 0 |
| default-three-layouts | all | stable | 14 / 24 | 14 / 19 | 0 |
| default-three-layouts | all | specialist | 14 / 24 | 14 / 19 | 0 |
| default-three-layouts | common | readable | 7 / 14 | 7 / 12 | 0 |
| default-three-layouts | common | compact | 7 / 14 | 7 / 12 | 0 |
| default-three-layouts | common | traceable | 9 / 14 | 9 / 12 | 0 |
| default-three-layouts | common | stable | 10 / 14 | 10 / 12 | 0 |
| default-three-layouts | common | specialist | 10 / 14 | 10 / 12 | 0 |
| all-nine-joint | all | readable | 19 / 24 | 19 / 19 | 0 |
| all-nine-joint | all | compact | 19 / 24 | 19 / 19 | 0 |
| all-nine-joint | all | traceable | 18 / 24 | 18 / 19 | 0 |
| all-nine-joint | all | stable | 19 / 24 | 19 / 19 | 0 |
| all-nine-joint | all | specialist | 19 / 24 | 19 / 19 | 0 |
| all-nine-joint | common | readable | 12 / 14 | 12 / 12 | 0 |
| all-nine-joint | common | compact | 12 / 14 | 12 / 12 | 0 |
| all-nine-joint | common | traceable | 11 / 14 | 11 / 12 | 0 |
| all-nine-joint | common | stable | 12 / 14 | 12 / 12 | 0 |
| all-nine-joint | common | specialist | 12 / 14 | 12 / 12 | 0 |
| all-twelve-scoped-pool | all | readable | 19 / 24 | 19 / 19 | 0 |
| all-twelve-scoped-pool | all | compact | 19 / 24 | 19 / 19 | 0 |
| all-twelve-scoped-pool | all | traceable | 19 / 24 | 19 / 19 | 0 |
| all-twelve-scoped-pool | all | stable | 19 / 24 | 19 / 19 | 0 |
| all-twelve-scoped-pool | all | specialist | 19 / 24 | 19 / 19 | 0 |
| all-twelve-scoped-pool | common | readable | 12 / 14 | 12 / 12 | 0 |
| all-twelve-scoped-pool | common | compact | 12 / 14 | 12 / 12 | 0 |
| all-twelve-scoped-pool | common | traceable | 12 / 14 | 12 / 12 | 0 |
| all-twelve-scoped-pool | common | stable | 12 / 14 | 12 / 12 | 0 |
| all-twelve-scoped-pool | common | specialist | 12 / 14 | 12 / 12 | 0 |

The JSON/CSV tables also report all three frozen routing weightings, niche counts, per-family counts, upper-tail finite regret, and separate base/family bootstrap intervals. Profile pooling is descriptive only; it cannot conceal a failed individual common-job profile. Oracle-infeasible cases remain in absolute denominators.

## Joint policy interpretation

The fixed global choice remains `engine:boundary-align:RIGHT|routing:clearance-4`. The three-combination set remains: `engine:boundary-align:RIGHT|routing:clearance-4`; `engine:force:RIGHT|routing:clearance-22`; `tuned:compound-flow:RIGHT:p1|routing:clearance-4`. Neither is changed in response to these outcomes.

The joint scoped oracle has three default-routing layout references and nine preselected layout×route alternatives. The all-nine result and the three-layout default result are retrospective upper bounds. The explicit specialist escape uses the existing source recipe when generic root rebuilding is inapplicable; nominal engine labels are not credited as independently solving that specialist case.

| Fixed global versus current source | Valid candidate | Valid current | New valid | New invalid |
| --- | ---: | ---: | ---: | ---: |
| all | 19 / 24 | 16 / 24 | 3 | 0 |
| common | 12 / 14 | 11 / 14 | 1 | 0 |
| niche | 7 / 10 | 5 / 10 | 2 | 0 |

Matched-layout direct comparisons, including each hard regression and worst valid soft regression, are saved separately. A successful route from a checkpoint can be a useful diagnostic rescue; it does not retroactively turn the original source timeout into a success. The main cold-source acceptance decision remains the frozen full-pipeline C/G analysis.

## Timing and budget sensitivity

Derived serial estimates are available for 288/288 route trials. 0 hard-valid route outputs exceed 15,000 ms in the derived compile-plus-route-worker estimate. These remain their observed route-only outcomes in primary tables; the separate budget sensitivity reports eligibility without changing geometric labels.

The estimate adds the canonical source compile component—or its saved checkpoint component—to the actual route worker time. Missing compile time remains unknown. Cached routes, completed layouts, task scheduling and process startup differ from a fresh cold render, so this is neither an end-to-end latency measurement nor permission to advertise a faster default. A portfolio also requires multiple computations; its oracle coverage is not the latency of one selected route.

## Stability, uncertainty, and inference limits

All candidates receive empty router history. Workers record static before/after side/path differences, but the static five-profile projection omits that incidental edit block: this reproduces development source scoring, where the stable profile is balanced DI. Genuine small-edit prior-side stability is evaluated in E and the shared-history routing stratum.

Each 2,000-draw bootstrap resamples whole bases with all their correlated profiles, or whole families with all member bases. These intervals express uncertainty in this synthetic sample. They do not count alternate settings as independent users or establish perceptual equivalence. Conditional score intervals require both outputs valid; validity intervals keep failed and timed-out cases.

Replay: `python evaluation/analyze-heldout-routing.py --analyze --allow-heldout-after-freeze`. Without both flags, the program validates only policy/task definitions and opens no heldout outcomes. The pre-outcome interpretation is preserved in `data/analysis/heldout-routing-analysis-design.json`.
