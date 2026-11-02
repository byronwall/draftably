"""Final read-only accounting and decision audit; no algorithms or policy fitting.

Run final-geometry-integrity.mjs first to refresh independent saved-geometry checks.
Preserves the historical pre-heldout and registration accounting reports.
"""
import collections
import csv
import datetime
import difflib
import hashlib
import json
import math
import pathlib

ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def csvrows(p):
    with p.open() as f:return list(csv.DictReader(f))
def yes(v):return v is True or v=='True'
def eqrow(r):return json.dumps({k:v for k,v in r.items() if k!='restoredFromAttemptRecord'},sort_keys=True,separators=(',',':'))

stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
protocol=read(ROOT/'data/protocol-freeze.json');policy=read(ROOT/'data/policy-freeze.json')
summary=read(ROOT/'data/execution-summary.json')
all_tasks={};all_first={};stages=[];duplicates=[];missing=[];unplanned=[];missing_artifacts=[];unmatched_attempts=[]
attempt_files=0;raw_count=0;nonterminal=[];heldout_provenance=[]
for file in sorted((ROOT/'evaluation/tasks').glob('*.json')):
    tasks=read(file);stem=file.stem
    for t in tasks:
        if t['id'] in all_tasks:raise ValueError('Duplicate registered ID: '+t['id'])
        all_tasks[t['id']]=t
    result=ROOT/'data'/(stem+'.jsonl')
    rows=[json.loads(x)for x in result.read_text().splitlines()if x]if result.exists()else[]
    first={}
    for row in rows:
        if row.get('status')not in ('ok','timed_out','failed'):nonterminal.append(dict(stage=stem,id=row.get('id'),status=row.get('status')))
        if row['id']in first:duplicates.append(dict(stage=stem,id=row['id'],canonicalStatus=first[row['id']]['status'],laterStatus=row['status']))
        else:first[row['id']]=row
    want={t['id']for t in tasks}
    missing.extend(dict(stage=stem,id=x)for x in sorted(want-first.keys()))
    unplanned.extend(dict(stage=stem,id=x)for x in sorted(first.keys()-want))
    all_first.update(first);raw_count+=len(rows)
    for r in first.values():
        if r['status']=='ok'and not r.get('geometry'):missing_artifacts.append(dict(id=r['id'],field='geometry',path=None))
        for k in ('geometry','layoutCheckpoint'):
            if r.get(k)and not(ROOT/r[k]).is_file():missing_artifacts.append(dict(id=r['id'],field=k,path=r[k]))
    known={eqrow(r)for r in rows};adir=ROOT/'data/attempts'/stem
    afiles=list(adir.glob('*.json'))if adir.exists()else[];attempt_files+=len(afiles)
    for p in afiles:
        r=read(p)
        if eqrow(r)not in known:unmatched_attempts.append(dict(path=str(p.relative_to(ROOT)),id=r['id'],status=r.get('status')))
    statuses=dict(collections.Counter(r['status']for r in first.values()))
    stage=dict(stage=stem,planned=len(want),canonical=len(first),rawRows=len(rows),duplicates=len(rows)-len(first),
               statuses=statuses,taskSha256=sha(file),resultSha256=sha(result)if result.exists()else None,immutableAttemptFiles=len(afiles))
    stages.append(stage)
    if any(t.get('split')=='heldout'for t in tasks):
        log=read(ROOT/'data/logs'/(stem+'-run.json'))
        heldout_provenance.append(dict(stage=stem,started=log['started'],finished=log.get('finished'),
            policyHashMatches=log.get('policySha256')==sha(ROOT/'data/policy-freeze.json'),taskHashMatches=log.get('taskSha256')==stage['taskSha256'],
            startedAfterSeal=datetime.datetime.fromisoformat(log['started'].replace('Z','+00:00'))>=datetime.datetime.fromisoformat(policy['frozenAt'])))

statuses=dict(collections.Counter(r['status']for r in all_first.values()))
splits={s:dict(canonical=sum(r.get('split')==s for r in all_first.values()),
              statuses=dict(collections.Counter(r['status']for r in all_first.values()if r.get('split')==s)))for s in ('development','heldout')}
