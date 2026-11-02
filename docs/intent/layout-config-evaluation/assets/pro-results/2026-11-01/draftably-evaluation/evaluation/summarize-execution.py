"""Reconcile registered trials and final artifacts without running any algorithm."""
import argparse
import collections
import csv
import datetime
import hashlib
import json
import pathlib

root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--allow-partial',action='store_true')
args=parser.parse_args()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
protocol=json.loads((root/'data/protocol-freeze.json').read_text())
freeze=json.loads((root/'data/policy-freeze.json').read_text())
groups={
 'Routing position preparation':['prepare-routing'],
 'Development engine and recipe screen':['screen-development','documented-default-development'],
 'Equal-budget preset search and supplementation':['tuning-development','selected-presets-development'],
 'Source controls, interactions and replacement ablation':['settings-layout','interactions-layout','layout-control-ablation'],
 'Routing controls, ports, history and interactions':['settings-routing','interactions-routing'],
 'Warm settings, network objective and supported-scope probes':['settings-warm','network-direction','warm-targeted'],
 'Development edit trials and shared states':['edits-current-development','edits-states-development','edits-warm-development','edits-policies-development'],
 'Development layout × routing':['joint-development'],
 'Identity and declaration-order transformations':['identity-development'],
 'Isolated timing and repeat determinism':['timing-development'],
 'Empty and single-node sanity':['sanity'],
 'Optional 180/220-node scale':['optional-scale'],
 'Heldout source and frozen presets':['screen-heldout','documented-default-heldout','selected-presets-heldout'],
 'Heldout edit trials and shared states':['edits-current-heldout','edits-states-heldout','edits-warm-heldout','edits-policies-heldout'],
 'Heldout current-position routing and joint choices':['routing-current-heldout','joint-heldout'],
}
stage_group={s:g for g,stems in groups.items() for s in stems}
stage_rows=[];canonical=[];duplicates=[];missing=[];unplanned=[];registered={};missing_artifacts=[]
for taskfile in sorted((root/'evaluation/tasks').glob('*.json')):
    tasks=json.loads(taskfile.read_text());stem=taskfile.stem
    for t in tasks:
        if t['id'] in registered:raise ValueError('Task registered twice: '+t['id'])
        registered[t['id']]=stem
    expected={t['id'] for t in tasks}
    resultfile=root/'data'/(stem+'.jsonl')
    allrows=[json.loads(line) for line in resultfile.read_text().splitlines() if line.strip()] if resultfile.exists() else []
    first={}
    for row in allrows:
        if row['id'] in first:duplicates.append({'stage':stem,'id':row['id'],'canonicalStatus':first[row['id']]['status'],'laterStatus':row['status']})
        else:first[row['id']]=row
    missing.extend({'stage':stem,'id':tid} for tid in sorted(expected-first.keys()))
    unplanned.extend({'stage':stem,'id':tid} for tid in sorted(first.keys()-expected))
    statuses=collections.Counter(row['status'] for row in first.values())
    for row in first.values():
        for key in ['geometry','layoutCheckpoint']:
            if row.get(key) and not (root/row[key]).is_file():missing_artifacts.append({'id':row['id'],'field':key,'path':row[key]})
    canonical.extend(first.values())
    logpath=root/'data/logs'/(stem+'-run.json')
    log=json.loads(logpath.read_text()) if logpath.exists() else {}
    stage_rows.append({'stage':stem,'group':stage_group.get(stem,'Unclassified'),
                      'planned':len(tasks),'canonical':len(first),'ok':statuses['ok'],
                      'timed_out':statuses['timed_out'],'failed':statuses['failed'],
                      'not_started':len(expected-first.keys()),'rawRows':len(allrows),
                      'duplicateRows':len(allrows)-len(first),'taskSha256':sha(taskfile),
                      'resultSha256':sha(resultfile) if resultfile.exists() else None,
                      'workersLastInvocation':log.get('workers'),
                      'heldoutPolicyHash':log.get('policySha256'),
                      'executionFinished':log.get('finished')})
if (missing or unplanned or missing_artifacts) and not args.allow_partial:
    raise SystemExit(json.dumps({'missing':missing[:8],'unplanned':unplanned[:8],'missingArtifacts':missing_artifacts[:8]}))
assert len(registered)<=11500
group_rows=[]
for name,stems in groups.items():
    selected=[s for s in stage_rows if s['stage'] in stems]
    group_rows.append({'group':name,**{k:sum(s[k] for s in selected) for k in ['planned','canonical','ok','timed_out','failed','not_started','rawRows','duplicateRows']}})
status=collections.Counter(r['status'] for r in canonical)
splits={}
for split in sorted({r.get('split','unspecified') for r in canonical}):
    rs=[r for r in canonical if r.get('split','unspecified')==split]
    splits[split]={'canonical':len(rs),'statuses':dict(collections.Counter(r['status'] for r in rs))}
