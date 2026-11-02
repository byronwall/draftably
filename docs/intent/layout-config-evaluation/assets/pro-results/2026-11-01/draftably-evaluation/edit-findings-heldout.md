# Incremental editing findings — heldout

**Actual shipped source and warm-engine outputs; derived guard analysis is identified separately.** The first terminal result per trial is canonical. Success of execution and hard validity are different columns. The raw records, attempted settings, geometry, references and failures remain available.

## What is being compared

Cold source policies compare each policy after an edit with that same guarded policy before the edit. Warm actions start from the same current-source positions, prior endpoint sides and explicit protection/scope state. These are different questions and are not pooled into one stability ranking. The protected warm `current-tidy` baseline uses `respectManual=true` for the stated job; that is stricter than the shipped raw settings default. Warm action time begins after its edited input exists, so its source preparation cost is retained separately.

The frozen design has four ordinary edits plus a color-only negative control for every base. Direction/format changes requesting global movement retain every movement/churn measurement but incur neither displacement nor side-churn penalty in the stable profile. The ordinary stable score is balanced defects per ten edges + adjusted mean movement / 24 + 5 × changed-side rate. Missing prior route history leaves churn and that composite unavailable; zero is never substituted.

## Completion and validity

| Stage | Planned | Canonical terminal rows | State |
| --- | ---: | ---: | --- |
| edits-current-heldout | 60 | 60 | complete |
| edits-states-heldout | 12 | 12 | complete |
| edits-warm-heldout | 180 | 180 | complete |
| edits-policies-heldout | 120 | 120 | complete |

| Estimand / policy / view | All jobs including color | Executed successfully | Hard-valid all | Ordinary edits valid / attempted | Guard fallbacks | Bases with a failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cold-source / best-single / guarded | 60 | 60 | 55 | 44 / 48 | 1 | 1 |
| cold-source / best-single / raw | 60 | 60 | 54 | 43 / 48 | 0 | 2 |
| cold-source / current-source / raw | 60 | 60 | 52 | 42 / 48 | 0 | 2 |
| cold-source / feature-selector / guarded | 60 | 60 | 55 | 44 / 48 | 1 | 1 |
| cold-source / feature-selector / raw | 60 | 60 | 54 | 43 / 48 | 0 | 2 |
| warm-action / current-tidy / raw | 60 | 59 | 43 | 33 / 48 | 0 | 7 |
| warm-action / group-aware / raw | 60 | 59 | 43 | 33 / 48 | 0 | 7 |
| warm-action / separate-only / raw | 60 | 60 | 47 | 37 / 48 | 0 | 5 |

A hard-invalid completed geometry remains a failed usable outcome. Blocked routes, violated sides/pins/scope, missing objects or edges, and required-intent failures cannot be traded for a smaller area or lower soft score. “Guarded” is derived from the measured outputs using the declared rule; it is not an additional geometry run.

## Movement and churn

| Policy / view | Adjusted mean px | Distant mean px | Changed-side rate | Changed-route rate | Recorded operation median ms | Recorded operation p95 ms | Route-cache hits |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| best-single / guarded | 36.933 | 69.484 | 0.100 | 0.413 | 95.016 | 4214.594 | 30 / 60 |
| best-single / raw | 34.893 | 67.647 | 0.100 | 0.413 | 95.016 | 4214.594 | 30 / 60 |
| current-source / raw | 35.224 | 45.068 | 0.080 | 0.385 | 43.440 | 7251.702 | 18 / 60 |
| feature-selector / guarded | 27.917 | 56.701 | 0.104 | 0.405 | 55.504 | 1438.295 | 46 / 60 |
| feature-selector / raw | 25.877 | 54.864 | 0.104 | 0.405 | 55.504 | 477.014 | 46 / 60 |
| current-tidy / raw | 18.906 | 18.640 | 0.124 | 0.708 | 86.901 | 11302.672 | 11 / 60 |
| group-aware / raw | 18.446 | 18.660 | 0.138 | 0.689 | 11.125 | 4980.038 | 52 / 60 |
| separate-only / raw | 3.267 | 2.250 | 0.118 | 0.340 | 88.160 | 9556.171 | 22 / 60 |

Movement/churn summaries above exclude color controls and requested global reflow; they describe completed measured geometry, including diagnostic invalid geometry. Quality-score summaries are conditional on valid output. The full table includes raw and adjusted means/maxima, exact contributing counts, per-family medians, local/distant object counts, tails and worst witnesses. A node deliberately nudged 56 px can exceed the 48 px *subsequent repair* cap relative to the pre-edit drawing; those are different origins. The cap must be checked against repair input, not against the pre-edit reference.

Operation times are observed per-trial components in this environment, with routing-cache hits recorded. Cache reuse differs by policy and trial order, so the timing columns must not be used to claim that one warm algorithm is intrinsically faster; use the separate cache-bypassed repeated-timing stage. They do not establish an end-to-end pointer/UI latency budget. Guarded times add the raw attempt and current-source fallback operation as a **derived serial cost estimate**. They do not grant a failed candidate a free fallback. Warm input preparation is a separate measured source run and is not hidden inside a claimed fast source-edit action.

## Color-only negative control