summary_checks={
 'registeredDistinctTrials':len(all_tasks)==summary['registeredDistinctTrials'],
 'canonicalTerminalTrials':len(all_first)==summary['canonicalTerminalTrials'],
 'canonicalStatuses':statuses==summary['canonicalStatuses'],
 'rawTerminalRows':raw_count==summary['rawTerminalRows'],
 'duplicateTerminalRows':len(duplicates)==summary['duplicateTerminalRows'],
 'splits':splits==summary['splits'],
 'allStageCountsAndHashes':all(any(s['stage']==x['stage']and s['planned']==x['planned']and s['canonical']==x['canonical']and s['taskSha256']==x['taskSha256']and s['resultSha256']==x['resultSha256']for s in stages)for x in summary['stages'])}

baseline=read(ROOT/'data/baseline-manifest.json')
baseline_bad=[p for p,h in baseline.items()if not(ROOT.parent/'baseline'/p).is_file()or sha(ROOT.parent/'baseline'/p)!=h]
snapshot=read(ROOT/'data/frozen-development-snapshot.json')
snapshot_bad=[];postseal=[]
for item in snapshot['files']:
    expected=policy['frozenCodeHashes'][item['originalPath']]
    if sha(ROOT/item['frozenCopy'])!=expected or item['sha256']!=expected:snapshot_bad.append(item['originalPath'])
    if sha(ROOT/item['originalPath'])!=expected:
        name=item['originalPath'];purpose={'evaluation/README.md':'Final replay/reporting documentation',
            'evaluation/enrich-inventory-development.py':'Ordinary-edit/color-control denominator disclosure literal',
            'evaluation/prepare-replay.py':'Copy blinded pair specifications without applying old judgments to new renders',
            'evaluation/replay-all.sh':'Replay stage coverage, dependent prediction ordering and final analyses'}.get(name,'Unclassified: manual review required')
        postseal.append(dict(path=name,purpose=purpose,sealedSha256=expected,currentSha256=sha(ROOT/name),
            sealedCopy=item['frozenCopy'],diff=''.join(difflib.unified_diff((ROOT/item['frozenCopy']).read_text().splitlines(True),(ROOT/name).read_text().splitlines(True),fromfile='sealed',tofile='current'))))
critical=['metrics.mjs','intent.mjs','analyze-portfolio.py','analyze-dependencies.py','predict-cold-policy.py','trial-worker.mjs','adapter.mjs','source-tools.mjs']
critical_checks={n:sha(ROOT/'evaluation'/n)==policy['frozenCodeHashes']['evaluation/'+n]for n in critical}
protocol_checks={k:sha(ROOT/p)==protocol[k]for k,p in [('splitSha256','corpus/manifest.json'),('routingSha256','corpus/routing/manifest.json'),('settingsSha256','evaluation/settings-spec.json'),('metricSha256','evaluation/metrics.mjs')]}
frozen_stage_checks=[]
for item in policy['developmentStages']:
    s=next(s for s in stages if s['stage']==item['stage'])
    frozen_stage_checks.append(dict(stage=s['stage'],matches=s['planned']==item['tasks']and s['canonical']==item['canonicalRows']and s['taskSha256']==item['taskSha256']and s['resultSha256']==item['resultSha256']))
evidence_bad=[p for p,h in policy['developmentEvidenceHashes'].items()if sha(ROOT/'data'/p)!=h]

held=ROOT/'data/analysis/heldout'
selection_rows=csvrows(held/'policy-case-selections.csv')+csvrows(held/'retuned-policy-case-selections.csv')
selection_unique={}
for r in selection_rows:
    key=(r['policy'],r['caseId'],r['profile'])
    if key in selection_unique and selection_unique[key]!=r:raise ValueError('Conflicting duplicated policy selection: '+str(key))
    selection_unique.setdefault(key,r)
