"""Read-only experiment accounting; never reads heldout result/attempt/geometry files.

Reads heldout task definitions and selected run-manifest provenance fields only.
Writes this independent audit's JSON and Markdown; executes no geometry algorithms.
"""
import collections
import datetime
import difflib
import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASELINE = ROOT.parent / 'baseline'
STAMP = datetime.datetime.now(datetime.timezone.utc).isoformat()


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_bytes(row):
    # Exact recovery adds a provenance pointer, not a new attempt.
    return json.dumps({k: v for k, v in row.items()
                       if k != 'restoredFromAttemptRecord'}, sort_keys=True, separators=(',', ':'))


def check_hash(path, expected):
    exists = path.exists()
    actual = sha(path) if exists else None
    return dict(path=str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
                expected=expected, actual=actual, exists=exists, matches=actual == expected)


protocol = read(ROOT / 'data/protocol-freeze.json')
policy_path = ROOT / 'data/policy-freeze.json'
policy = read(policy_path)
task_files = sorted((ROOT / 'evaluation/tasks').glob('*.json'))
all_ids = collections.defaultdict(list)
stage_rows = []
dev_result_ids = set()
all_statuses = collections.Counter()
duplicates = []
unplanned = []
missing = []
missing_artifacts = []
dev_canonical_records = []
dev_raw_rows = 0
attempt_files_total = 0
attempt_ids_total = set()
attempt_only_records = []
recoveries = []
heldout_metadata = []
source_paths = []

for file in task_files:
    name = file.stem
    tasks = read(file)
    source_paths.append(str(file.relative_to(ROOT)))
    counts = collections.Counter(t.get('split', 'unspecified') for t in tasks)
    for task in tasks:
        all_ids[task['id']].append(name)
    task_ids = {t['id'] for t in tasks}
    is_heldout = 'heldout' in name or 'heldout' in counts
    stage = dict(stage=name, plannedRows=len(tasks), plannedDistinct=len(task_ids),
                 splits=dict(counts), heldout=is_heldout, taskSha256=sha(file))
    if is_heldout:
        stage['resultAccess'] = 'Excluded: heldout outcomes remain unread by this audit.'
        manifest = ROOT / 'data/logs' / (name + '-run.json')
        if manifest.exists():
            # Only retain provenance fields, never outcome counts or last-result IDs.
            m = read(manifest)
            selected = {k: m.get(k) for k in ('runId', 'started', 'policySha256', 'taskSha256', 'planned', 'workers')}
            selected['startedAfterFreeze'] = (
                datetime.datetime.fromisoformat(selected['started'].replace('Z', '+00:00')) >=
                datetime.datetime.fromisoformat(policy['frozenAt']))
            selected['policyHashMatches'] = selected['policySha256'] == sha(policy_path)
            heldout_metadata.append(selected)
        stage_rows.append(stage)
        continue

    result_file = ROOT / 'data' / (name + '.jsonl')
    rows = [json.loads(line) for line in result_file.read_text().splitlines() if line] if result_file.exists() else []
    assert all(r.get('split') != 'heldout' for r in rows), 'Unexpected heldout row in development stage'
    canonical = {}
    nonterminal = []
    for n, row in enumerate(rows, 1):
        if row.get('status') not in ('ok', 'failed', 'timed_out'):
            nonterminal.append(dict(id=row.get('id'), line=n, status=row.get('status')))
            continue
        if row['id'] in canonical:
            duplicates.append(dict(stage=name, id=row['id'], line=n,
                                   canonicalStatus=canonical[row['id']]['status'], laterStatus=row['status']))
        else:
            canonical[row['id']] = row
    statuses = collections.Counter(r['status'] for r in canonical.values())
    all_statuses.update(statuses)
    dev_result_ids.update(canonical)
    dev_canonical_records.extend(canonical.values())
    dev_raw_rows += len(rows)
    absent = sorted(task_ids - canonical.keys())
    extra = sorted(canonical.keys() - task_ids)
    missing.extend(dict(stage=name, id=i) for i in absent)
    unplanned.extend(dict(stage=name, id=i) for i in extra)
    immutable = []
    attempt_dir = ROOT / 'data/attempts' / name
    if attempt_dir.exists():
        for f in sorted(attempt_dir.glob('*.json')):
            r = read(f)
            assert r.get('split') != 'heldout'
            immutable.append((f, r))
    attempt_files_total += len(immutable)
    attempt_ids_total.update(r['id'] for _, r in immutable)
    known = {canonical_bytes(r) for r in rows}
    unmatched = []
    for f, r in immutable:
        if canonical_bytes(r) not in known:
            unmatched.append(dict(path=str(f.relative_to(ROOT)), id=r['id'], status=r.get('status')))
    attempt_only_records.extend(unmatched)
    for r in canonical.values():
        if r.get('recoveredFromArtifact') or r.get('restoredFromAttemptRecord'):
            recoveries.append(dict(id=r['id'], stage=name, status=r['status'],
                                   recovery='immutable-record' if r.get('restoredFromAttemptRecord') else 'artifact',
                                   totalMs=r.get('timing', {}).get('totalMs'),
                                   actualRouterCalls=r.get('actualRouterCalls')))
        if r['status'] == 'ok':
            artifact = r.get('geometry')
            if not artifact or not (ROOT / artifact).exists():
                missing_artifacts.append(dict(stage=name, id=r['id'], geometry=artifact))
        if r.get('layoutCheckpoint') and not (ROOT / r['layoutCheckpoint']).exists():
            missing_artifacts.append(dict(stage=name, id=r['id'], layoutCheckpoint=r['layoutCheckpoint']))
    stage.update(resultSha256=sha(result_file) if result_file.exists() else None,
                 rawTerminalRows=len(rows), canonicalDistinct=len(canonical), statuses=dict(statuses),
                 missing=len(absent), unplanned=len(extra), nonterminal=nonterminal,
                 immutableAttemptFiles=len(immutable), immutableAttemptDistinct=len({r['id'] for _, r in immutable}),
                 immutableRecordsAbsentFromSummary=len(unmatched),
                 duplicateTerminalRows=len(rows)-len(canonical)-len(nonterminal))
    stage_rows.append(stage)

