#!/usr/bin/env python3
"""Build the preregistered corpus without executing or ranking any layout engine.

Run from the package root: python evaluation/generate-corpus.py --baseline ../baseline
Existing source files are copied byte-for-byte. All synthetic topology uses fixed seeds.
"""
from __future__ import annotations
import argparse, collections, hashlib, json, pathlib, random, re, shutil

SEED = 20261101
BASELINE = 'f14d9b891adba75de6cc172b190017ea5a5ca091'
ENGINES = ['compound-flow', 'boundary-align', 'compound-spring', 'tidy', 'stress', 'force', 'flow', 'layered', 'tree', 'grid']
FAMILIES = [
 ('pipelines', 'Pipelines', True, 'Explain a reading sequence from input to output.'),
 ('dags', 'DAGs', True, 'Trace prerequisites and downstream dependents.'),
 ('hierarchies', 'Hierarchies', True, 'Locate ownership and inspect a subtree.'),
 ('architecture', 'Architecture', True, 'Explain boundaries and cross-system calls.'),
 ('cycles', 'Cycles', True, 'Explain a lifecycle, retry, or feedback loop.'),
 ('networks', 'Networks', False, 'Inspect relationships without imposing a main direction.'),
 ('disconnected', 'Disconnected', False, 'Pack independent components into a useful overview.'),
 ('routing', 'Routing congestion', False, 'Trace one connection through congested ports and corridors.'),
 ('containers', 'Containers', False, 'Read nesting, boundary endpoints, and title ownership.'),
 ('presentation', 'Presentation constraints', True, 'Fit an explanation to a requested presentation format.'),
 ('authored', 'Authored placement', True, 'Improve a local region while retaining authored constraints.'),
 ('recipes', 'Structural recipes', False, 'Preserve the structure encoded by a specialized recipe.'),
]

EXISTING = {
 'pipelines': ['docs/intent/diagram-quality/corpus/srcly-release/v0.draft', 'docs/intent/diagram-quality/corpus/visual-notes-ingest/v0.draft'],
 'dags': ['docs/intent/diagram-quality/corpus/draftably-ci-checks/v0.draft', 'examples/ci-cd-pipeline.draft'],
 'hierarchies': ['docs/intent/diagram-quality/corpus/srcly-node-tree/v0.draft', 'docs/intent/diagram-quality/heldout/annotations-modules/v0.draft'],
 'architecture': ['docs/intent/diagram-quality/corpus/hn-offline-architecture/v0.draft', 'docs/intent/diagram-quality/corpus/visual-notes-architecture/v0.draft'],
 'cycles': ['docs/intent/diagram-quality/corpus/decisory-session/v0.draft', 'examples/order-lifecycle.draft'],
 'networks': ['docs/intent/diagram-quality/corpus/draftably-code-layers/v0.draft', 'docs/intent/diagram-quality/corpus/pgm-cli-context/v0.draft'],
 'disconnected': [],
 'routing': ['examples/order-saga.draft', 'examples/observability-stack.draft'],
 'containers': ['examples/aws-vpc-network.draft', 'examples/kubernetes-cluster.draft'],
 'presentation': ['examples/theme-proof.draft', 'examples/hexagonal-billing.draft'],
 'authored': ['docs/intent/diagram-quality/corpus/hn-deploy/e1.draft', 'docs/intent/diagram-quality/corpus/visual-notes-mcp-call/e1.draft'],
 'recipes': ['examples/login-sequence.draft', 'examples/billing-schema.draft', 'examples/support-lanes.draft', 'examples/incident-response.draft'],
}

def q(x): return json.dumps(str(x), ensure_ascii=False)
def digest(data): return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()

class Graph:
 def __init__(self, title, seed):
  self.lines = [f'diagram {q(title)} version=1', '# New evaluation fixture; deterministic topology; no tuned starting coordinates.', 'theme drafting']
  self.rng = random.Random(seed); self.nodes=[]; self.groups=[]; self.edges=[]; self.layouts=[]; self.notes=[]
 def group(self, id, label=None, parent=None, extra=''):
  self.groups.append(id); self.lines.append(f'group {id} {q(label or id)}'+(f' in={parent}' if parent else '')+(f' {extra}' if extra else ''))
 def node(self, i, label=None, parent=None, extra=''):
  id = f'n{i}' if isinstance(i,int) else i; self.nodes.append(id)
  self.lines.append(f'node {id} {q(label or "Step "+str(i))}'+(f' in={parent}' if parent else '')+(f' {extra}' if extra else '')); return id
 def edge(self, a,b,label='',extra=''):
  a=f'n{a}' if isinstance(a,int) else a; b=f'n{b}' if isinstance(b,int) else b
  eid=f'e{len(self.edges)}'; self.edges.append(eid)
  self.lines.append(f'edge {eid} {a} -> {b}'+(f' {q(label)}' if label else '')+(f' {extra}' if extra else ''))
 def layout(self,scope='root',params='flow direction=right gap=48'):
  self.layouts.append(f'layout {scope} {params}')
 def text(self): return '\n'.join(self.lines+['']+self.layouts+['']+self.notes)+'\n'
 def chain(self,n,labels=False,start=0):
  for i in range(start,start+n-1): self.edge(i,i+1,'next' if labels and i%3==0 else '')

