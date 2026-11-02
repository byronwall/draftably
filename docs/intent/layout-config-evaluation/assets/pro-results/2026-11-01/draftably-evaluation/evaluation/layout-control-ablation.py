"""Matched-budget replacement tuning after fixing each source layout control to default.
Build choices follow consumed source branches, not observed alternative quality.
"""
import argparse,collections,copy,datetime,hashlib,itertools,json,math,pathlib,statistics
root=pathlib.Path(__file__).resolve().parents[1]
arg=argparse.ArgumentParser();arg.add_argument('--phase',choices=['build','analyze'],required=True);args=arg.parse_args()
spec=json.loads((root/'evaluation/settings-spec.json').read_text())['source_engine_parameters']
original_tasks=json.loads((root/'evaluation/tasks/settings-layout.json').read_text())
mapping={
 'rankGap':('node-gap',[12,48]),'groupGap':('node-gap',[12,48]),'nodeGap':('rank-gap',[24,100]),
 'boundaryPull':('hierarchy-sweeps',[1,4]),'hierarchySweeps':('boundary-pull',[0,100]),
 'edgeLength':('alignment',[0,100]),'repulsion':('edge-length',[48,144]),
 'flowStrength':('rank-gap',[24,100]),'alignment':('edge-length',[48,144]),
 'compactness':('edge-length',[48,144]),'gridStrength':('aspect',[.75,2]),
 'ordering':('node-gap',[48]),'fold':('aspect',[.75]),'aspect':('grid-strength',[0,100]),
 'rootId':('rank-gap',[24,100]),
}
def default_task(t,s):
 value=t['layout']['attrs'].get(s['attr'])
 return value is None if s['key']=='rootId' else str(value)==str(s['default'])
design=[];tasks=[]
for s in spec:
 defaults=[t for t in original_tasks if t.get('control')==s['key'] and default_task(t,s)]
 assert len(defaults)==12,(s['key'],len(defaults))
 buddy,levels=mapping[s['key']]
 design.append(dict(control=s['key'],fixedDefault=s['default'],replacementAttribute=buddy,replacementAlternatives=levels,
                    beforeCandidateBudget=len(s['levels']),afterCandidateBudget=1+len(levels),
                    originalCoreLevels=s['levels'],cases=[t['caseId']for t in defaults],
                    originalBaselineTrials=[t['id']for t in defaults],
                    semanticCaution=s['key']in['rootId','ordering','fold','aspect']))
 for base in defaults:
  for level in levels:
   task=copy.deepcopy(base);task.update(id=f'G-control-{base["caseId"]}-{s["key"]}-via-{buddy}-{str(level).replace(".","p")}',stage='G-layout-control-ablation',level=level,tag='default-fixed-other-control-retuning')
   task['layout']['attrs'][buddy]=level
   task['replacementControl']=buddy;task['removedControl']=s['key'];task['baselineTrial']=base['id'];task['timeoutMs']=15000
   tasks.append(task)
file=root/'evaluation/tasks/layout-control-ablation.json'
if args.phase=='build':
 file.write_text(json.dumps(tasks,indent=2)+'\n')
 (root/'data/layout-control-ablation-freeze.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stage':'adaptive development only, before these replacement trials','trials':len(tasks),'design':design,'rule':'For each removed source control, hold it to its original default and choose one global value of one other consumed parameter from default plus one/two alternatives. Before/after candidate budgets match the original core categorical/three-level design; extra aspect categorical coverage is excluded. No heldout tuning.','limits':'This bounded replacement search does not prove a continuous optimum. Quality recovery cannot replace authored direction, root, fold, ordering or target-format intent. Warm protection/scope are separate job constraints, not interchangeable numeric choices.','taskSha256':hashlib.sha256(file.read_bytes()).hexdigest()},indent=2)+'\n')
 print('layout-control-ablation',len(tasks));raise SystemExit

def read(name):
 result={}
 for line in (root/'data'/f'{name}.jsonl').read_text().splitlines():
  row=json.loads(line);result.setdefault(row['id'],row)
 return result
original=read('settings-layout');replacement=read('layout-control-ablation')
if any(t['id']not in replacement for t in tasks):raise SystemExit('Wait for every ablation task terminal outcome.')
def valid(r):return r.get('status')=='ok' and r.get('metrics',{}).get('hardValid',False)
def score(r,w='balanced'):return r['metrics']['weightingScores'][w] if valid(r) else math.inf
def acceptable(r,oracle,w='balanced'):
 if not valid(r)or not valid(oracle):return False
 return score(r,w)<=score(oracle,w)+1+1e-8 and r['metrics']['area']<=oracle['metrics']['area']*1.1+1e-8 and r['metrics']['routeLength']<=oracle['metrics']['routeLength']*1.1+1e-8
