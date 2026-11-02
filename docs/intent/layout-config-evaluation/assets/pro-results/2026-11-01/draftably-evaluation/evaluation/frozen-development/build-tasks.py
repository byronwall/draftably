#!/usr/bin/env python3
"""Predeclare nonadaptive trials from frozen source facts, never from outcome scores."""
import json,pathlib,hashlib,datetime,itertools,os
ROOT=pathlib.Path(__file__).resolve().parents[1]
MAN=json.loads((ROOT/'corpus/manifest.json').read_text())
ROUTES=json.loads((ROOT/'corpus/routing/manifest.json').read_text())
SPEC=json.loads((ROOT/'evaluation/settings-spec.json').read_text())
OUT=ROOT/'evaluation/tasks';OUT.mkdir(parents=True,exist_ok=True)
CASES=MAN['cases'];DEV=[c for c in CASES if c['split']=='development']
ENGINES=['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid']
ALIASES={'routing_congestion':'routing','presentation_constraints':'presentation','structural_recipes':'recipes'}
def write(name,tasks):
 assert len({t['id'] for t in tasks})==len(tasks),name
 for t in tasks:t.setdefault('timeoutMs',15000)
 (OUT/(name+'.json')).write_text(json.dumps(tasks,indent=2)+'\n')
 return len(tasks)
def base(c,stage,slug,**args):
 return dict(id=f'{stage}-{c["id"]}-{slug}',stage=stage,caseId=c['id'],family=c['family'],split=c['split'],kind='source',sourcePath=c['path'],**args)
def pick(families,n=12,grouped=False):
 fs=[ALIASES.get(f,f) for f in families]
 eligible=[c for c in DEV if c['engines'] and (not grouped or c['groupCount']>0)]
 # Round-robin families, smaller examples first, then fill from the remaining relevant cases.
 lists={f:sorted([c for c in eligible if c['family']==f],key=lambda c:(c['nodeCount'],c['id'])) for f in fs}
 result=[]
 for i in range(4):
  for f in fs:
   if len(lists[f])>i:result.append(lists[f][i])
 for c in sorted(eligible,key=lambda c:(c['nodeCount'],c['id'])):
  if c not in result:result.append(c)
 return result[:n]
def token(v):return str(v).replace('.','p').replace('$','').replace('/','_')
def ref(c):return f'data/geometry/C-{c["split"]}-{c["id"]}-current.json.gz'
counts={}

# C: heldout task inputs are reserved now but cannot run before policy-freeze.json.
for split in ['development','heldout']:
 tasks=[];stage='C-'+split
 for c in [c for c in CASES if c['split']==split]:
  tasks.append(base(c,stage,'current',tag='current'))
  if not c['engines']:continue
  for engine,direction in itertools.product(c['engines'],c['directions']):
   tasks.append(base(c,stage,engine+'-'+direction,layout={'engine':engine,'direction':direction,'keepFit':True},tag='engine-default'))
  for recipe,direction in [('none',None),('flow','RIGHT'),('flow','DOWN'),('row',None),('column',None)]:
   tasks.append(base(c,stage,'recipe-'+recipe+(('-'+direction) if direction else ''),layout={'remove':recipe=='none','recipe':None if recipe=='none' else recipe,'direction':direction,'keepFit':True},tag='recipe-baseline'))
 counts['screen-'+split]=write('screen-'+split,tasks)

# D: fifteen public source parameters, twelve relevant independent development bases each.
tasks=[]
for spec in SPEC['source_engine_parameters']:
 grouped=spec['key'] in ['groupGap','boundaryPull','hierarchySweeps']
 sample=pick(spec['families'],12,grouped)
 assert len(sample)==12 and len({c['family'] for c in sample})>=2
 levels=spec['levels']+spec.get('categorical_coverage',[])
 for c,value in itertools.product(sample,levels):
  v=value
  if v=='$automatic':v=None
  elif v=='$source_node':v=c['nodeIDs'][0]
  elif v=='$non_source_node':v=c['nodeIDs'][-1]
  tasks.append(base(c,'D-layout',spec['key']+'-'+token(value),layout={'engine':spec['engine'],'direction':'RIGHT','keepFit':False,'attrs':{spec['attr']:v}},control=spec['key'],level=value,tag='source-parameter'))
