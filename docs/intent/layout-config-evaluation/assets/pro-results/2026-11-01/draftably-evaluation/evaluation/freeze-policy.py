"""Seal measured development proposals only after all mandatory development work is terminal."""
import datetime,hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
destination=root/'data/policy-freeze.json'
if destination.exists():raise SystemExit('Policy already sealed; never overwrite it after heldout access.')
if list((root/'data').glob('*heldout*.jsonl')):raise SystemExit('Heldout outcomes already exist; refuse retroactive freeze.')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
protocol=json.loads((root/'data/protocol-freeze.json').read_text())
assert sha(root/'corpus/manifest.json')==protocol['splitSha256']
assert sha(root/'evaluation/metrics.mjs')==protocol['metricSha256']
assert sha(root/'corpus/routing/manifest.json')==protocol['routingSha256']
stage_records=[]
for file in sorted((root/'evaluation/tasks').glob('*.json')):
 tasks=json.loads(file.read_text())
 if not tasks or any(t.get('split')=='heldout'for t in tasks):continue
 results=root/'data'/f'{file.stem}.jsonl'
 rows={}
 for line in results.read_text().splitlines():
  row=json.loads(line);rows.setdefault(row['id'],row)
 missing=[t['id']for t in tasks if t['id']not in rows]
 if missing:raise SystemExit(f'Unfinished development stage {file.stem}: {missing[:3]}')
 stage_records.append({'stage':file.stem,'tasks':len(tasks),'taskSha256':sha(file),'canonicalRows':len(rows),'resultSha256':sha(results)})
visual=[]
for phase,expected in [('routing',10),('development',26)]:
 file=root/'data'/f'visual-judgments-{phase}.json';data=json.loads(file.read_text());assert len(data['judgments'])==expected
 visual.append({'phase':phase,'pairs':expected,'sha256':sha(file)})
proposal=json.loads((root/'data/policy-proposal.json').read_text())
assert proposal['analysisCodeSha256']==sha(root/'evaluation/analyze-portfolio.py')
assert proposal.get('engineRecipeDiagnostic') and proposal.get('compact')
analysis_files=['analysis/routing-policy-proposal.json','analysis/joint-policy-proposal.json',
 'analysis/edits-development-summary.json','analysis/edits-development-direction-diagnostics.json',
 'analysis/layout-control-ablations.json','analysis/visual-agreement-development.json',
 'analysis/cell-access-audit-development.json','analysis/validation/timing.json','analysis/validation/determinism.json']
for name in analysis_files:assert(root/'data'/name).is_file(),name
frozen={'schema':'draftably-heldout-policy-freeze-1','frozen':True,'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'baseline':protocol['baseline'],'proposal':proposal,
 'routingProposal':json.loads((root/'data/analysis/routing-policy-proposal.json').read_text()),
 'jointProposal':json.loads((root/'data/analysis/joint-policy-proposal.json').read_text()),
 'developmentStages':stage_records,'visualJudgments':visual,
 'developmentEvidenceHashes':{name:sha(root/'data'/name)for name in analysis_files},
 'frozenCodeHashes':{str(p.relative_to(root)):sha(p)for p in sorted((root/'evaluation').glob('*'))if p.is_file()},
 'visualBandDecision':{'retainBorrowedBands':True,'reason':'Thirty-six blinded development pairs expose both useful ties and metric/visual reversals. Keep the declared bands for reproducibility, explicitly retain visual disagreements, and do not claim human-calibrated perceptual equivalence. No heldout outcomes exist.'},
 'heldoutRoutingPlan':{'currentSource':24*3,'joint':24*9,'rule':'Apply three already selected routing settings to each current heldout source and all nine development-selected layout×routing combinations; preserve specialist source where generic root rebuild is inapplicable. Global/triple choices come only from jointProposal.'},
 'heldoutVisualPlan':{'pairs':24,'seed':20261102,'rule':'Twelve family strata plus twelve targeted completed-output comparisons: contested engine witnesses, worst frozen-portfolio regressions and metric/directness disagreements. Timeouts remain numeric failures and are never fabricated into full render pairs.'},
 'editWorkflow':'Cold current/best-single/feature-selector; warm protected tidy/separate/group-aware. Global direction/fit dispatches to cold source rebuild; raw bounded-pass global reflow remains diagnostic. Color edits retain warm geometry.',
 'supplementaryAudits':'Direction/fit interpretation and cell-access raw-body obstacle audit are separately reported; frozen metrics/rankings are not silently rewritten.',
 'decisionRule':'Apply only stored development subsets/configurations/trees on heldout, report exact relative and absolute denominators plus hard regressions and specialist reachability. Do not train or select new configurations on heldout. A reduced automatic default requires the original95%relative contract; otherwise retain current behavior and document the smallest defensible accessible portfolio.',
 'scope':'Evaluation/design only. No product modification, commit, push or deployment.'}
destination.write_text(json.dumps(frozen,indent=2)+'\n')
(root/'data/policy-freeze.sha256').write_text(sha(destination)+'  policy-freeze.json\n')
print(json.dumps({'sealed':str(destination),'at':frozen['frozenAt'],'sha256':sha(destination),'developmentStages':len(stage_records),'visualPairs':36,'heldoutOutcomesBeforeFreeze':0}))
