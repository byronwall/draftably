# Context-dependent control and warm-engine findings

**Measured development results from unchanged shipped algorithms.** These three strata answer different questions and remain separate. First terminal rows are canonical. No heldout output is read; no algorithm is rerun by this analysis.

## Routing alternatives after layout

Unchanged source compilation at three fixed layout configurations, followed by production routing with three selected scalar presets. Router overrides occur after compilation and cannot change compiler channel spacing.

The 108 joint runs pair three layouts and three selected route presets on 12 bases. There are 36 matched default-routing source runs. All comparable sources and node boxes were checked identical; any mismatch stops analysis. Thus these are routing gains conditional on a layout, not evidence that a router option changes compiler placement.

| Layout | Route alternative | Hard-valid / 12 | New valid | Newly invalid | Changed geometry >1 px | Balanced score delta, both valid |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| engine:boundary-align:RIGHT | clearance-22 | 9 | 0 | 2 | 10 | -1.714 |
| engine:boundary-align:RIGHT | clearance-4 | 11 | 0 | 0 | 8 | -1.459 |
| engine:boundary-align:RIGHT | portGap-28 | 11 | 0 | 0 | 8 | -0.046 |
| engine:force:RIGHT | clearance-22 | 10 | 0 | 1 | 10 | 2.083 |
| engine:force:RIGHT | clearance-4 | 11 | 0 | 0 | 9 | 0.045 |
| engine:force:RIGHT | portGap-28 | 11 | 0 | 0 | 9 | 0.039 |
| tuned:compound-flow:RIGHT:p1 | clearance-22 | 7 | 0 | 4 | 10 | -1.407 |
| tuned:compound-flow:RIGHT:p1 | clearance-4 | 11 | 0 | 0 | 9 | -1.581 |
| tuned:compound-flow:RIGHT:p1 | portGap-28 | 11 | 0 | 0 | 8 | 0.662 |

Across the same three layouts, default routing covers 11/12 bases and 39/55 feasible profile jobs within the frozen bands. Adding the three routing alternatives covers 11/12 and 55/55. This is retrospective choice, not an automatic-policy success rate. The five profiles reuse the frozen score formulas and ±1 defect-index / +10% area / +10% route-length limits.

The joint-only witness list names jobs that still need a routing alternative after the strongest default-routing layout among these three is available. Weak-layout improvements alone are not counted as such witnesses. High clearance can also introduce hard route failures; its individual results must accompany its occasional oracle contribution.

## Directional versus network objectives

Four production engines, raw cold rebuild (warmStart=false, settle=true, maxIterations=640), two respectDirection values, same twelve cases in three families. Not compiler/source behavior and not a warm editing estimand.

| Engine | Respect direction true: successful / valid | False: successful / valid | New valid with false | Newly invalid with false | Changed >1 px | Balanced delta, both valid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| compound-spring | 11 / 10 | 11 / 10 | 0 | 0 | 9 | 28.230 |
| force | 11 / 10 | 11 / 8 | 0 | 2 | 9 | 11.729 |
| grid | 11 / 9 | 11 / 11 | 2 | 0 | 9 | 18.486 |
| stress | 11 / 10 | 11 / 9 | 0 | 1 | 9 | 22.460 |

The original direction-respecting pool covers 11/12 cases and 40/44 feasible profile jobs. Allowing both objective settings covers 11/12 and 44/44. This stratum has four non-edit profiles; stable local editing is inapplicable to cold rebuilds. Eight timeouts remain failures; a later successful alternative is not substituted for them.

The source writer does not serialize `respectDirection`. These raw API results therefore support an advanced capability/prototype, not a claim that an existing source-file control or automatic source selector has this behavior. Authored topology and direction semantics remain distinct from whether the placement objective enforces a reading axis.

## Eleven warm engines on the same native drawing

Eleven shipped warm pass algorithms on twelve native current drawings, with shared prior routes and inherited pins. No new position perturbation, manual patch, scope change, or collapsed-state patch is applied in this 132-run stratum.