for spec in SPEC['source_other_parameters']:
 sample=pick(spec['families'],12)
 for c,v in itertools.product(sample,spec['levels']+spec.get('categorical_coverage',[])):
  attrs={} if spec['attr']=='direction' else {spec['attr']:v}
  layout={'engine':spec.get('engine'),'recipe':spec.get('recipe'),'direction':v if spec['attr']=='direction' else 'RIGHT','attrs':attrs,'keepFit':False}
  tasks.append(base(c,'D-other',spec['attr']+'-'+token(v),layout=layout,control=spec['attr'],level=v,tag='source-attribute'))
counts['settings-layout']=write('settings-layout',tasks)

# D: fixed geometry for router settings. These probes never enter heldout quality denominators.
rfixtures=ROUTES.get('fixtures',ROUTES.get('cases'))
tasks=[]
for c in rfixtures:
 tasks.append(dict(id='D-freeze-'+c['id'],stage='D-freeze',caseId=c['id'],family=c['family'],split='development',kind='source',sourcePath=c['path'],tag='routing-position-freeze'))
counts['prepare-routing']=write('prepare-routing',tasks)
tasks=[]
for c in rfixtures:
 b=dict(stage='D-routing',caseId=c['id'],family=c['family'],split='development',kind='route',reference='data/geometry/D-freeze-'+c['id']+'.json.gz')
 tasks.append(dict(b,id='D-routing-'+c['id']+'-default',routing={},tag='shared-baseline'))
 for spec in SPEC['routing_parameters']:
  for level in spec['levels']:
   if level==spec['default']:continue
   tasks.append(dict(b,id='D-routing-'+c['id']+'-'+spec['key']+'-'+token(level),routing={spec['key']:level},control=spec['key'],level=level,tag='route-parameter'))
 edit=c['smallEdit'];move={edit['id']:{'dx':edit.get('dx',0),'dy':edit.get('dy',0)}}
 for history in [False,True]:
  for level in [0,20,100]:
   tasks.append(dict(b,id='D-history-'+c['id']+'-'+str(history)+'-'+str(level),stage='D-history',routing={'portStability':level},control='portStability',level=level,history=history,patchDoc={'move':move},tag='shared-prior' if history else 'empty-prior'))
 # Authored constraint versus released automatic ports on identical geometry.
 var=c['explicitVariants'][0]
 cfg={var['edgeId']:{'fromSide':var['fromSide'],'toSide':var['toSide']}}
 tasks.append(dict(b,id='D-port-'+c['id']+'-automatic',stage='D-ports',routing={},patchDoc={'releaseSides':True},tag='automatic-ports'))
 tasks.append(dict(b,id='D-port-'+c['id']+'-authored',stage='D-ports',routing={},patchDoc={'releaseSides':True,'edges':cfg},tag='authored-ports'))
 # Twelve fixtures exhaust all sixteen side pairs for one nominated edge.
 if rfixtures.index(c)<12:
  for a,z in itertools.product(['left','right','top','bottom'],repeat=2):
   tasks.append(dict(b,id='D-side-'+c['id']+'-'+a+'-'+z,stage='D-ports',routing={},patchDoc={'releaseSides':True,'edges':{var['edgeId']:{'fromSide':a,'toSide':z}}},tag='explicit-side-grid'))
counts['settings-routing']=write('settings-routing',tasks)

tasks=[]
lookup={s['key']:s['levels'] for s in SPEC['routing_parameters']}
for num,(a,b) in enumerate(SPEC['routing_interactions']):
 # Same eight diverse predeclared fixtures for every grid, not outcome-selected witnesses.
 sample=[rfixtures[i] for i in [0,2,5,8,10,13,17,21]]
 for c,x,y in itertools.product(sample,lookup[a],lookup[b]):
  t=dict(id=f'D-rgrid-{num}-{c["id"]}-{token(x)}-{token(y)}',stage='D-routing-interaction',caseId=c['id'],family=c['family'],split='development',kind='route',reference='data/geometry/D-freeze-'+c['id']+'.json.gz',routing={a:x,b:y},control=a+'*'+b,level=[x,y])
  if a=='portStability':
   e=c['smallEdit'];t['patchDoc']={'move':{e['id']:{'dx':e.get('dx',0),'dy':e.get('dy',0)}}};t['history']=True
  tasks.append(t)
