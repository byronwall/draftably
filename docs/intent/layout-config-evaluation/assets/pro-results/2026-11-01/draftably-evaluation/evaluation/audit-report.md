# Independent pre-heldout contract audit

**Scope:** read-only review of the supplied experiment contract, frozen specifications, runner, metric and intent checks, analysis code, development task and result metadata, source dependencies, and regression-test invocation accounting. This audit executed no geometry algorithm, changed no product or metric source, and read no heldout results. Findings describe the development state at the audit, before policy sealing; later completion evidence belongs in the final run manifest and reports.

## Findings that affect the final claims

1. **The six-engine minimum is not unique.** The development dependency-aware combined sweep contains two feasible minimum sets under equal-family weighting: `{boundary-align, tidy, force, layered, tree, grid}` and `{boundary-align, compound-spring, tidy, force, layered, grid}`. The chosen set can be recommended using the declared objective and its operational tradeoffs. The evidence does not make every member of that chosen set uniquely indispensable. The reported minimum of additional configurations is conditional on the chosen engine set and the retained native/authored baselines; it is not a joint proof of the global engine-and-configuration optimum.

2. **One route-obstacle metric exception is broader than its intended terminal-cell exemption.** In `metrics.mjs`, the presence of `r.cross` skips every obstacle node in the route-through-node check. Production `routes.ts` uses this metadata to draw the terminal segment to an interior cell, for which some crossing is intentional. Unrelated obstacles elsewhere on such a route also escape this particular check. A read-only census found no `cross` routes in the 1,094 complete C-development artifacts, so that development comparison is unaffected by this issue. Before heldout, either freeze a narrow analytical correction with explicit calibration and provenance, or retain the metric and report this coverage limitation. Do not silently modify a frozen metric after seeing heldout output.

3. **The registered trial budget and total production API calls are different quantities.** The runner caps distinct reserved task IDs at 11,500 and labels 500 additional runs as an ancillary allowance. That is not evidence that every test, browser action, compile, nested engine computation, or repeated timing call fits within a global 12,000-call bound. Several ancillary paths were not instrumented. The final report should state the exact registered experimental-trial count, known ancillary invocation counts, and the remaining accounting uncertainty separately. It should not equate assertions with algorithm executions or certify a total API-call ceiling that was not measured.

4. **Execution success, geometric validity, and fulfillment of an editing request must remain separate.** Existing timeouts and unsupported warm selection scopes belong in their original denominators. Follow-up supported-input probes are supplementary evidence and cannot replace those failures. A warm bounded pass on a direction-change task is not evidence that it fulfilled a requested global direction change. The `presentation-03` direction/fit interaction is an explicitly unscored intent diagnostic under the present checker. Do not describe it as measured successful intent fulfillment.

## Resolved runner issue

The original heldout entry guard checked only whether a policy-freeze file existed. The root subsequently hardened it. This audit verified the updated source: heldout execution requires `frozen === true`, a corpus hash matching the policy's split hash, the baseline matching the protocol, and a metric-source hash matching the frozen protocol. The run manifest records the SHA-256 of the actual frozen policy bytes. This is a meaningful improvement over a presence-only guard.

## Checks that passed

- The corpus, routing fixtures, settings specification, metric source and intent source matched their recorded frozen hashes at the audit.
- The corpus has 72 bases in 12 families, with 48 development and 24 heldout bases. No heldout result JSONL was present at the audit census.
- Each of the 20 mandatory source-parameter/control strata has 12 registered bases spanning at least three families. The source-settings run had 756 terminal outcomes: 696 completed and 60 timed out. The coverage statement must say **attempted** where appropriate, rather than claiming 12 full-pipeline successes in every stratum.
- All 12 `respectManual=true` tasks protect at least two manually positioned, unpinned nodes, so that precondition is not vacuous.
- The analysis keeps the first terminal result for a trial. Later duplicate attempts cannot improve the original coverage rate. Artifact-based recovery retains missing timing as missing; exact recovery from immutable attempt records is a different, explicitly documented case.
- Geometry archive checks validate the saved geometry signature: boxes, ports and polylines. They do not prove byte identity of whole archives, SVG path rendering, or halos.
- The final portfolio oracle uses the shared union of eligible defaults, selected presets and current/recipe/documented candidates. Unselected tuning candidates are not silently promoted into the full main oracle.
- The heldout analysis consumes the frozen policy, configuration choices and selector rather than fitting them on heldout results.
- The hierarchical bootstrap resamples families and then bases; it retains correlated preference profiles within each base. The edit analysis clusters edits by base. Trial rows are not treated as independent users.
- The dependency-aware analysis retains nested engine dependencies when a root layout is replaced and excludes authored/current candidates whose required engines have been removed. UI fallback and physical engine removal are distinct scenarios.
- The explicit-port comparison was independently checked against compatible automatic routing-interaction configurations on the same inputs. Those interaction rows did not improve the best automatic single-setting baseline; they only tied it. Moved/history inputs were excluded from that comparison.
- The new source-control replacement design has matched bounded candidate budgets: default plus one or two alternatives. It is a bounded compensating search, not proof of a continuous optimum or a substitute for authored semantics such as root choice, folding, order, or target format.