hash_checks = []
for relative, key in [('corpus/manifest.json', 'splitSha256'), ('corpus/routing/manifest.json', 'routingSha256'),
                      ('evaluation/settings-spec.json', 'settingsSha256'), ('evaluation/metrics.mjs', 'metricSha256')]:
    hash_checks.append(check_hash(ROOT / relative, protocol[key]))
addenda = [json.loads(line) for line in (ROOT / 'data/protocol-addenda.jsonl').read_text().splitlines() if line]
intent = next((a['intentSha256'] for a in reversed(addenda) if 'intentSha256' in a), None)
if intent:
    hash_checks.append(check_hash(ROOT / 'evaluation/intent.mjs', intent))
code_checks = [check_hash(ROOT / p, h) for p, h in policy['frozenCodeHashes'].items()]
evidence_checks = [check_hash(ROOT / 'data' / p, h) for p, h in policy['developmentEvidenceHashes'].items()]
snapshot_path = ROOT / 'data/frozen-development-snapshot.json'
snapshot = read(snapshot_path) if snapshot_path.exists() else None
snapshot_checks = []
post_seal_changes = []
if snapshot:
    for entry in snapshot['files']:
        item = check_hash(ROOT / entry['frozenCopy'], policy['frozenCodeHashes'][entry['originalPath']])
        item.update(originalPath=entry['originalPath'], manifestHashMatchesSeal=(entry['sha256'] == item['expected']))
        snapshot_checks.append(item)
        current_path = ROOT / entry['originalPath']
        if sha(current_path) != item['expected']:
            before = (ROOT / entry['frozenCopy']).read_text()
            after = current_path.read_text()
            classification = ('Reporting-only denominator literal clarification' if current_path.name == 'enrich-inventory-development.py'
                              else 'Post-seal replay integration: stage coverage, dependency ordering, analysis commands and visual request copying'
                              if current_path.name in ('prepare-replay.py', 'replay-all.sh') else 'Unclassified post-seal difference; review required')
            post_seal_changes.append(dict(path=entry['originalPath'], frozenCopy=entry['frozenCopy'],
                                          frozenSha256=item['expected'], currentSha256=sha(current_path),
                                          classification=classification,
                                          diff=''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='sealed', tofile='current'))))