counts['interactions-routing']=write('interactions-routing',tasks)

tasks=[]
for spec in SPEC['layout_interactions']:
 a,b=spec['keys'];levels=spec['levels']
 fs=['architecture','containers','routing'] if a=='boundaryPull' else ['pipelines','presentation'] if a=='aspect' else ['dags','hierarchies']
 sample=pick(fs,4,a=='boundaryPull')
 attr=lambda key:next(s['attr'] for s in SPEC['source_engine_parameters'] if s['key']==key)
 for c,x,y in itertools.product(sample,*levels):
  tasks.append(base(c,'D-lgrid',a+'-'+token(x)+'-'+b+'-'+token(y),layout={'engine':spec['engine'],'direction':'RIGHT','keepFit':False,'attrs':{attr(a):x,attr(b):y}},control=a+'*'+b,level=[x,y],tag=spec['design']))
counts['interactions-layout']=write('interactions-layout',tasks)

# Warm repair and editor-only settings. Exclude specialist source rows from generic repair samples.
warm_sample=pick(['pipelines','dags','hierarchies','architecture','cycles','networks','disconnected','routing','containers','presentation','authored'],12)
tasks=[]
for spec in SPEC['warm_layout_parameters']:
 sample=pick(['architecture','containers','authored','routing'],12,True) if spec['key'] in ['growContainers','scope'] else warm_sample
 for c,level in itertools.product(sample,spec['levels']):
  nodes=c['nodeIDs'];pinned={p['id'] for p in c['authoredPins']};free=[n for n in nodes if n not in pinned] or nodes
  options={'algorithm':spec['algorithm'],'mode':spec['mode'],'warmStart':spec.get('warmStart',True),'settle':spec.get('settle',False),'scope':'all','maxMove':96 if spec['key']=='ordering' else 48}
  patch={'manual':free[:2],'move':{free[-1]:{'dx':80,'dy':40}}}
  v=level
  if spec['key']=='scope':
   options.update(scope=level,selected=free[:2]);
   if level=='container':options['containerId']=c['groupIDs'][0]
  elif spec['key']=='fixedIds':v=[] if not level else free[:2];options['fixedIds']=v
  else:options[spec['key']]=v
  tasks.append(dict(id=f'D-warm-{c["id"]}-{spec["key"]}-{token(level)}',stage='D-warm',caseId=c['id'],family=c['family'],split='development',kind='warm',reference=ref(c),options=options,patchDoc=patch,history=True,control=spec['key'],level=level,tag='warm-setting'))
for c,engine in itertools.product(warm_sample,ENGINES+['separate']):
 tasks.append(dict(id=f'C-repair-{c["id"]}-{engine}',stage='C-repair',caseId=c['id'],family=c['family'],split='development',kind='warm',reference=ref(c),options={'algorithm':engine,'mode':'pass','scope':'all','warmStart':True,'settle':False},history=True,tag='warm-repair'))
counts['settings-warm']=write('settings-warm',tasks)

# Comparable retuning budget: four source presets per engine, twelve bases each.
tuning={
 'compound-flow':[{}, {'rank-gap':24,'node-gap':12},{'rank-gap':100,'node-gap':48},{'boundary-pull':100,'hierarchy-sweeps':4}],
 'boundary-align':[{}, {'boundary-pull':0,'alignment':0},{'boundary-pull':100,'alignment':100},{'hierarchy-sweeps':4,'group-gap':96}],
 'compound-spring':[{}, {'edge-length':48,'compactness':90},{'edge-length':144,'compactness':0},{'boundary-pull':100,'hierarchy-sweeps':4}],
 'tidy':[{}, {'edge-length':48,'alignment':100},{'edge-length':144,'alignment':0},{'compactness':90,'node-gap':12}],
 'stress':[{}, {'edge-length':48,'compactness':90},{'edge-length':144,'compactness':0},{'node-gap':48,'aspect':'1'}],
 'force':[{}, {'edge-length':48,'repulsion':0},{'edge-length':144,'repulsion':90},{'compactness':90,'aspect':'1'}],
 'flow':[{}, {'edge-length':48,'flow-strength':100},{'edge-length':144,'flow-strength':0},{'alignment':100,'node-gap':48}],
 'layered':[{}, {'rank-gap':24,'node-gap':12},{'rank-gap':100,'node-gap':48},{'fold':'auto','aspect':'1'}],
 'tree':[{}, {'rank-gap':24,'node-gap':12},{'rank-gap':100,'node-gap':48},{'root':'$last'}],
 'grid':[{}, {'grid-strength':0,'compactness':0},{'grid-strength':100,'compactness':90},{'aspect':'1','node-gap':12}],
}
tasks=[]
for c,engine in itertools.product(warm_sample,ENGINES):
 for i,attrs in enumerate(tuning[engine]):
  attrs={k:c['nodeIDs'][-1] if v=='$last' else v for k,v in attrs.items()}
  tasks.append(base(c,'G-tune',engine+'-p'+str(i),layout={'engine':engine,'direction':'RIGHT','keepFit':True,'attrs':attrs},tag=f'preset-{i}'))