def global_choice(configs,w):
 def rank(item):
  name,rs=item;ok=[r for r in rs.values()if valid(r)]
  return (-len(ok),statistics.mean(score(r,w)for r in ok)if ok else math.inf,name!='default',str(name))
 return min(configs.items(),key=rank)
results=[]
for s,d in zip(spec,design):
 cidlist=d['cases']; defaults={t['caseId']:original[t['id']]for t in original_tasks if t.get('control')==s['key'] and default_task(t,s)}
 before={'default':defaults};after={'default':defaults}
 for level in s['levels']:
  if level==s['default'] or(s['key']=='rootId'and level=='$automatic'):continue
  rs={t['caseId']:original[t['id']]for t in original_tasks if t.get('control')==s['key'] and str(t.get('level'))==str(level)}
  assert len(rs)==12,(s['key'],level,len(rs));before[str(level)]=rs
 for level in d['replacementAlternatives']:
  rs={t['caseId']:replacement[t['id']]for t in tasks if t['control']==s['key']and t['level']==level}
  after[str(level)]=rs
 profiles={}
 for w in ['balanced','traceable','direct']:
  bname,b=global_choice(before,w);aname,a=global_choice(after,w)
  oracle={cid:min([rs[cid]for rs in itertools.chain(before.values(),after.values())],key=lambda r:(not valid(r),score(r,w),r['id']))for cid in cidlist}
  def summarize(rs):
   return dict(validBases=sum(valid(r)for r in rs.values()),acceptableBases=sum(acceptable(rs[cid],oracle[cid],w)for cid in cidlist),
               meanScoreValidOnly=statistics.mean(score(r,w)for r in rs.values()if valid(r))if any(valid(r)for r in rs.values())else None,
               timeouts=sum(r['status']=='timed_out'for r in rs.values()),failed=sum(r['status']=='failed'for r in rs.values()))
  witnesses=[]
  for cid in cidlist:
   if acceptable(b[cid],oracle[cid],w)and not acceptable(a[cid],oracle[cid],w):
    witnesses.append(dict(caseId=cid,beforeTrial=b[cid]['id'],fixedDefaultTrial=defaults[cid]['id'],retunedTrial=a[cid]['id'],beforeScore=score(b[cid],w),retunedScore=score(a[cid],w)if valid(a[cid])else None,retunedHardValid=valid(a[cid])))
  profiles[w]=dict(beforeGlobalLevel=bname,retunedGlobalLevel=aname,before=summarize(b),fixedDefault=summarize(defaults),retuned=summarize(a),
                   acceptableLossAfterRetuning=summarize(b)['acceptableBases']-summarize(a)['acceptableBases'],
                   newHardCasesAfterRetuning=[cid for cid in cidlist if valid(b[cid])and not valid(a[cid])],lossWitnesses=witnesses,
                   oracleFeasibleBases=sum(valid(r)for r in oracle.values()))
 results.append({**d,'profiles':profiles,'claim':'Measured bounded compensating search, not proof that the control or its authored semantics can be deleted.'})
out=root/'data/analysis/layout-control-ablations.json';out.write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'trials':len(tasks),'controls':results,'heldoutRead':False},indent=2)+'\n')
lines=['# Source layout control removal and bounded replacement tuning','',
 '**Measured development evidence.** Each of the15source layout controls is fixed to its default, then one other consumed control is retuned over the same number of global candidate configurations as the original core sensitivity screen. The12relevant bases and original engine are unchanged. This adds336actual production-pipeline trials.','',
 'Hard-validity coverage ranks before mean score. The table uses the balanced weighting; traceable/direct sensitivity and every witness remain in the JSON. Acceptance is relative to the shared union of tested before/after alternatives. A successful replacement can be worse on individual cases even when its aggregate count improves.','',
 '| Removed control | Replacement varied | Configs before/after | Before valid / acceptable | Fixed default valid / acceptable | Retuned valid / acceptable | Newly lost acceptable cases |','| --- | --- | ---: | --- | --- | --- | --- |']
for r in results:
 p=r['profiles']['balanced'];fmt=lambda s:f'{s["validBases"]}/12 / {s["acceptableBases"]}/12'
 lines.append(f'| {r["control"]} | {r["replacementAttribute"]} | {r["beforeCandidateBudget"]}/{r["afterCandidateBudget"]} | {fmt(p["before"])} | {fmt(p["fixedDefault"])} | {fmt(p["retuned"])} | '+(', '.join(x['caseId']for x in p['lossWitnesses'])or'none')+' |')
lines+=['','Root selection, folding, reading order and target aspect can encode user intent; recovering a numerical score cannot replace those requests. This experiment supplies deletion-loss evidence, not a blanket removal recommendation. Warm scope, pins, manual protection and action semantics stay covered by the separate warm sensitivity and edit studies.','']
(root/'layout-control-ablation.md').write_text('\n'.join(lines))
print(json.dumps({'controls':len(results),'trials':len(tasks),'output':str(out)}))
