"""Cross the development-selected three layout and routing policies on12source strata."""
import json,pathlib,datetime,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
cases={c['id']:c for c in json.loads((root/'corpus/manifest.json').read_text())['cases']}
layouts=json.loads((root/'data/policy-compact.json').read_text())['jointLayoutChoices']
routes=json.loads((root/'data/analysis/routing-policy-proposal.json').read_text())['policies']
ids=['pipelines-03','dags-03','hierarchies-03','architecture-03','cycles-03','networks-03','disconnected-03','routing-03','containers-03','presentation-03','authored-03','recipes-02']
tasks=[]
for cid in ids:
 c=cases[cid]
 for i,l in enumerate(layouts):
  for j,r in enumerate(routes):
   tasks.append(dict(id=f'D-joint-{cid}-layout{i+1}-route{j+1}',stage='D-joint',caseId=cid,family=c['family'],split='development',kind='source',sourcePath=c['path'],layout=l['layout'],routing=r['routing'],tag={'layoutMethod':l['method'],'routingPolicy':r['policy_id']},timeoutMs=15000))
out=root/'evaluation/tasks/joint-development.json';out.write_text(json.dumps(tasks,indent=2)+'\n')
(root/'data/joint-design-freeze.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cases':ids,'layouts':[{'method':x['method'],'layout':x['layout']}for x in layouts],'routingPolicies':[{'id':x['policy_id'],'settings':x['routing']}for x in routes],'tasks':len(tasks),'taskSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'selection':'Layout: three distinct-engine globally ranked development methods; routing: exact best three-policy fully observed fixed-geometry portfolio; no heldout data.','specialistPreservation':'Nested cell recipes remain; unrelated root sequence/lane replacements excluded.'},indent=2)+'\n')
print('joint-development',len(tasks))