| Warm engine | Hard-valid / 12 | New valid vs retain | Newly invalid | Mean adjusted movement px | Changed-side rate | Unique acceptable profile jobs lost on removal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| boundary-align | 11 | 0 | 1 | 25.598 | 0.070 | 6 |
| compound-flow | 12 | 0 | 0 | 31.530 | 0.077 | 1 |
| compound-spring | 11 | 0 | 1 | 25.413 | 0.039 | 0 |
| flow | 11 | 0 | 1 | 26.127 | 0.041 | 0 |
| force | 11 | 0 | 1 | 26.475 | 0.064 | 8 |
| grid | 11 | 0 | 1 | 26.261 | 0.055 | 0 |
| layered | 11 | 0 | 1 | 29.358 | 0.055 | 0 |
| separate | 12 | 0 | 0 | 0.516 | 0.056 | 0 |
| stress | 11 | 0 | 1 | 26.012 | 0.062 | 0 |
| tidy | 11 | 0 | 1 | 25.711 | 0.040 | 0 |
| tree | 12 | 0 | 0 | 30.402 | 0.070 | 0 |

Movement and churn above describe completed outputs, including hard-invalid geometry. Soft profile comparisons require validity. Retaining the current drawing is always available in the portfolio analysis, with zero movement by identity. It is not a fresh engine trial and no source-compile latency is assigned to doing nothing.

| Warm action budget, plus retain | Selected actions | Hard-valid base union | Acceptable / feasible profile jobs |
| ---: | --- | ---: | ---: |
| 0 | retain only | 12 / 12 | 37 / 60 |
| 1 | force | 12 / 12 | 47 / 60 |
| 2 | boundary-align, force | 12 / 12 | 56 / 60 |
| 3 | boundary-align, compound-flow, force | 12 / 12 | 60 / 60 |
| 4 | boundary-align, compound-flow, force, stress | 12 / 12 | 60 / 60 |
| 5 | boundary-align, compound-flow, force, grid, stress | 12 / 12 | 60 / 60 |

Each row is an exhaustive equal-budget subset search over these eleven measured actions with retained current available. It is an oracle upper bound over 12 cases, not a learned selector. The separate ablation table removes each engine from the full pool, then reoptimizes a three-action budget using only remaining engines. Practical unique witnesses include the best remaining geometry, scores, and trial IDs, so a cold-weak engine is not discarded merely from a cold ranking.

This native warm screen is unperturbed. The 80/40 px perturbation plus explicit manual marks belongs to the separate warm-control experiment, and the edited topology/protected views belong to E. An inherited pin or author side remains a gate, but a manual flag is not newly made a hard preservation requirement unless `respectManual` is requested. This distinction prevents crediting a permissive pass as a protected edit success.

## Unsupported scope and unavailable input

The original warm-control stage has 20 unsuccessful trials: 14 explicitly rejected cross-parent selections/neighbourhoods and 6 missing fully routed `architecture-04` references. These remain unsuccessful. They are not completed geometry regressions, and missing-input cases are not evidence that the engine rejected a supported job. Valid-sibling and layout-checkpoint supplements are a separately reported stratum, not replacements.

The 50 supplemental trials finish with 44 successes and 6 timeouts, with no unsupported-scope exception. Scope constrains what may move; it is not quality-ranked as though whole-diagram movement were the same job.

| Supported scope | Executed / 12 | Hard-valid / 12 | Pin/scope violations in completed outputs | Routing hard defects in completed outputs |
| --- | ---: | ---: | ---: | ---: |
| all | 11 | 9 | 0 | 44 |
| selection | 11 | 10 | 0 | 44 |
| neighbourhood | 11 | 10 | 0 | 44 |
| container | 11 | 6 | 0 | 44 |

Architecture-04 uses the existing layout checkpoint because current routing timed out. It supplies no fabricated prior routes. All six supplemental architecture-04 attempts also time out at 15 seconds.

## Timing and replay limits

The raw records preserve operation components, failures, route-cache status, actual settings, solver iterations, before/after boxes and paths. Cache/order effects prevent intrinsic speed conclusions from these one-off context screens; use the cache-bypassed repeated-timing stage. Any proposed UI dispatch or source serialization remains a product change, not measured behavior of this immutable baseline.

Replay the analysis with `python evaluation/analyze-contexts.py`. It opens only the explicitly named development datasets and performs metric calculations and archive checks, with no new layout or route calls.