counts['tuning-development']=write('tuning-development',tasks)

freeze=ROOT/'data/protocol-freeze.json'
if not freeze.exists():
 start=datetime.datetime.fromtimestamp((ROOT.parent/'baseline-manifest.json').stat().st_mtime,datetime.timezone.utc).isoformat()
 record={'baseline':MAN['baseline'],'assignmentStarted':start,'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'maxDistinctTrials':12000,'reservedMainTrialLimit':11500,'ancillaryAllowance':500,'wallClockHours':6,'trialTimeoutMs':90000,'maxWorkerProcesses':4,
 'splitSha256':hashlib.sha256((ROOT/'corpus/manifest.json').read_bytes()).hexdigest(),'routingSha256':hashlib.sha256((ROOT/'corpus/routing/manifest.json').read_bytes()).hexdigest(),'settingsSha256':hashlib.sha256((ROOT/'evaluation/settings-spec.json').read_bytes()).hexdigest(),
 'metricSha256':hashlib.sha256((ROOT/'evaluation/metrics.mjs').read_bytes()).hexdigest(),
 'profiles':{'readable':'direct DI per10 + 2*aspect error','compact':'balanced DI per10 + 8*ln(area / minimum valid area on same base) + 2*aspect error','traceable':'traceable DI per10','stable':'balanced DI per10 + adjusted displacement / 24 + 5*changed-side rate (edit trials); balanced DI for static screening','specialist':'balanced DI per10 with required semantic gates'},
 'acceptability':'Hard-valid and intent-valid first; within 1 score unit, 10% area, and 10% route length of the profile oracle, with strictly identical zero additional hard defects. Baseline equality always acceptable to itself. Sensitivity doubles/halves bands without retuning.',
 'weightingAssumptions':['equal-family','common80-niche20','common50-niche50','worst-family'],
 'selection':'Exhaustive all subsets of 10 engine IDs size1..5; specialist recipes and current authored source remain separate fallback. Select presets/selector only development; seal before any heldout execution.',
 'selector':'A depth<=3 deterministic decision tree over pre-layout node/edge/group count, density, undirected fraction, component count, degree, depth, cycles, target format; min4development bases per leaf. Infeasible labels use current source fallback.',
 'heldoutAcceptance':'At least95% of current-pool acceptable common-job coverage; no supported specialist task loss without explicit escape hatch; no new hard-defect case where today valid.',
 'routingPolicySelection':'Choose3 policies from all-default + tested single-knob or grid points, using development fixed-geometry results; cross best3layout choices x3routing on12developmentbases.',
 'edits':'24bases,4independent edits +colornegativecontrol; cold current/global/selector, warm tidy/separate/group-aware repair. Same prior routes per candidate. Requested directionchange excluded from movement penalties.',
 'predeclaredDeviations':['3x2 aspect-fold interaction because fold has exactly2validvalues','Historial corpus is development evidence only','Keep authored fit during engine screening; isolate direction in D-other with fit removed','Source parameter small-boundary minimum-size tests may be masked; retain controls unless targeted witnesses resolve','No independent human or usability-study claims'],
 'plannedNonadaptiveCounts':counts}
 freeze.write_text(json.dumps(record,indent=2)+'\n')
(ROOT/'data/planned-stage-counts.json').write_text(json.dumps(counts,indent=2)+'\n')
print(json.dumps(counts,indent=2))
