# Independent execution and accounting audit

**Snapshot:** 2026-11-02T00:23:31.039390+00:00. Read-only audit; zero algorithms executed. Heldout outcome rows, attempt records and geometry were excluded. Heldout task definitions and run provenance were inspected.

## Budget conclusion

The manifests currently register **8,203 distinct task IDs**: **6,714 development** and **1,489 heldout**. The development files contain **6,714 canonical terminal outcomes** and **6,721 raw terminal rows**, including **7 duplicate attempts**. Every planned development trial has a terminal outcome.

The already prescribed heldout cold-policy edit stage currently has 120/120 registered trials. Accounting for the 0 not yet emitted gives a projected **8,203 main trial IDs**. Adding the full reserved 500 ancillary allowance gives **8,703**, leaving **3,297** below the user's 12,000 distinct-geometry-trial ceiling. This verifies the registered/planned budget arithmetic. It does not prove that unmetered ancillary work stayed within its allowance.

**A complete all-session distinct-trial total cannot be certified from the saved evidence.** Browser activity, general unit tests and exploratory calibration calls were not exhaustively metered. No observed count establishes an exceedance. Total production API calls are a different unit and are not certified below 12,000. One registered trial can call several nested layout engines, invoke routing, or reuse cached routes; repetitions are conservatively charged as separate task IDs.

## Development reconciliation

| Stage | Planned IDs | Canonical terminal | OK / timeout / failed | Extra terminal rows | Immutable attempt files |
| --- | ---: | ---: | --- | ---: | ---: |
| documented-default-development | 46 | 46 | 43 / 3 / 0 | 0 | 0 |
| edits-current-development | 60 | 60 | 60 / 0 / 0 | 0 | 0 |
| edits-policies-development | 120 | 120 | 120 / 0 / 0 | 0 | 120 |
| edits-states-development | 12 | 12 | 12 / 0 / 0 | 0 | 0 |
| edits-warm-development | 180 | 180 | 180 / 0 / 0 | 0 | 0 |
| identity-development | 240 | 240 | 240 / 0 / 0 | 0 | 0 |
| interactions-layout | 96 | 96 | 96 / 0 / 0 | 0 | 96 |
| interactions-routing | 432 | 432 | 432 / 0 / 0 | 0 | 0 |
| joint-development | 108 | 108 | 108 / 0 / 0 | 0 | 108 |
| layout-control-ablation | 336 | 336 | 302 / 34 / 0 | 0 | 336 |
| network-direction | 96 | 96 | 88 / 8 / 0 | 0 | 96 |
| optional-scale | 6 | 6 | 0 / 6 / 0 | 0 | 6 |
| prepare-routing | 24 | 24 | 24 / 0 / 0 | 0 | 0 |
| sanity | 20 | 20 | 20 / 0 / 0 | 0 | 20 |
| screen-development | 1198 | 1198 | 1094 / 104 / 0 | 4 | 0 |
| selected-presets-development | 306 | 306 | 278 / 28 / 0 | 0 | 0 |
| settings-layout | 756 | 756 | 696 / 60 / 0 | 3 | 0 |
| settings-routing | 984 | 984 | 984 / 0 / 0 | 0 | 0 |
| settings-warm | 444 | 444 | 424 / 0 / 20 | 0 | 444 |
| timing-development | 720 | 720 | 720 / 0 / 0 | 0 | 720 |
| tuning-development | 480 | 480 | 480 / 0 / 0 | 0 | 0 |
| warm-targeted | 50 | 50 | 44 / 6 / 0 | 0 | 50 |

Canonical development statuses: **{'ok': 6445, 'timed_out': 249, 'failed': 20}**. `OK` means execution completed, not that the geometry or requested intent passed. Missing planned development IDs: **0**; unplanned development results: **0**; missing referenced successful geometry/checkpoint artifacts: **0**.

There are **1,996 immutable development attempt files** covering **1,996 IDs**. They are copies of attempt evidence, not additional trials. Immutable persistence began after some earlier stages, so absence of such a file for an earlier saved result is not a missing trial. Immutable records without a matching summary row after removing the exact-recovery provenance pointer: **0**.

Recovery records contain **9 artifact-based reconstructions** and **1 exact immutable-record restoration**. Artifact-only missing timing/cache fields stay missing. Failed or timed-out originals are retained; later successes are not substituted. Recovery creates no new algorithm invocation.

## Freeze and baseline integrity

