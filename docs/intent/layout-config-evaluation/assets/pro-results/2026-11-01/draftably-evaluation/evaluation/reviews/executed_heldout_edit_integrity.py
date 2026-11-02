import json,pathlib,hashlib,subprocess
root=pathlib.Path('deliverables');p=root/'data/analysis';m=json.loads((p/'edits-heldout-manifest.json').read_text());r=json.loads((p/'edits-heldout-records.json').read_text());freeze=json.loads((root/'data/policy-freeze.json').read_text())
checks=[]
for s in m['stages']:
 for field,rel in [('file_sha256',s['path']),('task_sha256','evaluation/tasks/'+s['stage']+'.json')]:
  checks.append({'path':rel,'expected':s[field],'observed':hashlib.sha256((root/rel).read_bytes()).hexdigest()})
for rel,key in [('evaluation/analyze-edits.py','analysis_code_sha256'),('evaluation/derive-edit-metrics.mjs','derivation_code_sha256'),('evaluation/edit-analysis-spec.json','analysis_spec_sha256'),('data/policy-freeze.json','policy_freeze_sha256')]:
 checks.append({'path':rel,'expected':m[key],'observed':hashlib.sha256((root/rel).read_bytes()).hexdigest()})
for rel in ['evaluation/analyze-edits.py','evaluation/derive-edit-metrics.mjs','evaluation/verify-control-archives.mjs','evaluation/metrics.mjs']:
 if rel in freeze['frozenCodeHashes']:checks.append({'path':rel,'expected':freeze['frozenCodeHashes'][rel],'observed':hashlib.sha256((root/rel).read_bytes()).hexdigest()})
requests={}
for x in r:
 if x['effective_status']=='ok':
  a={'id':x['effective_trial_id'],'geometry':x['effective_geometry'],'geometryHash':x['expected_effective_geometry_hash']};requests[(a['geometry'],a['geometryHash'])]=a
 ref=x['reference']
 if ref.get('expected_hash'):
  a={'id':ref['canonical_id'],'geometry':ref['path'],'geometryHash':ref['expected_hash']};requests[(a['geometry'],a['geometryHash'])]=a
result=subprocess.run(['node',str(root/'evaluation/verify-control-archives.mjs')],input=json.dumps(list(requests.values())),text=True,capture_output=True,check=True)
verification=json.loads(result.stdout)
print(json.dumps({'file_hash_checks':len(checks),'file_hash_errors':[c for c in checks if c['expected']!=c['observed']],'independent_geometry_signature_verification':verification,'scope':'Only E effective outputs and task-declared E pre-edit references; exact signature serialization only; no layout/routing call.'},indent=2))