| Policy / view | Controls | Hard-valid controls | Full geometry exact / available | Full geometry within 1 px | Nodes exact / available |
| --- | ---: | ---: | --- | ---: | --- |
| best-single / guarded | 12 | 11 | 12 / 12 | 12 | 12 / 12 |
| best-single / raw | 12 | 11 | 12 / 12 | 12 | 12 / 12 |
| current-source / raw | 12 | 10 | 12 / 12 | 12 | 12 / 12 |
| feature-selector / guarded | 12 | 11 | 12 / 12 | 12 | 12 / 12 |
| feature-selector / raw | 12 | 11 | 12 / 12 | 12 | 12 / 12 |
| current-tidy / raw | 12 | 10 | 12 / 12 | 12 | 12 / 12 |
| group-aware / raw | 12 | 10 | 12 / 12 | 12 | 12 / 12 |
| separate-only / raw | 12 | 10 | 12 / 12 | 12 | 12 / 12 |

The exact test covers boxes, selected sides and corresponding route points; the 1 px test uses elementwise box tolerance and Euclidean route-point tolerance, not rounding bins. Production path/halo-string equality is retained separately. Appearance colors are expected to change. For warm color controls the frozen policy retains positions and reroutes with shared history; it does not invoke an unsolicited layout pass. Missing prior route geometry leaves the full path comparison unavailable while the node-only check can still be reported.

## Requested direction and action applicability

Bounded warm Repair/Separate runs on a global direction request are diagnostic comparisons, not substitutes for a rebuild. The proposed editing workflow dispatches direction/format changes to its source rearrangement path; local warm actions handle local edits, and color retains positions. A hard-valid Separate result can simply keep the old orientation. The original hard-valid labels remain frozen; no new hard gate is silently added after inspection.

| Policy / view | Direction requests | Projected tool setting differs from request | Unchanged nodes on a direction request |
| --- | ---: | ---: | ---: |
| best-single / guarded | 11 | 0 | 4 |
| best-single / raw | 11 | 0 | 4 |
| current-source / raw | 11 | 10 | 2 |
| feature-selector / guarded | 11 | 0 | 6 |
| feature-selector / raw | 11 | 0 | 6 |
| current-tidy / raw | 11 | 0 | 1 |
| group-aware / raw | 11 | 0 | 1 |
| separate-only / raw | 11 | 0 | 9 |

The projected tool-setting column is NOT a direction-compliance count: `projectScene` only copies a root engine direction into `doc.settings`, while ordinary recipe layouts retain the tool default (`src/dsl/project.ts:102–112`). The forward-axis diagnostic records actual center progress, reverse/tied edges and axis dominance before/after, including cycles, returns and hidden descendants. It is evidence to inspect, not a universal direction-compliance test. In development, `presentation-03` explicitly changes to `direction=down fit=wide`, but current source compilation keeps the exact earlier node geometry. The source fit search tries both directions (`src/dsl/compile.ts:171–190`). Separate also keeps those nodes while its invocation setting says DOWN. Its apparent one-job hard-defect rescue over warm tidy therefore does not demonstrate completion of the requested direction task. The UI must resolve and explain direction-versus-format precedence before promising independent controls. Applicable warm-only summaries exclude requested global-reflow diagnostics and are saved separately.

## Paired differences and base-cluster intervals

Each bootstrap draw resamples whole base diagrams with replacement and retains their five-edit bundles. There are 2,000 draws with a recorded deterministic seed. Ordinary-edit/movement eligibility is applied within the selected bundle; edits are never treated as independent people. The intervals describe this synthetic sample and do not establish user preference or statistical significance in a population.

| Comparison | New invalid jobs | Rescued jobs | Stable score paired delta [95% base interval] | Base clusters |
| --- | ---: | ---: | --- | ---: |
| best-single guarded vs current-source | 0 | 3 | -3.594 [-10.740, 1.649] | 11 |
| best-single raw vs current-source | 1 | 3 | -3.608 [-10.754, 1.625] | 11 |
| feature-selector guarded vs current-source | 0 | 3 | -4.246 [-12.079, 1.296] | 11 |
| feature-selector raw vs current-source | 1 | 3 | -4.260 [-12.093, 1.263] | 11 |
| group-aware raw vs current-tidy | 0 | 0 | 0.022 [0.000, 0.067] | 10 |
| separate-only raw vs current-tidy | 0 | 4 | -5.065 [-8.267, -2.122] | 10 |

Validity and latency contrasts retain failed attempts. Soft/stability paired contrasts require both outputs valid and report their exact contributing jobs and bases. This avoids treating a missing or invalid result as a low-cost drawing; it also means a conditional soft improvement cannot cancel a validity regression.

## Guard and reference integrity

Only the named cold proposals `best-single` and `feature-selector` use the hard-validity guard. If the raw candidate is invalid/failed and the current edited source is valid, the effective result uses that current output. No favorable-soft-score fallback is allowed. Movement and churn are recomputed against the same policy’s pre-edit reference, so fallback does not borrow the current policy’s more favorable reference. Both raw and guarded rows remain in the data. A current-source fallback is not assumed to satisfy a different warm manual/scope job, so no warm guard is credited.

Canonical successful artifacts are checked with the original geometry-signature hash. Complete references are checked when a canonical row is available. A layout checkpoint is labeled partial and supplies no invented prior routes. The derivation helper imports only the frozen metric serialization/edit functions; it does not call a layout or routing algorithm.

## Interpretation and next decision

Use the per-job hard and intent gates first, then inspect movement/churn and rendered witnesses. A warm method that keeps positions on one task can still fail a pin, container or route constraint elsewhere. Specialist `compile-recipe` jobs are compiler escapes and are not credited as successful raw warm-engine calls. These results test the stated policies and baselines; they are not evidence to delete an internal implementation solely because it loses one aggregate.

Replay: `python evaluation/analyze-edits.py --split heldout` plus `--allow-heldout-after-freeze` for the heldout report.