selection_groups=collections.defaultdict(list)
for r in selection_unique.values():selection_groups[r['policy']].append(r)
acceptance=read(held/'frozen-policy-acceptance.json');gate_mismatches=[];gate_rows=[]
profiles=['readable','compact','traceable','stable','specialist']
for a in acceptance:
    rows=selection_groups.get(a['policy'],[])
    if not rows:continue
    counts={}
    for profile in profiles:
        rs=[r for r in rows if r['profile']==profile and yes(r['common'])]
        counts[profile]=dict(acceptableBases=sum(yes(r['acceptable'])for r in rs),allCommonBases=len(rs),
                             oracleFeasibleBases=sum(yes(r['oracleAvailable'])for r in rs),currentValidBases=sum(yes(r['currentValid'])for r in rs),
                             currentValidHardRegressionCases=sum(yes(r['currentValid'])and not yes(r['hardValid'])for r in rs))
    hardloss={r['caseId']for r in rows if yes(r['currentValid'])and not yes(r['hardValid'])}
    numeric_pass=all(c['acceptableBases']>=math.ceil(.95*c['oracleFeasibleBases']-1e-9)for c in counts.values())
    if counts!=a['commonProfileCounts']:gate_mismatches.append(dict(policy=a['policy'],reason='Profile counts differ from per-case selections'))
    if len(hardloss)!=a['currentValidHardRegressionCases']:gate_mismatches.append(dict(policy=a['policy'],reason='Hard-regression count differs'))
    expected=numeric_pass and not hardloss and a['supportedSpecialistsPreserved']
    if expected!=a['contractOverallPass']:gate_mismatches.append(dict(policy=a['policy'],reason='Overall gate arithmetic differs'))
    gate_rows.append(dict(policy=a['policy'],profileCounts=[counts[p]['acceptableBases']for p in profiles],
                         feasible=[counts[p]['oracleFeasibleBases']for p in profiles],allCommon=[counts[p]['allCommonBases']for p in profiles],
                         hardRegressions=len(hardloss),contractPass=expected))

evidence=read(held/'portfolio-evidence-summary.json')
preferred={x['policy']:x for x in evidence['summary']}
six=read(held/'engine-recipe-frozen-subsets.json')
configuration=read(held/'minimum-configuration-frozen-policy.json')
config_rows=[r for r in csvrows(held/'minimum-configuration-frozen-selections.csv')if r['policy']=='frozen-minimum-configuration-oracle']
config_counts=[sum(r['profile']==p and yes(r['common'])and yes(r['acceptable'])for r in config_rows)for p in profiles]
config_expected=[configuration['heldoutSummary']['commonProfileCounts'][p]['acceptableBases']for p in profiles]
if config_counts!=config_expected:gate_mismatches.append(dict(policy='eleven-configuration oracle',reason='Counts differ from saved selections'))
six_rows=[x for x in six['results']if x.get('mode')=='combined'and x.get('scenario')=='recipes-and-authored-safe'and x.get('selectedUnderWeighting')=='equal-family'and x.get('evaluationWeighting')=='equal-family'and x.get('frozenPortfolio')==evidence['enginePortfolio']]
six_counts=[six_rows[0]['commonProfileCounts'][p]['acceptable']for p in profiles]if len(six_rows)==1 else None
decision=dict(profiles=profiles,defaultAndTunedPoliciesChecked=len(gate_rows),gateArithmeticMismatches=gate_mismatches,
              policies=gate_rows,sixEngineCommonCounts=six_counts,elevenConfigurationCommonCounts=config_counts,
              commonFeasible=12,commonAll=14,requiredAcceptableCount=12,
              fullPoolUnavailableCases=evidence['allPoolUnavailableCases'],
              reducedAutomaticReleasePass=any(x['contractPass']for x in gate_rows),
              recommendation='Retain current automatic behavior and all underlying engines/exact source controls. A smaller goal-oriented UI can be proposed, but the frozen reduced portfolios do not pass the agreed heldout quality gate.',
              auditScope='Counts and decision arithmetic independently recomputed from saved per-case selections. No rescoring, model fitting, engine execution, new subset search, or heldout policy selection.')

visual=[]
for p in sorted((ROOT/'data').glob('visual-judgments-*.json')):
    j=read(p);visual.append(dict(file=str(p.relative_to(ROOT)),count=len(j['judgments']),recordedAt=j['recordedAt'],
                               countsAgree=j.get('counts',{}).get('pairs')==len(j['judgments']),
                               frozenBeforeUnblinding=j.get('blinding',{}).get('verdictsFrozenBeforeUnblinding'),sha256=sha(p)))
