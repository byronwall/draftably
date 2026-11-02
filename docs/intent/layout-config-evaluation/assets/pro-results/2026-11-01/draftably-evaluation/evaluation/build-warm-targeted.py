"""Supplement scope/protection probes with valid sibling selections and explicit partial inputs.
Original unsupported-selection errors remain in the primary data; no retry replaces them.
"""
import collections,copy,datetime,gzip,itertools,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((root/'corpus/manifest.json').read_text())
def artifact(cid):
 a=root/'data/geometry'/f'C-development-{cid}-current.json.gz'
 if not a.exists():a=root/'data/layout-checkpoints'/f'C-development-{cid}-current.json.gz'
 return json.loads(gzip.decompress(a.read_bytes()))
def descendants(doc,id):
 ids={id};objects=doc['graph']['nodes']+doc['graph']['groups']
 while True:
  more={o['id']for o in objects if o.get('parentId')in ids}
  if more<=ids:break
  ids|=more
 return ids
preferred=['architecture-01','architecture-02','architecture-03','architecture-04','containers-01','containers-02','containers-03','containers-04','authored-01','authored-03','recipes-02','recipes-04']
order=preferred+[c['id']for c in m['cases']if c['split']=='development'and c['groupCount']and c['engines']and c['id']not in preferred]
tasks=[];design=[]
for cid in order:
 if len(design)>=12:break
 c=next(c for c in m['cases']if c['id']==cid);a=artifact(cid);doc=a['doc'];objects=doc['graph']['nodes']+doc['graph']['groups'];parents={o['id']:o.get('parentId')for o in objects}
 siblings=collections.defaultdict(list)
 for o in objects:siblings[o.get('parentId')].append(o['id'])
 admissible=[]
 for parent,ids in siblings.items():
  for pair in itertools.combinations(ids,2):
   neighbourhood=set(pair)
   for e in doc['graph']['edges']:
    if e['from']in pair:neighbourhood.add(e['to'])
    if e['to']in pair:neighbourhood.add(e['from'])
   if all(parents.get(x)==parent for x in neighbourhood):
    protected=sum(bool(doc['layout']['nodes'][x].get('pinned'))for x in pair)
    admissible.append((protected,parent is not None,parent or '',pair))
 if not admissible:continue
 _,_,parent,pair=min(admissible);container=parent or doc['graph']['groups'][0]['id']
 pair=list(pair);movable=next((id for id in pair if not doc['layout']['nodes'][id].get('pinned')),None)
 moved=descendants(doc,movable)if movable else set()
 patch={'manual':pair,'move':{id:{'dx':80,'dy':40}for id in moved}}
 design.append({'caseId':cid,'family':c['family'],'selection':pair,'parent':parent or None,'container':container,'movedIds':sorted(moved),'priorHistoryAvailable':'routes'in a})
 for scope in ['all','selection','neighbourhood','container']:
  options={'algorithm':'tidy','mode':'pass','warmStart':True,'settle':False,'scope':scope,'maxMove':48,'selected':pair}
  if scope=='container':options['containerId']=container
  tasks.append(dict(id=f'D-target-scope-{cid}-{scope}',stage='D-warm-targeted',caseId=cid,family=c['family'],split='development',kind='warm',reference=f'data/geometry/C-development-{cid}-current.json.gz',allowPartialReference=True,history=True,options=options,patchDoc=copy.deepcopy(patch),control='scope',level=scope,tag='valid-sibling-scope-target',timeoutMs=15000))
assert len(design)==12,len(design)
# The original two growContainers settings never entered the engine because source routing timed out.
# Use the already completed layout checkpoint as an explicit warm input in this separate probe.
original=json.loads((root/'evaluation/tasks/settings-warm.json').read_text())
for t in original:
 if t['caseId']=='architecture-04'and t['control']=='growContainers':
  x=copy.deepcopy(t);x['id']='D-target-input-'+t['id'];x['stage']='D-warm-targeted';x['allowPartialReference']=True;x['tag']='checkpoint-input-supplement';tasks.append(x)
(root/'evaluation/tasks/warm-targeted.json').write_text(json.dumps(tasks,indent=2)+'\n')
(root/'data/warm-targeted-freeze.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'trials':len(tasks),'cases':design,'reason':'Fourteen primary scope probes reached the shipped explicit rejection for cross-parent selections; six primary warm tasks could not load a prior routed architecture04artifact. Preserve those terminal failures and add clearly separated valid-sibling/context probes.','scopeSelection':'Choose two siblings whose one-hop neighbours remain in the same parent, prefer unpinned top-level objects; this is a supported-input probe, not a retry that improves primary coverage.','hardReference':'Checkpoint-only inputs supply no fabricated prior routes; route churn remains unavailable.'},indent=2)+'\n')
print('warm-targeted',len(tasks))
