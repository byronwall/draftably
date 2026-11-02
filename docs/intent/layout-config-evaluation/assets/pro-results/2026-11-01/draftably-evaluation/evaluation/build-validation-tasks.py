import json,pathlib,itertools,datetime
root=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((root/'corpus/manifest.json').read_text());cases=m['cases'];by={c['id']:c for c in cases}
engines=['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid']
def write(name,tasks):
 for t in tasks:t.setdefault('timeoutMs',15000)
 (root/'evaluation/tasks'/f'{name}.json').write_text(json.dumps(tasks,indent=2)+'\n')
 print(name,len(tasks))
for split in ['development','heldout']:
 tasks=[]
 for c in cases:
  if c['split']!=split or not c['engines']:continue
  tasks.append(dict(id=f'C-doc-{split}-{c["id"]}',stage='C-documented-default',caseId=c['id'],family=c['family'],split=split,kind='source',sourcePath=c['path'],layout={'engine':'compound-flow' if c['groupCount'] else 'layered','direction':'auto','keepFit':True},tag='documented-default'))
 write('documented-default-'+split,tasks)

# Family strata chosen from source size/topology before timing or winner inspection.
ids=['pipelines-04','dags-01','hierarchies-03','architecture-01','cycles-01','networks-03','disconnected-04','routing-02','containers-01','presentation-03','authored-03','recipes-02']
tasks=[]
for cid,engine,change in itertools.product(ids,engines,['rename','reorder']):
 c=by[cid]
 tasks.append(dict(id=f'C-identity-{cid}-{engine}-{change}',stage='C-identity',caseId=cid,family=c['family'],split='development',kind='source',sourcePath=c['path'],layout={'engine':engine,'direction':'RIGHT','keepFit':True},**{change:True},tag=change))
write('identity-development',tasks)
tasks=[]
for cid,engine,repeat in itertools.product(ids,engines,range(6)):
 c=by[cid]
 tasks.append(dict(id=f'C-timing-{cid}-{engine}-r{repeat}',stage='C-timing',caseId=cid,family=c['family'],split='development',kind='source',sourcePath=c['path'],layout={'engine':engine,'direction':'RIGHT','keepFit':True},bypassCache=True,tag='warmup' if repeat==0 else 'timing',repeat=repeat))
write('timing-development',tasks)
(root/'data/timing-sample-freeze.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'basis':'one source-selected base per family, 8–48nodes; no timing or candidate-win selection','cases':ids,'engineMethods':engines,'warmups':1,'samples':5,'concurrency':1,'cache':'disabled; production compiler/router/labels each invocation'},indent=2)+'\n')
tasks=[]
for c in m['extras']:
 if c['kind']!='sanity':continue
 for engine in engines:
  tasks.append(dict(id=f'C-sanity-{c["id"]}-{engine}',stage='C-sanity',caseId=c['id'],family='sanity',split='development',kind='source',sourcePath=c['path'],layout={'engine':engine,'direction':'RIGHT','keepFit':False}))
write('sanity',tasks)

# Raw engine network mode is not a source recipe; preserve this distinction explicitly.
tasks=[]
sample=[c for c in cases if c['split']=='development' and c['family'] in ['networks','disconnected','cycles']]
for c,engine,respect in itertools.product(sample,['force','stress','compound-spring','grid'],[True,False]):
 tasks.append(dict(id=f'D-network-{c["id"]}-{engine}-{respect}',stage='D-network-direction',caseId=c['id'],family=c['family'],split='development',kind='warm',reference=f'data/geometry/C-development-{c["id"]}-current.json.gz',allowPartialReference=True,options={'algorithm':engine,'mode':'rebuild','warmStart':False,'settle':True,'maxIterations':640,'growContainers':True,'respectDirection':respect,'scope':'all'},control='respectDirection',level=respect,tag='raw-cold-engine-not-source'))
write('network-direction',tasks)