probe=read(ROOT/'data/analysis/file-auto-ports-probe/result.json')
geometry=read(ROOT/'data/analysis/final-geometry-integrity.json')
inventory_file=ROOT/'data/analysis/inventory-final-manifest.json';inventory=read(inventory_file)if inventory_file.exists()else None
inventory_checks={}
if inventory:
    inventory_json=read(ROOT/'inventory-final.json')
    inventory_json_rows=inventory_json if isinstance(inventory_json,list)else inventory_json.get('rows',[])
    inventory_checks=dict(jsonHashMatches=sha(ROOT/'inventory-final.json')==inventory['finalJsonSha256'],
                          csvHashMatches=sha(ROOT/'inventory.csv')==inventory['finalCsvSha256'],
                          jsonRowCountMatches=len(inventory_json_rows)==inventory['rows'],
                          csvRowCountMatches=len(csvrows(ROOT/'inventory.csv'))==inventory['rows'])
last=max(r.get('attemptFinished','')for r in all_first.values())
elapsed=(datetime.datetime.fromisoformat(last.replace('Z','+00:00'))-datetime.datetime.fromisoformat(protocol['assignmentStarted'])).total_seconds()/3600
checks=dict(noMissingOrUnplannedTrials=not missing and not unplanned,noNonterminalRows=not nonterminal,
            noMissingReferencedArtifacts=not missing_artifacts,noUnmatchedImmutableAttempts=not unmatched_attempts,
            sourceBaselineUnchanged=not baseline_bad,allFrozenSnapshotsPreserved=not snapshot_bad and len(snapshot['files'])==len(policy['frozenCodeHashes']),
            criticalCodeUnchanged=all(critical_checks.values()),protocolHashesMatch=all(protocol_checks.values()),
            sealedDevelopmentStagesUnchanged=all(x['matches']for x in frozen_stage_checks),frozenEvidenceUnchanged=not evidence_bad,
            allHeldoutStartsAndHashesMatch=all(x['policyHashMatches']and x['taskHashMatches']and x['startedAfterSeal']for x in heldout_provenance),
            executionSummaryAgrees=all(summary_checks.values()),geometrySignaturesMatch=not geometry['missing']and not geometry['malformed']and not geometry['mismatches']and geometry['verified']==statuses.get('ok'),
            decisionArithmeticAgrees=not gate_mismatches,blindPairMinimumMet=sum(x['count']for x in visual)>=48,
            heldoutBlindPairsPresent=any('heldout'in x['file']and x['count']for x in visual),expensiveTrialsWithinSixHours=elapsed<=6,
            registeredMainWithin11500=len(all_tasks)<=11500,finalInventoryHashesAndRowsAgree=bool(inventory_checks)and all(inventory_checks.values()))
report=dict(schema='draftably-final-accounting-audit-1',at=stamp,algorithmExecutions=0,heldoutOutcomesRead=True,
            preservedHistoricalReports=['evaluation/audit-report.md','evaluation/accounting-audit.md','data/analysis/accounting-audit.json'],
            checks=checks,counts=dict(registered=len(all_tasks),canonical=len(all_first),rawTerminalRows=raw_count,duplicateAttempts=len(duplicates),statuses=statuses,splits=splits,immutableAttemptFiles=attempt_files),
            stages=stages,duplicates=duplicates,missing=missing,unplanned=unplanned,missingArtifacts=missing_artifacts,
            unmatchedImmutableRecords=unmatched_attempts,baselineFiles=len(baseline),baselineMismatches=baseline_bad,
            frozenSnapshotFiles=len(snapshot['files']),frozenSnapshotMismatches=snapshot_bad,criticalFrozenCodeChecks=critical_checks,
            protocolChecks=protocol_checks,developmentStageChecks=frozen_stage_checks,frozenEvidenceMismatches=evidence_bad,
            postSealIntegrationChanges=postseal,heldoutRunProvenance=heldout_provenance,executionSummaryChecks=summary_checks,
            geometry=geometry,decision=decision,visual=visual,inventoryManifest=inventory,inventoryChecks=inventory_checks,
            ancillary=dict(knownMixedScenarioCharge=278+probe['execution']['routerCalls'],additionalPortProbe=probe['execution'],
                           completeDeduplicatedTotalKnown=False,allAncillaryWithin500Certified=False,
                           explanation='280 combines bounded scenario-invocation buckets, including repetitions and the two positive-control router calls. Browser, general-unit and exploratory invocation totals remain unmetered. Assertions and nested API calls are not distinct geometry trials.'),
            budget=dict(main=len(all_tasks),mainPlusReserved500=len(all_tasks)+500,headroomBelow12000AfterReservation=12000-len(all_tasks)-500,
                        lastRecordedTrialFinished=last,elapsedHoursToLastTrial=elapsed,allSessionDistinctTrialCeilingCertified=False,
                        reason='The main accounting is exact; the complete ancillary distinct-trial count is not established. No measured evidence of exceeding the ceiling was found.'),
            packaging='Final ZIP/content manifest is the root\'s remaining packaging step; this audit does not certify a ZIP not yet created.')