finished=[r.get('attemptFinished') for r in canonical if r.get('attemptFinished')]
last=max(finished) if finished else None
start=datetime.datetime.fromisoformat(protocol['assignmentStarted'].replace('Z','+00:00'))
now=datetime.datetime.now(datetime.timezone.utc)
source=json.loads((root/'data/baseline-manifest.json').read_text())
manifest_files=source.get('files',source)
if isinstance(manifest_files,list):
    expected_files={x['path']:x.get('sha256',x.get('hash')) for x in manifest_files}
else:expected_files=manifest_files
baseline_mismatches=[]
for name,expected in expected_files.items():
    if isinstance(expected,dict):expected=expected.get('sha256',expected.get('hash'))
    p=root.parent/'baseline'/name
    if not p.is_file() or sha(p)!=expected:baseline_mismatches.append(name)
assert not baseline_mismatches,baseline_mismatches
current_hashes=[]
for name,want in freeze['frozenCodeHashes'].items():
    p=root/name
    if sha(p)!=want:
        old=root/'evaluation/frozen-development'/pathlib.Path(name).name
        current_hashes.append({'path':name,'sealedSha256':want,'currentSha256':sha(p),
                               'sealedBytesPreserved':old.is_file() and sha(old)==want,
                               'note':'Review documented reporting/replay integration changes; selection, metric, adapter and worker hashes are verified separately.'})
critical=['evaluation/metrics.mjs','evaluation/intent.mjs','evaluation/analyze-portfolio.py',
          'evaluation/analyze-dependencies.py','evaluation/predict-cold-policy.py',
          'evaluation/trial-worker.mjs','evaluation/adapter.mjs','evaluation/source-tools.mjs']
critical_checks=[{'path':name,'matches':sha(root/name)==freeze['frozenCodeHashes'][name]} for name in critical]
assert all(x['matches'] for x in critical_checks),critical_checks
notes=[
 'A registered trial is one declared input/settings/edit invocation; repeated timings and preparation trials count. It can invoke several nested layout computations.',
 'OK means completed execution; it does not mean hard-valid or acceptable. Failed/time-out rows remain in denominators.',
 'Known API counts below are instrumentation sums, not the distinct-trial unit; missing timeout/ancillary counters are explicitly unknown.',
 'The nominal500 ancillary reservation is not a verified bound on all browser, general-unit-suite or exploratory calls.',
 'First terminal row is canonical; duplicate attempts do not improve results. Artifact recovery never reruns geometry.',
]
def known_sum(field):
    known=[r[field] for r in canonical if isinstance(r.get(field),(int,float)) and not isinstance(r.get(field),bool)]
    return {'sumOfRecordedValues':sum(known),'rowsWithRecordedValue':len(known),'rowsWithoutRecordedValue':len(canonical)-len(known)}
summary={'at':now.isoformat(),'assignmentStarted':protocol['assignmentStarted'],'lastRecordedTrialFinished':last,
         'elapsedHoursAtSummary':(now-start).total_seconds()/3600,'complete':not missing and not unplanned and not missing_artifacts,
         'baseline':protocol['baseline'],'baselineOriginalFilesChecked':len(expected_files),'baselineMismatches':baseline_mismatches,
         'policyFrozenAt':freeze['frozenAt'],'policyFreezeSha256':sha(root/'data/policy-freeze.json'),
         'registeredDistinctTrials':len(registered),'canonicalTerminalTrials':len(canonical),'canonicalStatuses':dict(status),
         'rawTerminalRows':sum(s['rawRows'] for s in stage_rows),'duplicateTerminalRows':len(duplicates),
         'mainLimit':11500,'overallDistinctTrialCeiling':12000,'nominalAncillaryReservation':500,
         'mainPlusFullAncillaryReservation':len(registered)+500,'splits':splits,'groups':group_rows,'stages':stage_rows,
         'recordedLayoutCalls':known_sum('engineCalls'),'recordedRouterCalls':known_sum('actualRouterCalls'),
         'successfulRoutingCacheHits':sum(r.get('routingCacheHit') is True for r in canonical),
         'routingCacheStatusUnknownRows':sum(r.get('routingCacheHit') is None for r in canonical),
         'timeoutPhaseCounts':dict(collections.Counter(r.get('timeoutPhase','unrecorded') for r in canonical if r['status']=='timed_out')),
         'missing':missing,'unplanned':unplanned,'missingReferencedArtifacts':missing_artifacts,'duplicates':duplicates,
         'criticalFrozenCodeChecks':critical_checks,'postFreezeIntegrationChanges':current_hashes,'notes':notes}
(root/'data/execution-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for name,rows in [('execution-summary.csv',stage_rows),('execution-groups.csv',group_rows)]:
    with (root/'data'/name).open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(json.dumps({k:summary[k] for k in ['complete','registeredDistinctTrials','canonicalTerminalTrials','canonicalStatuses','rawTerminalRows','baselineOriginalFilesChecked','elapsedHoursAtSummary']}))