- Policy sealed at **2026-11-01T23:58:46.719982+00:00**; SHA-256 **9e03b185e72525bcd3bd0bf3b27c9aadc42f09551853005afc349e35ba915649** agrees with its sidecar.
- All **5** checked protocol/addendum hashes match: **True**.
- All **9** frozen development-evidence hashes match: **True**.
- All **22** sealed development stage task/result hashes and counts match: **True**.
- Of **61** frozen code/report hashes, the mismatches are: **['evaluation/enrich-inventory-development.py', 'evaluation/prepare-replay.py', 'evaluation/replay-all.sh']**.
- The preserved frozen-development snapshot contains **61** files; all copies exactly match their sealed hashes: **True**.
- Immutable baseline verification: **451 files**, **0 missing**, **0 changed**.

The one documented reporting amendment changes only the literal disclosure of ordinary-edit versus color-control denominators in `enrich-inventory-development.py`. Preserved before/after scripts and the amendment record allow independent reconstruction. The old hash matches the seal, the new hash matches the saved amended script, and replacing exactly the declared literal reproduces the new file. No frozen policy, metric, selection formula, or raw result was changed by that amendment.

Two additional current files differ from their preserved sealed versions for replay integration. `prepare-replay.py` copies blinded pair specifications into a fresh replay directory without copying original judgments as though they applied to newly rendered output. `replay-all.sh` adds development/heldout edit-prediction regeneration before dependent task generation, the six optional scale trials, the 72 current-source and 216 joint heldout routing trials, and final reporting/audit commands. The exact diffs and before/after hashes are recorded in the JSON. These are replay coverage and ordering changes; the policy, metric, adapter and worker implementations remain sealed. These code changes themselves did not execute geometry trials.

Heldout run provenance is listed in the JSON without result counts. Recorded start times must follow the seal and record the same policy hash. This audit does not claim heldout completion, quality, or acceptance.

## Ancillary evidence and calibration erratum

**This section corrects the calibration accounting in the earlier, now hash-sealed `audit-report.md`; that file is preserved as historical evidence.** The final clean calibration has **20 fixtures = 18 core + 2 visibility**. The core has 16 analytical records and two actual-router output records, produced using **three actual router calls**, including a translation baseline. Visibility adds no router or layout calls. There are **four saved production sanity examples**. Earlier statements that all 20 fixtures were analytical or that a total of 15 production calibration calls was verified are withdrawn.

| Evidence bucket | Supported count | What this does not establish |
| --- | --- | --- |
| Engine-layout script | 100 top-level candidate scenarios; 99 layout calls, 57 routing calls; 195 assertions; 55 broad cases included | The nested calls and assertions are not additional distinct scenario counts. |
| Sculpt script | 15 journeys + 111 dabs = 126 top-level invocations; 15 nested layout calls; 54 assertions | Repeated dabs and repeated journeys are not 126 independently sampled corpus diagrams. |
| Historical audit | 45 source configurations; 135 CLI compilations | Nested engine/router invocation counts were not instrumented. |
| Clean final calibration | 20 fixtures; 3 actual router calls; 0 layout engine calls | Earlier exploratory invocations are not fully enumerated by the final file. |
| Production sanity | 4 saved examples | Saved final examples do not certify the exploratory session total. |
| Browser proofs | 8 + 4 explicit CLI inspections; checks 15/15 and 22/23 | Browser compile, comparison, brush and event-driven invocations are unmetered. |
| General unit suite | Test outcomes saved | Assertions do not determine engine or distinct geometry invocation counts. |

The five bounded buckets (engine-layout, sculpt, historical configurations, clean router calibration and saved sanity) permit a conservative charge of **278 scenario invocations** for those buckets alone. That charge may count repeated configurations and overlap; it is not a complete ancillary total. The 12 explicit browser inspections are separately known compilations, not the complete browser workload. The 500 allowance cannot be certified as covering every ancillary experiment from these records.

## Outstanding completion gates

- Materialize any remaining prescribed heldout edit-policy tasks and rerun this read-only reconciliation so the final task count is exact.
- Reconcile heldout outcomes only after outcome access is authorized; this report deliberately makes no heldout result claim.
- Finish heldout blind review, clustered uncertainty, the 95% relative coverage and no-new-hard-regression tests, specialist reachability, and final bundle checks.
- Keep trial count, attempt count, API call count, fixture count and assertion count separately labeled in the final report.

## Reproduction

Run `python3 evaluation/accounting-audit.py` from the deliverable bundle. The audit only reads manifests, development results/attempts, hashes, calibration evidence and heldout run provenance; it never executes product algorithms or opens heldout result/geometry files. Outputs are `data/analysis/accounting-audit.json` and this report.