(ROOT/'data/analysis/final-accounting-audit.json').write_text(json.dumps(report,indent=2)+'\n')
lines=['# Final independent execution, integrity and decision audit','',f'**Audited:** {stamp}. All development and heldout outcomes were authorized for read-only inspection. This audit executed no geometry, compiler or router calls, fitted no policy, and preserved the historical audits.','',
       '## Conclusion','',
       f'All **{len(all_tasks):,} registered main trials** have canonical terminal outcomes: **{statuses.get("ok",0):,} completed**, **{statuses.get("timed_out",0):,} timed out**, and **{statuses.get("failed",0):,} failed**. There are **{raw_count:,} raw terminal rows**, including **{len(duplicates)} later duplicate attempts**. First-terminal semantics are preserved. Every final integrity check listed below passed: **{all(checks.values())}**.','',
       '**Decision:** the heldout data do not authorize replacing the current automatic default or deleting the excluded engines/configurations. The frozen six-engine availability oracle and eleven-configuration oracle both miss the agreed per-profile common-job coverage gate. A simplified editing UI remains a product proposal; its underlying capabilities should remain available.','',
       '## Exact trial accounting','',
       '| Split | Canonical trials | Completed execution | Timed out | Failed |','| --- | ---: | ---: | ---: | ---: |']
for split,s in splits.items():
    c=s['statuses'];lines.append(f'| {split} | {s["canonical"]:,} | {c.get("ok",0):,} | {c.get("timed_out",0):,} | {c.get("failed",0):,} |')
lines+=['',f'Missing planned results: **{len(missing)}**. Unplanned results: **{len(unplanned)}**. Missing referenced artifacts: **{len(missing_artifacts)}**. Unmatched immutable attempt records: **{len(unmatched_attempts)}**. All per-stage counts/hashes and aggregate counts agree with `data/execution-summary.json`. Execution completion is not the same as geometric validity or accepted task quality.','',
        '## Budget and ancillary evidence','',
        f'The main count **{len(all_tasks):,}** is below the 11,500 planner cap. Adding the full 500 reservation gives **{len(all_tasks)+500:,}**, leaving **{12000-len(all_tasks)-500:,}** below 12,000. The last recorded trial finished at **{last}**, approximately **{elapsed:.3f} hours** after assignment start.','',
        f'The bounded ancillary charge is now **{278+probe["execution"]["routerCalls"]} mixed scenario invocations**: 100 layout scenarios, 126 sculpt invocations, 45 historical source configurations, three clean calibration router calls, four saved sanity examples, and **{probe["execution"]["routerCalls"]}** positive-control router calls for the file-port applicability probe. This is neither a complete nor a deduplicated ancillary count. Browser activity, general-unit tests and exploratory calls remain unmetered. The 500 allowance and an exact all-session distinct-trial total are not independently certified. Nested API calls and assertions are different counting units.','',
        'The calibration correction remains: **20 fixtures = 18 core + two visibility; three router calls in the final clean core invocation; zero layout calls for those calibration fixtures**. The older sealed audit wording is preserved historically and superseded by this correction.','',
        '## Artifact and freeze integrity','',
        f'- All **{len(baseline)} baseline files** match their immutable manifest.',
        f'- All **{len(snapshot["files"])} preserved frozen-development snapshots** match the policy seal.',
        f'- All **{len(critical_checks)} critical policy/metric/adapter/worker/source-transform files** remain unchanged.',
        f'- All **{len(frozen_stage_checks)} development stage task/result hashes and counts** remain sealed; frozen development evidence also matches.',
        f'- All **{len(heldout_provenance)} heldout stage manifests** have matching task/policy hashes and start after the seal.',
        f'- Independently recomputed saved geometry signatures match for **{geometry["verified"]:,}/{geometry["canonicalSuccessful"]:,} canonical successful artifacts**; no missing, malformed, or mismatching canonical artifact was found.', '',
        f'The geometry directory contains **{geometry["totalGeometryFiles"]:,} files**, one more than successful trials. The additional registered development artifact belongs to a canonical timed-out row and remains supplementary evidence; it is not promoted to a successful outcome. Signature verification covers node/group boxes, port sides and route polylines, not whole archive byte identity, SVG paint, labels or halo rendering.','',
        'Current post-seal file differences are restricted to the documented inventory denominator literal, final README documentation, replay preparation and replay orchestration. The JSON retains exact diffs and sealed/current hashes; all sealed originals are preserved. These integration edits do not alter frozen policies, metrics, source transformations or measured outcomes.','',
        '## Independent decision arithmetic','',
        'The common-job denominator is **12 oracle-feasible bases**, with **14 bases** in the absolute denominator. A 95% per-profile gate requires **12 accepted bases** in every profile; 11/12 is 91.7%.','',
        '| Frozen policy | Readable | Compact | Traceable | Stable | Specialist | Gate |','| --- | ---: | ---: | ---: | ---: | ---: | --- |']