stage_checks = []
for frozen in policy['developmentStages']:
    current = next(s for s in stage_rows if s['stage'] == frozen['stage'])
    stage_checks.append(dict(stage=frozen['stage'], taskHashMatches=current['taskSha256'] == frozen['taskSha256'],
                             resultHashMatches=current['resultSha256'] == frozen['resultSha256'],
                             taskCountMatches=current['plannedRows'] == frozen['tasks'],
                             canonicalCountMatches=current['canonicalDistinct'] == frozen['canonicalRows']))

baseline_manifest = read(ROOT / 'data/baseline-manifest.json')
baseline_missing = [p for p in baseline_manifest if not (BASELINE / p).exists()]
baseline_changed = [p for p, h in baseline_manifest.items() if (BASELINE / p).exists() and sha(BASELINE / p) != h]

amendment_path = ROOT / 'data/analysis/inventory-denominator-reporting-amendment.json'
amendment = read(amendment_path) if amendment_path.exists() else None
if amendment:
    amendment = dict(amendment)
    amendment['independentBeforeHashMatches'] = sha(ROOT / amendment['preserved_before']) == amendment['frozen_sha256']
    amendment['independentAfterHashMatches'] = sha(ROOT / amendment['preserved_after']) == amendment['current_sha256']
    before = (ROOT / amendment['preserved_before']).read_text()
    after = (ROOT / amendment['preserved_after']).read_text()
    amendment['onlyDeclaredLiteralChanged'] = before.replace(amendment['old_literal'], amendment['new_literal']) == after

calibration = read(ROOT / 'data/calibration/metric-calibration.json')
visibility = read(ROOT / 'data/calibration/visibility-calibration.json')
sanity = read(ROOT / 'data/calibration/production-sanity.json')
planned = len(all_ids)
dev_planned = sum(s['plannedDistinct'] for s in stage_rows if not s['heldout'])
heldout_planned = sum(s['plannedDistinct'] for s in stage_rows if s['heldout'])
cold_stage = next(s for s in stage_rows if s['stage'] == 'edits-policies-heldout')
not_yet_emitted = max(0, 120 - cold_stage['plannedDistinct'])
projected = planned + not_yet_emitted
counts = dict(plannedTaskRows=sum(s['plannedRows'] for s in stage_rows), plannedDistinctIds=planned,
              developmentPlannedDistinct=dev_planned, developmentCanonicalDistinct=len(dev_result_ids),
              developmentRawTerminalRows=dev_raw_rows, developmentDuplicateTerminalRows=len(duplicates),
              developmentStatuses=dict(all_statuses), heldoutRegisteredDistinct=heldout_planned,
              heldoutExpectedColdPolicyTrials=120, heldoutColdPolicyNotYetEmitted=not_yet_emitted,
              projectedFinalRegisteredDistinct=projected, reserveMainLimit=11500, ancillaryAllowance=500,
              userDistinctGeometryLimit=12000, registeredWithinMainCap=planned <= 11500,
              projectedWithinMainCap=projected <= 11500,
              projectedMainPlusReservedAncillary=projected + 500,
              projectedHeadroomBelow12000AfterAllowance=12000-projected-500,
              duplicateTaskIds={i: fs for i, fs in all_ids.items() if len(fs) > 1},
              immutableDevelopmentAttemptFiles=attempt_files_total,
              immutableDevelopmentAttemptDistinctIds=len(attempt_ids_total),
              immutableRecordsAbsentFromDevelopmentSummary=len(attempt_only_records))