def synth(family,index):
 seed=SEED + FAMILIES.index(next(x for x in FAMILIES if x[0]==family))*100 + index
 g=Graph(f'{family.title()} evaluation {index:02}',seed)
 motif=''; target='free'; intended='Connections define the reading order; retain explicit source constraints.'
 if family=='pipelines':
  n={3:6,4:28,5:17,6:64}[index]
  for i in range(n): g.node(i, f'Phase {i+1}',extra='shape=diamond' if index==5 and i in [4,9] else '')
  g.chain(n,True)
  if index==5:
   for a,b in [(4,7),(4,10),(9,13)]: g.edge(a,b,'branch')
  if index==6:
   for i in range(0,n-5,9): g.edge(i,i+4,'skip check')
  g.layout(params='flow direction=right gap=48')
  motif={3:'short straight chain',4:'long chain with labeled stages',5:'branched pipeline with diamonds',6:'long folded pipeline with forward skips'}[index]
  target='wide' if index==3 else 'slide'
 elif family=='dags':
  widths={3:[1,3,3,1],4:[4,8,12,10,6],5:[2,4,7,6,4],6:[5,10,15,15,10,5]}[index]
  layers=[]; k=0
  for r,w in enumerate(widths):
   layer=[]
   for j in range(w): g.node(k,f'R{r+1} task {j+1}'); layer.append(k); k+=1
   layers.append(layer)
  for r in range(len(layers)-1):
   for j,a in enumerate(layers[r]):
    targets=sorted(set([layers[r+1][j%len(layers[r+1])],layers[r+1][(j*3+1)%len(layers[r+1])]]))
    if index==4: targets=sorted(set(targets+g.rng.sample(layers[r+1],min(3,len(layers[r+1])))))
    for b in targets: g.edge(a,b)
   for j,b in enumerate(layers[r+1]):
    if not any(re.search(rf' -> n{b}( |$)',line) for line in g.lines): g.edge(layers[r][j%len(layers[r])],b)
  if index==5: g.edge(layers[0][0],layers[-1][-1],'direct dependency')
  g.layout(params='flow direction=right gap=48'); motif={3:'two diamond fans',4:'dense layered joins',5:'irregular DAG with a long dependency',6:'large multi-stage fan-in fan-out'}[index]
 elif family=='hierarchies':
  n={3:31,4:48,5:13,6:40}[index]
  for i in range(n): g.node(i,f'Owner {i}')
  if index==3:
   for i in range(1,n): g.edge((i-1)//2,i)
  elif index==4:
   for start in range(0,n,12):
    for i in range(start+1,start+12): g.edge(start+(i-start-1)//3,i)
  elif index==5:
   for i in range(1,9): g.edge(i-1,i)
   for i in range(9,n): g.edge(2,i)
  else:
   for i in range(1,n): g.edge((i-1)//3,i)
   for a,b in [(8,23),(14,32),(18,36)]: g.edge(a,b,'advises',extra='constraint=false kind=async')
  g.layout(params='flow direction=down gap=48'); motif={3:'balanced binary ownership tree',4:'four independent ternary trees',5:'unbalanced chain with a shallow fan',6:'ternary hierarchy with cross-links'}[index]
  intended='Parent above child, except explicitly non-ranking advisory links; a forest may have several roots.'
 elif family=='architecture':
  n={3:10,4:48,5:19,6:63}[index]; m={3:3,4:6,5:4,6:7}[index]
  if index in [4,5]: g.group('system','System boundary')
  for j in range(m): g.group(f'g{j}',f'Subsystem {j+1}',parent='system' if index in [4,5] and j<m-1 else None)
  for i in range(n): g.node(i,f'Service {i+1}',parent=f'g{i%m}')
  for i in range(n-1): g.edge(i,i+1,'call' if i%7==0 else '')
  for i in range(0,n-4,3): g.edge(i,i+3,'event' if i%2 else '',extra='kind=async' if i%2 else '')
  if index==6:
   for i in range(0,35,2): g.edge(i,i+21,'boundary call')
  g.layout(); motif={3:'three groups and boundary calls',4:'nested large service fabric',5:'nested platform with an external boundary',6:'seven boundaries with many long links'}[index]
 elif family=='cycles':
  n={3:9,4:30,5:12,6:42}[index]
  for i in range(n): g.node(i,f'State {i}',extra='shape=pill')
  if index in [3,5]:
   g.chain(n)
   for a,b in ([(6,2),(8,0)] if index==3 else [(3,1),(6,5),(10,4),(11,0)]): g.edge(a,b,'retry',extra='kind=async')
   if index==5:
    g.edge(2,8,'associated',extra='directed=false');g.edge(4,5,'reverse signal')
  else:
   for start in range(0,n,6):
    g.chain(6,start=start);g.edge(start+5,start,'repeat')
    if start+6<n: g.edge(start+4,start+6,'advance')
   if index==6:
    for i in range(12,n,12):g.edge(i,0,'reset',extra='constraint=false kind=async')
  g.layout();motif={3:'single retry lifecycle',4:'five connected small cycles',5:'bidirectional and undirected lifecycle links',6:'large lifecycle with reset edges'}[index]
 elif family=='networks':
  n={3:14,4:45,5:19,6:54}[index]
  for i in range(n):g.node(i,f'Entity {i}',extra='shape=circle' if i==0 else '')
  pairs=set()
  if index==3:pairs={(0,i) for i in range(1,n)}|{(i,i+1) for i in range(1,n-1,3)}
  elif index==4:
   for s in [0,15,30]:
    pairs|={(s+i,s+(i+1)%15) for i in range(15)}
    for _ in range(22):a,b=sorted(g.rng.sample(range(s,s+15),2));pairs.add((a,b))
   pairs|={(4,20),(19,34),(38,8)}
  else:
   pairs={(i-1,i) for i in range(1,n)}
   for _ in range(n//2 if index==5 else 2*n): a,b=sorted(g.rng.sample(range(n),2));pairs.add((a,b))
  for a,b in sorted(pairs):g.edge(a,b,extra='directed=false')
  g.layout();motif={3:'hub and spoke with peer ties',4:'three dense clusters with sparse bridges',5:'sparse connected relationship mesh',6:'large nonplanar relationship mesh'}[index]
  intended='No required main direction; connected clusters should remain identifiable.'
 elif family=='disconnected':
  n={1:8,2:20,3:16,4:48,5:7,6:72}[index]
  for i in range(n):g.node(i,f'Item {i}',extra='shape=circle' if index in [3,5] and i%3==0 else '')
  if index==2:
   for s in range(0,n,5):g.chain(5,start=s)
  elif index==3:
   for i in range(1,7):g.edge(0,i)
   g.edge(10,11);g.edge(12,13)
  elif index==4:
   for s in range(0,n,8):
    for i in range(s+1,s+6):g.edge(s,i)
  elif index==5:
   g.edge(0,1);g.edge(2,3);g.edge(3,4)
  elif index==6:
   for s in range(0,n,12):
    for i in range(s+1,s+10):g.edge(s+(i-s-1)//2,i)
  g.layout();motif={1:'eight isolated objects',2:'four disconnected chains',3:'one star two pairs and isolates',4:'six sparse islands plus isolates',5:'two small components and isolates',6:'six disconnected trees with isolates'}[index]
  intended='Components have no ordering relation; do not invent a connection.'
 elif family=='routing':
  n={3:12,4:40,5:16,6:48}[index]
  for i in range(n):g.node(i,f'Endpoint {i}',extra='shape=diamond' if i in ([0,1] if index==5 else []) else '')
  if index==3:
   for i in range(2,n):g.edge(0,i,'request');g.edge(i,1,'reply')
   g.edge(0,2,'second channel');g.edge(2,0,'return');g.edge(1,0,'feedback',extra='constraint=false')
  elif index==4:
   for i in range(2,n):g.edge(i,0 if i%2 else 1)
   g.edge(0,1,'handoff');g.edge(1,0,'return')
  elif index==5:
   for i in range(2,9):g.edge(0,i,f'case {i}',extra='from=right' if i==2 else '')
   for i in range(9,n):g.edge(i,1,f'input {i}',extra='to=top' if i==9 else '')
   g.edge(0,1,'decision handoff');g.edge(3,11,'cross link');g.edge(14,4,'response')
  else:
   for i in range(0,16):g.edge(i,16+(15-i),'incoming');g.edge(16+i,32+i,'outgoing')
   for i in range(0,16,2):g.edge(i,32+i,'bypass');g.edge(32+i,i,'response',extra='constraint=false kind=async')
  g.layout();motif={3:'parallel opposing routes through two hubs',4:'two high-degree collectors',5:'diamonds forced sides and cross-links',6:'opposing fans and long narrow-corridor candidates'}[index]
 elif family=='containers':
  n={3:14,4:36,5:11,6:56}[index]
  if index in [3,6]:
   depth=5 if index==3 else 7
   for j in range(depth):g.group(f'g{j}',('Boundary '+str(j)+' with a long operational ownership title') if j%2 else f'Boundary {j}',parent=f'g{j-1}' if j else None)
   for i in range(n):g.node(i,f'Component {i}',parent=f'g{i%depth}')
   g.chain(n)
   g.edge(f'g{depth-1}',0,'group endpoint')
  elif index==4:
   g.group('outer','Main platform')
   for j in range(4):g.group(f'g{j}',f'Logical region {j}',parent='outer',extra='frame=soft' if j%2==0 else 'frame=none')
   for i in range(n):g.node(i,f'Logical member {i}',parent=f'g{i%4}')
   g.chain(n);g.edge(0,n-1,'long link')
  else:
   g.group('g0','Publisher');g.group('g1','Consumer boundary and retention rules')
   g.group('g2','Nested database',parent='g1')
   for i in range(n):g.node(i,f'Worker {i}',parent='g0' if i<4 else ('g1' if i<8 else 'g2'))
   for i in range(3):g.edge(i,i+1)
   g.edge(3,'g1','publish to boundary');g.edge('g0',4,'read boundary');g.chain(7,start=4);g.edge(0,10,'direct')
  g.layout();motif={3:'five deep boundaries with wrapped group titles',4:'soft and invisible logical groups',5:'group endpoints and nested title ownership',6:'seven levels with boundary-spanning chains'}[index]
 elif family=='presentation':
  n={3:12,4:38,5:21,6:45}[index]; target={3:'wide',4:'slide',5:'page',6:'tall'}[index]
  for i in range(n):
   label=f'Stage {i}' if i%4 else f'Stage {i}: validate a deliberately long descriptive operation name'
   g.node(i,label,extra='shape=diamond' if i%9==3 else '')
  g.chain(n,True)
  for i in range(0,n-6,6):g.edge(i,i+5,'long descriptive alternate processing route')
  for i in range(1,n,7):g.notes.append(f'size n{i} width={120+(i%3)*56} height={56+(i%2)*24}')
  g.layout(params=f'flow direction=right gap=48 fit={target}');motif=f'heterogeneous labeled flow for {target}'
 elif family=='authored':
  n={3:8,4:36,5:12,6:44}[index]
  g.group('local','Editable local region');g.group('distant','Protected distant region')
  for i in range(n):g.node(i,f'Placed item {i}',parent='local' if i<n//2 else 'distant')
  for s in [0,n//2]:g.chain(n//2,start=s)
  g.edge(n//2-1,n//2,'handoff')
  g.layout();g.layout('local','flow direction=right gap=48');g.layout('distant','flow direction=down gap=48')
  g.notes += ['pin local x=0 y=0', f'pin distant x={1400 if index in [3,5] else 4800} y=100', 'pin n0 x=0 y=0', f'pin n{n//2} x=0 y=0']
  if index in [4,6]:g.notes += [f'near n{n//2+1} n{n//2} side=below gap=48 strength=required','stay n2 x=340 y=0 weight=8']
  else:g.notes+=['near n2 n1 side=right gap=48 strength=required']
  motif={3:'two pinned regions with a required local relation',4:'manual region and long protected flow',5:'pinned hierarchy with local scope repair',6:'two large regions with pins stays and required relation'}[index]
  intended='Pins and required relative constraints are hard; the distant region is an editing protection witness.'
 elif family=='recipes':
  if index==5:
   for j in range(3):g.group(f'g{j}',f'Participant band {j}')
   for i in range(9):g.node(i,f'Actor {i}',parent=f'g{i//3}')
   for a,b,label in [(0,3,'request'),(3,6,'read'),(6,7,'lookup'),(7,6,'found'),(6,3,'response'),(3,3,'cache'),(3,0,'reply'),(1,4,'another request'),(4,8,'audit'),(8,2,'notification')]:g.edge(a,b,label)
   g.layout(params='sequence');g.notes+=['phase first "Initial lookup" e0 e1 e2 e3 e4 e5 e6','phase second "Follow-up" e7 e8 e9']
   motif='nine participants with groups phases and self-message';intended='Message declaration order is time order; preserve participant groups and phase membership.'
  else:
   g.group('overview','Overview');g.group('table','Packet header');g.group('workers','Workers');g.group('queue','Queue')
   for i in range(36):g.node(i,f'Field {i}' if i<12 else f'Unit {i}',parent='table' if i<12 else ('workers' if i<24 else 'queue'),extra='span=2' if i<12 else '')
   for i in range(12,35):g.edge(i,i+1)
   g.edge(0,12,'decode');g.edge(11,35,'checksum')
   g.layout(params='row gap=64');g.layout('overview','column gap=24');g.layout('table','cells unit=bit columns=16');g.layout('workers','row gap=24');g.layout('queue','column gap=24')
   motif='mixed row column and bit-cell recipes';intended='Cell widths encode bits; retain recipe scopes, declared cell order, and worker/queue grouping.'
 else:raise ValueError(family)
 return g.text(), {'seed':seed,'motif':motif,'targetFormat':target,'intendedReadingOrder':intended}

def extract(text):
 nodes=re.findall(r'^node\s+([\w.-]+)\s+',text,re.M);groups=re.findall(r'^group\s+([\w.-]+)\s+',text,re.M)
 edges=re.findall(r'^edge\s+([\w.-]+)\s+([\w.-]+)\s+->\s+([\w.-]+)',text,re.M)
 parents={m.group(1):(re.search(r'\bin=([\w.-]+)',m.group(2)).group(1) if re.search(r'\bin=([\w.-]+)',m.group(2)) else 'root') for m in re.finditer(r'^(?:node|group)\s+([\w.-]+)\s+(.*)$',text,re.M)}
 pins=[{'id':m.group(1),'x':float(m.group(2)),'y':float(m.group(3)),'coordinates':'parent-content-local'} for m in re.finditer(r'^pin\s+(\S+)\s+x=(-?[\d.]+)\s+y=(-?[\d.]+)',text,re.M)]
 layouts=re.findall(r'^layout\s+(\S+)\s+(.+)$',text,re.M)
 return nodes,groups,edges,parents,pins,layouts

def write_edits(root,case,text):
 nodes,groups,edges,parents,pins,layouts=extract(text);first=nodes[0];last=nodes[-1]
 sequence=any(s=='root' and l.startswith('sequence') for s,l in layouts)
 lanes=any(s=='root' and l.startswith('lanes') for s,l in layouts)
 cells={s for s,l in layouts if l.startswith('cells')}
 stem=root/'edits'/case['id'];stem.mkdir(parents=True,exist_ok=True)
 edits=[]
 # Each variant starts at base. This avoids confusing a preceding edit with a new policy's behavior.
 if edges:
  eid=edges[0][0]
  relabel=re.sub(rf'^(edge\s+{re.escape(eid)}\s+\S+\s+->\s+\S+)(?:\s+"(?:[^"\\]|\\.)*")?',lambda m:m.group(1)+' "edited connection label with longer explanatory context"',text,count=1,flags=re.M)
  relabel_targets=[eid]
 else:
  relabel=re.sub(rf'^(node\s+{re.escape(first)}\s+)"(?:[^"\\]|\\.)*"',lambda m:m.group(1)+'"A longer descriptive title after editing"',text,count=1,flags=re.M);relabel_targets=[first]
 edits.append(('relabel',relabel,{'kind':'relabel-or-resize','targets':relabel_targets,'requestedGlobalMovement':False,'expectations':['All original IDs retained.','No topology change.','Relative order should remain except where text needs local room.']}))
 parent=parents[last]
 growth=text+f'\nnode added_node "New local detail"'+(f' in={parent}' if parent!='root' else '')+f'\nedge added_edge {last} -> added_node "added follow-up"\n'
 edits.append(('add',growth,{'kind':'add-node-edge','targets':[last,'added_node','added_edge'],'requestedGlobalMovement':False,'expectations':['Original IDs retained.','Exactly one new node and one new edge.','Authored pins retained.']}))
 if sequence:
  scope=parents[first]
  members=[n for n in nodes if parents[n]==scope]
  local=text+f'\norder {scope} '+ ' '.join(members[1:3]+members[:1]+members[3:])+'\n';localtargets=members[:3];action='participant-order'
 elif lanes:
  local=text+'\norder root '+' '.join(groups[1:2]+groups[:1]+groups[2:])+'\n';localtargets=groups[:2];action='lane-order'
 elif cells and parents[first] in cells:
  ids=[n for n in nodes if parents[n]==parents[first]]
  local=text+f'\norder {parents[first]} '+' '.join(ids[1:2]+ids[:1]+ids[2:])+'\n';localtargets=ids[:2];action='cell-order'
 else:
  siblings=[n for n in nodes if parents[n]==parents[first] and n not in {p['id'] for p in pins}]
  a,b=(siblings[:2] if len(siblings)>=2 else nodes[-2:])
  # nudge is a local-region move; it does not invent or move a pinned object.
  local=text+f'\nnudge {b} dx=0 dy=56\n';localtargets=[b];action='local-nudge'
 edits.append(('local',local,{'kind':'regroup-or-local-move','operation':action,'targets':localtargets,'scope':parents.get(localtargets[0],'root'),'requestedGlobalMovement':False,'expectations':['Pins unchanged.','Recipe semantics unchanged.','Distant movement measured separately, not assumed zero.']}))
 if sequence or lanes or cells:
  # Removing an edge is meaningful for message/cell/role semantics; changing sequence direction is not.
  target=edges[-1][0] if edges else None
  changed=re.sub(rf'^edge\s+{re.escape(target)}\s+.*\n?', '',text,flags=re.M) if target else text
  if sequence and target:
   changed=re.sub(rf'(^phase\s+.*)\b{re.escape(target)}\b',lambda m:m.group(1),changed,flags=re.M)
  meta={'kind':'direction-fit-or-remove','operation':'remove-edge','targets':[target] if target else [],'requestedGlobalMovement':False,'expectations':['Exactly the named edge removed; all nodes retained.','Remaining recipe semantics retained.']}
 else:
  rootline=next((l for s,l in layouts if s=='root'),'flow')
  newdir='right' if 'direction=down' in rootline else 'down'
  newroot=re.sub(r'\bdirection=\w+','direction='+newdir,rootline) if 'direction=' in rootline else rootline+' direction='+newdir
  changed=re.sub(r'^layout root .*$',f'layout root {newroot}',text,flags=re.M) if any(s=='root' for s,l in layouts) else text+f'\nlayout root flow direction={newdir}\n'
  meta={'kind':'direction-fit-or-remove','operation':'change-direction','direction':newdir,'targets':['root'],'requestedGlobalMovement':True,'expectations':['Requested direction is the task, so global movement is not a stability defect.','Pins and required authored relations retain priority.']}
 edits.append(('direction_or_remove',changed,meta))
 color=re.sub(rf'^(node\s+{re.escape(first)}\s+.*)$',lambda m:re.sub(r'\bcolor=\S+','color=teal',m.group(1)) if 'color=' in m.group(1) else m.group(1)+' color=teal',text,count=1,flags=re.M)
 edits.append(('color_control',color,{'kind':'color-only-negative-control','targets':[first],'requestedGlobalMovement':False,'expectations':['Geometry and routes exactly unchanged.']}))
 result=[]
 for name,source,meta in edits:
  p=stem/(name+'.draft');p.write_text(source);meta.update({'id':name,'path':str(p.relative_to(root.parent)),'from':'base','sha256':digest(source),'hardPins':pins});result.append(meta)
 case['edits']=result;case['editPaths']={x['id']:x['path'] for x in result}
 case['warmState']={'selectedScope':'local' if 'local' in groups else ('root' if not groups else groups[0]),'manualIDs':[p['id'] for p in pins]+([nodes[1]] if len(nodes)>1 else []),'collapsedGroup': next((g for g in groups if g!='local'),None),'collapsedIsWarmOnly':True,'priorRoutes':'Use the same baseline route state for each candidate; never chain candidate histories.'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--baseline',default='../baseline');p.add_argument('--out',default='corpus');a=p.parse_args()
 base=pathlib.Path(a.baseline).resolve();out=pathlib.Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
 cases=[];source_reads=[]
 for family,title,common,task in FAMILIES:
  for index in range(1,7):
   id=f'{family}-{index:02}';split='development' if index<=4 else 'heldout';rel=pathlib.Path('bases')/family/(id+'.draft');dest=out/rel;dest.parent.mkdir(parents=True,exist_ok=True)
   sources=EXISTING[family]
   if index<=len(sources):
    original=sources[index-1];raw=(base/original).read_bytes();text=raw.decode();source_reads.append(original);dest.write_bytes(raw)
    orig=out/'originals'/original;orig.parent.mkdir(parents=True,exist_ok=True);orig.write_bytes(raw)
    provenance={'kind':'existing-exact','baselinePath':original,'historicalHeldout':'/heldout/' in original,'sha256':digest(raw),'copy':'byte-for-byte','originalCopy':str(orig.relative_to(out.parent))}
    spec={'seed':None,'motif':str(pathlib.Path(original).parent.name if pathlib.Path(original).name=='v0.draft' else pathlib.Path(original).stem),'targetFormat':'free','intendedReadingOrder':'Retain original declared reading intent, except historical soft #expect comments are reviewed as intent evidence rather than hard constraints.'}
   else:
    text,spec=synth(family,index);dest.write_text(text)
    provenance={'kind':'synthetic-new','baselinePath':None,'historicalHeldout':False,'sha256':digest(text),'generator':'evaluation/generate-corpus.py','seed':spec['seed']}
   nodes,groups,edges,parents,pins,layouts=extract(text)
   semantic_root=next((l.split()[0] for s,l in layouts if s=='root' and l.split()[0] in ['sequence','lanes']),None)
   protected_recipes=[{'scope':s,'recipe':l.split()[0]} for s,l in layouts if l.split()[0] in ['sequence','lanes','cells']]
   recipe_kind=semantic_root or ('cells' if any(x['recipe']=='cells' for x in protected_recipes) else ('mixed' if family=='recipes' else 'ordinary'))
   applicable=[] if semantic_root else ENGINES.copy()
   case={'id':id,'family':family,'familyLabel':title,'split':split,'path':str(dest.relative_to(out.parent)),'source':str(dest.relative_to(out.parent)),'provenance':provenance,'common':common,'classification':'common-job' if common else 'niche-job','motif':spec['motif'],'nodeCount':len(nodes),'groupCount':len(groups),'edgeCount':len(edges),'nodeIDs':nodes,'groupIDs':groups,'sizeBand':'4-12' if len(nodes)<=12 else ('13-35' if len(nodes)<=35 else '36-100'),'engines':applicable,'directions':['RIGHT','DOWN'] if applicable else (['RIGHT'] if semantic_root=='lanes' else []),'recipe':recipe_kind,'protectedRecipes':protected_recipes,'authoredPins':pins,'sourceExpectations':re.findall(r'^# expect (.*)$',text,re.M),'editPaths':{},'edits':[],
    'applicability':{'rebuildEngines':applicable,'reason':'Sequence and lanes encode time/role placement; replacing the root loses the task and is not an algorithm trial.' if semantic_root else 'Apply all ten engines at root; preserve nested recipe lines and hard authored refinements.','coldInitialization':'Shipped cold compile/rebuild; no synthetic preferred geometry. Pins are intentional only in authored/presentation witnesses.','recipeBaselines':['as-authored'] if semantic_root else ['as-authored','no-root-layout','flow','row','column']},
    'job':{'task':task,'intendedReadingOrder':spec['intendedReadingOrder'],'constraints':['Preserve all original nodes, edges, endpoint IDs and group membership.','Honor explicit sides, pins, required relations, and specialized recipe semantics.'],'acceptableAmbiguity':'Crossings and symmetric sibling tie orders are acceptable when no authored order or structural semantics require otherwise; assess visual tracing cost.','targetFormat':spec['targetFormat'],'commonNicheAssumption':'Declared benchmark weighting label, not a population-frequency estimate.','expectedInvariants':{'nodeIDs':nodes,'groupIDs':groups,'edgeIDs':[e[0] for e in edges],'authoredPins':pins,'specialistRecipes':protected_recipes},'passCriteria':['Finite complete geometry; no new hard object/routing/constraint failures.','Task semantics retained.','Compare soft quality within predeclared practical-equivalence bands; no tuning from heldout.']}}
   if index in [3,5]:write_edits(out,case,text)
   cases.append(case)
 # Sanity fixtures and optional scale tests are outside all quality means.
 extras=[]
 for id,text,kind in [('empty','diagram "Empty sanity" version=1\n','sanity'),('single','diagram "Single sanity" version=1\nnode a "One object"\n','sanity')]:
  dest=out/'extras'/(id+'.draft');dest.parent.mkdir(exist_ok=True);dest.write_text(text);extras.append({'id':id,'kind':kind,'path':str(dest.relative_to(out.parent)),'sha256':digest(text)})
 for n,kind in [(180,'sparse-network'),(220,'layered-dag')]:
  g=Graph(f'Optional scale {n} {kind}',SEED+n)
  for i in range(n):g.node(i,f'Item {i}')
  if kind=='sparse-network':
   g.chain(n)
   for i in range(0,n-15,3):g.edge(i,i+13,extra='directed=false')
  else:
   for i in range(n-20):g.edge(i,i+20)
   for i in range(n-21):
    if i%3==0:g.edge(i,i+21)
  g.layout();text=g.text();dest=out/'extras'/(kind+'.draft');dest.write_text(text);extras.append({'id':kind,'kind':'optional-scale','nodeCount':n,'path':str(dest.relative_to(out.parent)),'sha256':digest(text),'qualityWeight':0})
 # Preserve every historical corpus sibling and every example separately; none becomes a fresh holdout.
 for source_dir in ['docs/intent/diagram-quality/corpus','docs/intent/diagram-quality/heldout','examples','src/samples']:
  dest=out/'originals'/source_dir
  shutil.copytree(base/source_dir,dest,dirs_exist_ok=True)
 original_index=[]
 for f in sorted((out/'originals').rglob('*')):
  if not f.is_file():continue
  original_index.append({'baselinePath':str(f.relative_to(out/'originals')),'path':str(f.relative_to(out.parent)),'sha256':digest(f.read_bytes()),'usedAsBase':[c['id'] for c in cases if c['provenance'].get('baselinePath')==str(f.relative_to(out/'originals'))],'historicalHeldout':'/heldout/' in str(f)})
 manifest={'schemaVersion':1,'baseline':BASELINE,'seed':SEED,'freezePhase':'Before candidate geometry or winner inspection; compilation validation may fix syntax only.','splitRule':'Within family 01–04 development, 05–06 newly generated heldout. All edits/variants inherit their base split.','familyLabels':[{'id':f,'label':t,'common':c,'task':j} for f,t,c,j in FAMILIES],'families':[f for f,_,_,_ in FAMILIES],'caseCount':72,'developmentCount':48,'heldoutCount':24,'existingCount':24,'syntheticCount':48,'independence':'No simple renames counted as separate bases. Distinct topology/containment/task variation; correlated edited variants never independent units.','historicalExpectations':'Original #expect statements are preserved as evidence. Known historical false alarms in NEXT.md must not become hard gates.','cases':cases,'extras':extras,'counts':{'sizeBands':dict(collections.Counter(c['sizeBand'] for c in cases)),'edits':sum(len(c['edits']) for c in cases),'editBases':sum(bool(c['edits']) for c in cases),'common':sum(c['common'] for c in cases),'niche':sum(not c['common'] for c in cases)}}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
 (out/'originals-index.json').write_text(json.dumps(original_index,indent=2,ensure_ascii=False)+'\n')
 (out/'source-read-manifest.json').write_text(json.dumps({'selectedOriginalsRead':source_reads,'guidanceRead':['AGENTS.md','docs/DSL.md','docs/intent/diagram-quality/FEEL.md','docs/intent/diagram-quality/RUBRIC.md','docs/intent/diagram-quality/CORPUS.md','docs/intent/diagram-quality/NEXT.md'],'implementationRead':['src/dsl/syntax.ts (tokenizer/model/parameters)','src/dsl/compile.ts (compile entry/cold rebuild/fit)','src/dsl/project.ts (projection contract)'],'testsRead':['tests/routing-ports.test.ts','tests/fold-hold.test.ts','tests/group-fit.test.ts'],'allOriginalsPreserved':len(original_index)},indent=2)+'\n')
 (out/'freeze.json').write_text(json.dumps({'baseline':BASELINE,'manifestSha256':digest((out/'manifest.json').read_bytes()),'generatorSha256':digest(pathlib.Path(__file__).read_bytes()),'stage':'pre-outcome','note':'Record the final validation timestamp externally; no wall-clock randomness enters generation.'},indent=2)+'\n')
 print(json.dumps({'cases':len(cases),'originals':len(original_index),'counts':manifest['counts'],'manifestSha256':digest((out/'manifest.json').read_bytes())},indent=2))

if __name__=='__main__':main()