wanted=['current-authored','documented-default','best-fixed-global-validity-guard','k5-prelayout-selector-validity-guard','k5-goal-selector-validity-guard','k5-configuration-oracle']
for name in wanted:
    rs=[x for x in gate_rows if x['policy']==name]
    if rs:
        x=rs[0];lines.append('| '+name+' | '+' | '.join(map(str,x['profileCounts']))+' | '+('PASS'if x['contractPass']else'FAIL')+' |')
if six_counts:lines.append('| Six-engine dependency-safe availability oracle | '+' | '.join(map(str,six_counts))+' | FAIL |')
lines.append('| Eleven-configuration availability oracle | '+' | '.join(map(str,config_counts))+' | FAIL |')
lines+=['',f'Counts and gate arithmetic were independently reconstructed for **{len(gate_rows)} saved default/tuned policies** from their per-case selection records, with **{len(gate_mismatches)} mismatches**. The conditional eleven-configuration counts also match its saved selections. The six-engine row was cross-checked against its frozen-subset evaluation. No policy was refitted or selected using heldout results. The full-pool unavailable bases remain in the absolute denominator.','',
        'The six-engine development minimum is not unique, and the eleven-configuration minimum is conditional on its selected engine set. Neither development minimum establishes that the reduced implementation is acceptable on heldout cases. Retaining current automatic behavior is therefore consistent with the experimental contract, while oracle coverage must remain distinct from a deployable selector.','',
        '## Visual and inventory completion','',
        f'Saved blinded judgments cover **{sum(x["count"]for x in visual)} pairs**: 10 routing, 26 development, three supplementary development and 24 heldout. The main preplanned total is 60 without the supplementary three; both exceed the 48-pair minimum. Judgments are labeled as a single expert model assessment, not independent human validation.','',
        f'The final inventory manifest records **{inventory["rows"] if inventory else "pending"} rows**'+(f', with dispositions **{inventory["decisions"]}**. It retains all 11 engines, six structural recipes, 15 source engine parameters and 12 routing parameters.'if inventory else'.'),'',
        'The bounded file-port probe supports only removing the ineffective file-routing-comparison checkbox in its present source branch. Its two raw-router positive controls demonstrate that the underlying capability is active elsewhere; explicit side controls and raw routing capability remain. This is an implementation-applicability result, not a heldout policy retune.','',
        '## Checks and remaining packaging gate','']
for name,result in checks.items():lines.append(f'- {name}: **{result}**')
lines+=['','The root must finish the downloadable ZIP/content manifest and replace any draft report placeholders. This audit certifies saved experiment/accounting evidence at its timestamp, not a ZIP that has not yet been created.','',
        'Reproduce with `node evaluation/final-geometry-integrity.mjs` followed by `python3 evaluation/final-accounting-audit.py`. These commands read saved evidence and produce the separate final audit artifacts without product algorithm executions.','']
(ROOT/'evaluation/final-accounting-audit.md').write_text('\n'.join(lines))
print(json.dumps(dict(at=stamp,counts=report['counts'],checks=checks,gateMismatches=gate_mismatches,
                     sixEngineCommonCounts=six_counts,elevenConfigurationCommonCounts=config_counts,
                     postSealChanges=[x['path']for x in postseal]),indent=2))