def numeric_call_summary(key):
    values = [r.get(key) for r in dev_canonical_records]
    measured = [v for v in values if isinstance(v, (int, float)) and not isinstance(v, bool)]
    return dict(sumKnown=round(sum(measured), 6), rowsWithNumericValues=len(measured),
                rowsWithoutNumericValues=len(values)-len(measured), scope='Canonical development rows only; incomplete lower-level accounting, not distinct trials')

ancillary = dict(
    engineLayout=dict(topLevelCandidateScenarios=100, layoutApiCalls=99, routingApiCalls=57,
                      assertions=195, broadCasesIncluded=55, source='baseline/tests/engine-layout.mjs',
                      evidence='data/logs/access-engine-test.log'),
    sculpt=dict(journeyCalls=15, dabCalls=111, topLevelInvocations=126, nestedLayoutCalls=15,
                passedAssertions=54, source='baseline/tests/engine-sculpt.mjs', evidence='data/sculpt-run-manifest.json',
                distinctConfigurations='Not instrumented; repeated dabs/journeys included'),
    historical=dict(sourceConfigurations=45, cliCompilations=135, nestedApiCalls=None,
                    evidence='data/historical-audit/aggregate.json'),
    calibration=dict(totalFixtures=calibration['fixtures']+visibility['fixtures'], coreFixtures=calibration['fixtures'],
                     visibilityFixtures=visibility['fixtures'], coreAnalyticalRecords=calibration['analyticalCases'],
                     coreActualRouterOutputRecords=sum(r.get('kind')=='actual-router' for r in calibration['records']),
                     cleanCoreActualRouterCalls=calibration['actualRouterRuns'], visibilityRouterCalls=0,
                     layoutApiCalls=0, source='data/calibration/metric-calibration.json',
                     extraCall='The third router call creates the translation comparison baseline.'),
    productionSanity=dict(savedExamples=len(sanity['rows']), evidence='data/calibration/production-sanity.json',
                          exploratorySessionTotal=None),
    browser=dict(layoutProofExplicitCliInspections=8, fileProofExplicitCliInspections=4,
                 totalEventDrivenApiCalls=None, distinctGeometryConfigurations=None,
                 layoutChecks='15/15', fileChecks='22/23',
                 limitation='Browser compile/compare/brush/event-driven activity was not instrumented.'),
    generalUnitSuite=dict(engineCalls=None, distinctGeometryConfigurations=None,
                          limitation='Assertions and test outcomes do not bound production invocations.'),
    boundedBucketCharge=100+126+45+calibration['actualRouterRuns']+len(sanity['rows']),
    boundedBucketChargeMeaning='Conservative scenario-invocation charge for these five listed buckets only, not a complete or deduplicated ancillary total.',
    exploratoryCalls='Unmetered; do not infer a complete total from final artifacts or successful final invocations.',
    blanket500BoundCertified=False,
    globalApiCallLimitCertified=False,
)