## Ancillary invocation accounting from source and logs

These are source-derived counts for one recorded script execution, not newly executed tests. Different columns describe different units and must not be added indiscriminately.

| Activity | Distinct top-level scenarios or configurations | Known calls or work | Qualification |
| --- | ---: | --- | --- |
| `tests/engine-layout.mjs` | 100 candidate scenarios | 99 `LayoutLab.compute` calls and 57 `RouteLab.compute` calls | The 55 broad cases are included. The reported 195 assertions are not 195 runs. A layout-plus-routing scenario contributes calls to both APIs. |
| `tests/engine-sculpt.mjs` | 126 invocations | 15 journey calls and 111 dab calls; the journeys call `LayoutLab.compute` 15 times | Dabs are editing invocations; they are not all whole-graph engine runs. |
| Historical audit | 45 source configurations | 135 CLI compilations: check, JSON inspect and SVG inspect for each configuration | Nested engine/router calls per compilation were not instrumented. |
| Metric calibration | 20 analytical fixtures | Zero production geometry runs for those analytical fixtures | Analytical fixtures should not be counted as algorithm trials. |
| Router calibration and sanity | 15 known invocations | Seven router calibration calls, including the pre-freeze correction, plus eight production sanity calls | Keep these separate from the 20 analytical fixtures. |
| Browser layout proof | Assertion count is not a scenario count | Eight explicit CLI inspect calls in the proof source | Browser compiles, candidate comparisons, brush movement, and redraw-driven calls were not metered. |
| Browser file-session proof | Assertion count is not a scenario count | Four explicit CLI inspect calls in the proof source | Browser event-driven calls were not metered. |
| General unit suite | Not recoverable from assertion totals | The log records 392 passed, five failed and eight skipped tests | Engine invocation totals were not instrumented; this is not a wholly passing suite. |

There is no defensible finite upper bound for all ancillary engine invocations from these logs alone. Known script calls and explicit CLI compiles are useful lower-level accounting evidence, but they do not establish that the 500 allowance covers all unmetered work. Conversely, repeated or nested engine calls do not automatically represent additional distinct experimental configurations. The final budget statement must identify its counting unit.

## Mandatory completion checklist for the root

- Complete the registered timing repetitions with the intended one-worker measurement conditions; report timeout and missing-time treatment alongside the timing summaries.
- Complete and analyze the 336 source-control replacement trials and the 50 supported-input warm follow-up probes. Preserve the original main-run failures and label the follow-ups as development diagnostics.
- Reconcile task manifests against first-terminal results and immutable attempt records. Keep the nine artifact-recovered outcomes, the exact immutable recovery, duplicate attempts, null timings and timeouts auditable.
- Seal the policy only after the declared development decisions, selector, engine and configuration choices, calibration bands, dependency rules and material metric/intent limitations are fixed. Preserve the hash-linked freeze and run metadata.
- Execute the registered heldout stages using that frozen policy. Do not refit or revise the policy using heldout outcomes. Report the deployment selector separately from retrospective oracle coverage.
- Complete at least 48 blinded pairs overall, including heldout pairs; save the blinded judgments before revealing algorithm identities.
- Produce the required family/base clustered intervals, alternate weighting and calibration-band sensitivity, source-control and engine/configuration ablations, and exact absolute and feasible-case denominators.
- Finish the source inventory and dispositions, measured recommendation, editing UI decision, diagrams, raw data, replay instructions, artifact checksums, downloadable bundles and final immutable-baseline verification.
- Keep measured findings, source-derived facts, unscored diagnostics and proposed product behavior visibly distinct in the final report. State the nested-call accounting uncertainty and metric coverage limits rather than converting them into unmeasured success claims.

## Audit provenance

Primary materials reviewed: `supplied-protocol.md`, the supplied prompt and protocol addenda; `run.mjs`, `metrics.mjs`, `intent.mjs`, recovery/archive helpers; `analyze-portfolio.py`, `analyze-dependencies.py`, `layout-control-ablation.py`; frozen manifests/specifications; development task and result metadata; engine-layout/sculpt test sources, browser proof sources, the historical audit script and production route construction. This is a methodological/source audit of the pre-heldout state, not an independent rerun of the experiment.