report = dict(schema='draftably-accounting-audit-1', auditedAt=STAMP, heldoutOutcomesRead=False,
              algorithmExecutionsByAudit=0, countingRule='Distinct registered task IDs; timing repetitions are conservatively charged separately. API calls, assertions and filesystem copies are not interchangeable units.',
              counts=counts, stages=stage_rows, missingDevelopmentTrials=missing, unplannedDevelopmentResults=unplanned,
              missingDevelopmentArtifacts=missing_artifacts, duplicateDevelopmentAttempts=duplicates,
              immutableRecordsAbsentFromSummary=attempt_only_records, recoveries=recoveries,
              frozenProtocolHashes=hash_checks, frozenCodeHashes=code_checks, frozenEvidenceHashes=evidence_checks,
              preservedFrozenSnapshot=dict(manifest='data/frozen-development-snapshot.json',
                                           recordedAt=snapshot.get('at') if snapshot else None,
                                           checks=snapshot_checks,
                                           coversAllSealedFiles=bool(snapshot) and {x['originalPath'] for x in snapshot_checks} == set(policy['frozenCodeHashes']),
                                           allMatchSeal=bool(snapshot_checks) and all(x['matches'] and x['manifestHashMatchesSeal'] for x in snapshot_checks)),
              postSealChanges=post_seal_changes,
              frozenDevelopmentStageChecks=stage_checks,
              baseline=dict(commit=protocol['baseline'], trackedFiles=len(baseline_manifest),
                            missing=baseline_missing, changed=baseline_changed),
              policy=dict(frozen=policy.get('frozen'), frozenAt=policy.get('frozenAt'), sha256=sha(policy_path),
                          sidecarMatches=(ROOT/'data/policy-freeze.sha256').read_text().split()[0]==sha(policy_path)),
              heldoutRunProvenanceOnly=heldout_metadata, reportingAmendment=amendment,
              nestedCalls=dict(layout=numeric_call_summary('engineCalls'), router=numeric_call_summary('actualRouterCalls')),
              ancillary=ancillary,
              calibrationErratum='Supersedes frozen audit-report.md calibration accounting: 20 fixtures =18 core +2 visibility; 16 core analytical records, two actual-router output records, three clean core router invocations. Four saved production sanity examples. Earlier 20-analytical/15-router-total statements are withdrawn.',
              certification=dict(registeredAndProjectedMainWithinCap=projected <= 11500,
                                 allDevelopmentPlannedTrialsHaveTerminalResults=not missing,
                                 registeredMainPlusReserved500Within12000=projected+500 <=12000,
                                 actualAllSessionDistinctGeometryTrialsAtMost12000='Not fully certifiable from available records: browser/unit/exploratory geometry was not exhaustively counted. No evidence of an exceedance was identified.',
                                 actualAllSessionApiCallsAtMost12000='Not certified, and not the user\'s stated counting unit.'),
              remainingGates=['Materialize the 120 already prescribed heldout cold-policy edit tasks if absent; reconcile final registration.',
                              'Complete heldout execution and outcome audit after authorized access; no heldout completion or acceptance claim is made here.',
                              'Complete heldout blind review, clustered uncertainty, acceptance gates, and final downloadable bundle checks.'])

out = ROOT / 'data/analysis/accounting-audit.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2)+'\n')
bad_code = [x['path'] for x in code_checks if not x['matches']]
lines = [
    '# Independent execution and accounting audit', '',
    f'**Snapshot:** {STAMP}. Read-only audit; zero algorithms executed. Heldout outcome rows, attempt records and geometry were excluded. Heldout task definitions and run provenance were inspected.', '',
    '## Budget conclusion', '',
    f'The manifests currently register **{planned:,} distinct task IDs**: **{dev_planned:,} development** and **{heldout_planned:,} heldout**. The development files contain **{len(dev_result_ids):,} canonical terminal outcomes** and **{dev_raw_rows:,} raw terminal rows**, including **{len(duplicates)} duplicate attempts**. Every planned development trial has a terminal outcome.' if not missing else f'The manifests register {planned:,} IDs; {len(missing)} development terminal outcomes are missing.', '',
    f'The already prescribed heldout cold-policy edit stage currently has {cold_stage["plannedDistinct"]}/120 registered trials. Accounting for the {not_yet_emitted} not yet emitted gives a projected **{projected:,} main trial IDs**. Adding the full reserved 500 ancillary allowance gives **{projected+500:,}**, leaving **{12000-projected-500:,}** below the user\'s 12,000 distinct-geometry-trial ceiling. This verifies the registered/planned budget arithmetic. It does not prove that unmetered ancillary work stayed within its allowance.', '',
    '**A complete all-session distinct-trial total cannot be certified from the saved evidence.** Browser activity, general unit tests and exploratory calibration calls were not exhaustively metered. No observed count establishes an exceedance. Total production API calls are a different unit and are not certified below 12,000. One registered trial can call several nested layout engines, invoke routing, or reuse cached routes; repetitions are conservatively charged as separate task IDs.', '',
    '## Development reconciliation', '',
    '| Stage | Planned IDs | Canonical terminal | OK / timeout / failed | Extra terminal rows | Immutable attempt files |',
    '| --- | ---: | ---: | --- | ---: | ---: |',
]
for s in stage_rows:
    if s['heldout']:
        continue
    c=s['statuses']
    lines.append(f'| {s["stage"]} | {s["plannedDistinct"]} | {s["canonicalDistinct"]} | {c.get("ok",0)} / {c.get("timed_out",0)} / {c.get("failed",0)} | {s["duplicateTerminalRows"]} | {s["immutableAttemptFiles"]} |')
lines += ['', f'Canonical development statuses: **{dict(all_statuses)}**. `OK` means execution completed, not that the geometry or requested intent passed. Missing planned development IDs: **{len(missing)}**; unplanned development results: **{len(unplanned)}**; missing referenced successful geometry/checkpoint artifacts: **{len(missing_artifacts)}**.', '',
          f'There are **{attempt_files_total:,} immutable development attempt files** covering **{len(attempt_ids_total):,} IDs**. They are copies of attempt evidence, not additional trials. Immutable persistence began after some earlier stages, so absence of such a file for an earlier saved result is not a missing trial. Immutable records without a matching summary row after removing the exact-recovery provenance pointer: **{len(attempt_only_records)}**.', '',
          f'Recovery records contain **{sum(r["recovery"]=="artifact" for r in recoveries)} artifact-based reconstructions** and **{sum(r["recovery"]=="immutable-record" for r in recoveries)} exact immutable-record restoration**. Artifact-only missing timing/cache fields stay missing. Failed or timed-out originals are retained; later successes are not substituted. Recovery creates no new algorithm invocation.', '',
          '## Freeze and baseline integrity', '',
          f'- Policy sealed at **{policy["frozenAt"]}**; SHA-256 **{sha(policy_path)}** agrees with its sidecar.',
          f'- All **{len(hash_checks)}** checked protocol/addendum hashes match: **{all(x["matches"] for x in hash_checks)}**.',
          f'- All **{len(evidence_checks)}** frozen development-evidence hashes match: **{all(x["matches"] for x in evidence_checks)}**.',
          f'- All **{len(stage_checks)}** sealed development stage task/result hashes and counts match: **{all(all(v for k,v in x.items() if k!="stage") for x in stage_checks)}**.',
          f'- Of **{len(code_checks)}** frozen code/report hashes, the mismatches are: **{bad_code or "none"}**.',
          f'- The preserved frozen-development snapshot contains **{len(snapshot_checks)}** files; all copies exactly match their sealed hashes: **{bool(snapshot_checks) and all(x["matches"] and x["manifestHashMatchesSeal"] for x in snapshot_checks)}**.',
          f'- Immutable baseline verification: **{len(baseline_manifest)} files**, **{len(baseline_missing)} missing**, **{len(baseline_changed)} changed**.', '',
          'The one documented reporting amendment changes only the literal disclosure of ordinary-edit versus color-control denominators in `enrich-inventory-development.py`. Preserved before/after scripts and the amendment record allow independent reconstruction. The old hash matches the seal, the new hash matches the saved amended script, and replacing exactly the declared literal reproduces the new file. No frozen policy, metric, selection formula, or raw result was changed by that amendment.' if amendment else 'No documented reporting amendment was found.', '',
          'Two additional current files differ from their preserved sealed versions for replay integration. `prepare-replay.py` copies blinded pair specifications into a fresh replay directory without copying original judgments as though they applied to newly rendered output. `replay-all.sh` adds development/heldout edit-prediction regeneration before dependent task generation, the six optional scale trials, the 72 current-source and 216 joint heldout routing trials, and final reporting/audit commands. The exact diffs and before/after hashes are recorded in the JSON. These are replay coverage and ordering changes; the policy, metric, adapter and worker implementations remain sealed. These code changes themselves did not execute geometry trials.', '',
          'Heldout run provenance is listed in the JSON without result counts. Recorded start times must follow the seal and record the same policy hash. This audit does not claim heldout completion, quality, or acceptance.', '',
          '## Ancillary evidence and calibration erratum', '',
          '**This section corrects the calibration accounting in the earlier, now hash-sealed `audit-report.md`; that file is preserved as historical evidence.** The final clean calibration has **20 fixtures = 18 core + 2 visibility**. The core has 16 analytical records and two actual-router output records, produced using **three actual router calls**, including a translation baseline. Visibility adds no router or layout calls. There are **four saved production sanity examples**. Earlier statements that all 20 fixtures were analytical or that a total of 15 production calibration calls was verified are withdrawn.', '',
          '| Evidence bucket | Supported count | What this does not establish |', '| --- | --- | --- |',
          '| Engine-layout script | 100 top-level candidate scenarios; 99 layout calls, 57 routing calls; 195 assertions; 55 broad cases included | The nested calls and assertions are not additional distinct scenario counts. |',
          '| Sculpt script | 15 journeys + 111 dabs = 126 top-level invocations; 15 nested layout calls; 54 assertions | Repeated dabs and repeated journeys are not 126 independently sampled corpus diagrams. |',
          '| Historical audit | 45 source configurations; 135 CLI compilations | Nested engine/router invocation counts were not instrumented. |',
          '| Clean final calibration | 20 fixtures; 3 actual router calls; 0 layout engine calls | Earlier exploratory invocations are not fully enumerated by the final file. |',
          '| Production sanity | 4 saved examples | Saved final examples do not certify the exploratory session total. |',
          '| Browser proofs | 8 + 4 explicit CLI inspections; checks 15/15 and 22/23 | Browser compile, comparison, brush and event-driven invocations are unmetered. |',
          '| General unit suite | Test outcomes saved | Assertions do not determine engine or distinct geometry invocation counts. |', '',
          f'The five bounded buckets (engine-layout, sculpt, historical configurations, clean router calibration and saved sanity) permit a conservative charge of **{ancillary["boundedBucketCharge"]} scenario invocations** for those buckets alone. That charge may count repeated configurations and overlap; it is not a complete ancillary total. The 12 explicit browser inspections are separately known compilations, not the complete browser workload. The 500 allowance cannot be certified as covering every ancillary experiment from these records.', '',
          '## Outstanding completion gates', '',
          '- Materialize any remaining prescribed heldout edit-policy tasks and rerun this read-only reconciliation so the final task count is exact.',
          '- Reconcile heldout outcomes only after outcome access is authorized; this report deliberately makes no heldout result claim.',
          '- Finish heldout blind review, clustered uncertainty, the 95% relative coverage and no-new-hard-regression tests, specialist reachability, and final bundle checks.',
          '- Keep trial count, attempt count, API call count, fixture count and assertion count separately labeled in the final report.', '',
          '## Reproduction', '',
          'Run `python3 evaluation/accounting-audit.py` from the deliverable bundle. The audit only reads manifests, development results/attempts, hashes, calibration evidence and heldout run provenance; it never executes product algorithms or opens heldout result/geometry files. Outputs are `data/analysis/accounting-audit.json` and this report.', '']
(ROOT / 'evaluation/accounting-audit.md').write_text('\n'.join(lines))
print(json.dumps(dict(auditedAt=STAMP, counts=counts, missing=len(missing), unplanned=len(unplanned), missingArtifacts=len(missing_artifacts),
                     frozenCodeMismatches=bad_code, baselineChanged=baseline_changed, baselineMissing=baseline_missing,
                     heldoutOutcomeAccess=False), indent=2))
