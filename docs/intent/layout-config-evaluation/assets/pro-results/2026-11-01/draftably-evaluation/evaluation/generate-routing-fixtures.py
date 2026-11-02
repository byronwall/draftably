#!/usr/bin/env python3
"""Create 24 fixed-position router witnesses, without executing geometry.

All positions are authored pins. The evaluation compiles each once, freezes the
production geometry, and routes the same frozen positions for all settings.
"""
import pathlib,json,hashlib,re,datetime

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'corpus/routing'
OUT.mkdir(parents=True,exist_ok=True)

def q(s):return json.dumps(s)
def sha(s):return hashlib.sha256(s.encode()).hexdigest()

class F:
 def __init__(self,id,title,family,tags,provenance):
  self.id=f'route-{id:02}';self.title=title;self.family=family;self.tags=tags;self.provenance=provenance
  self.lines=[f'diagram {q(title)} version=1','theme drafting','# Fixed geometry router witness. Pins are local to parent content.']
  self.nodes=[];self.groups=[];self.edges=[];self.constraints=[]
 def node(self,id,x,y,w=160,h=56,parent=None,shape='box',label=None):
  self.lines.append(f'node {id} {q(label or id)}'+(f' in={parent}' if parent else '')+(f' shape={shape}' if shape!='box' else ''))
  self.constraints+=[f'size {id} width={w} height={h}',f'pin {id} x={x} y={y}']
  self.nodes.append({'id':id,'x':x,'y':y,'w':w,'h':h,'parent':parent or 'root','coordinates':'parent-content-local','shape':shape})
 def group(self,id,label,x,y,parent=None,minw=None,minh=None):
  self.lines.append(f'group {id} {q(label)}'+(f' in={parent}' if parent else ''))
  self.constraints.append(f'pin {id} x={x} y={y}')
  self.constraints.append(f'layout {id} column gap=24'+(f' min-width={minw}' if minw else '')+(f' min-height={minh}' if minh else ''))
  self.groups.append({'id':id,'parent':parent or 'root','x':x,'y':y,'coordinates':'parent-content-local'})
 def edge(self,a,b,label='',extra='',id=None):
  id=id or f'e{len(self.edges)}';self.lines.append(f'edge {id} {a} -> {b}'+(f' {q(label)}' if label else '')+(f' {extra}' if extra else ''));self.edges.append({'id':id,'from':a,'to':b,'label':label});return id
 def text(self):return '\n'.join(self.lines+['layout root flow direction=auto fold=never']+self.constraints)+'\n'

fixtures=[]
def make(i,title,family,tags,provenance=[]):
 f=F(i,title,family,tags,provenance);fixtures.append(f);return f

f=make(1,'Tight stacked neighbours','pipelines',['tight-gap','standoff','clearance'],['tests/routing-clearance.test.ts: stacked neighbours'])
for id,x,y in [('a',0,0),('b',0,76),('c',360,0),('d',360,200)]:f.node(id,x,y)
f.edge('a','b');f.edge('c','d')

f=make(2,'Offset neighbour without a hook','pipelines',['tight-gap','offset','hooks'],['tests/routing-clearance.test.ts: offset neighbour'])
for id,x,y in [('a',0,0),('b',120,76),('c',460,0),('d',460,230)]:f.node(id,x,y)
f.edge('a','b');f.edge('b','d');f.edge('a','c')

f=make(3,'One central obstacle','routing',['obstacle','standoff','detour'],['tests/routing-clearance.test.ts: keeps runs past a box at the standoff'])
for args in [('a',0,80,100,40),('b',400,80,100,40),('blocker',200,40,100,120),('c',0,300,100,40),('d',400,300,100,40)]:f.node(*args)
f.edge('a','b');f.edge('c','d');f.edge('a','c')

f=make(4,'Two obstacles form a narrow passage','routing',['corridor','clearance','standoff','parallel'])
for args in [('a',0,100,100,48),('b',620,100,100,48),('top',240,0,200,76),('bottom',240,164,200,76),('c',0,280,100,48),('d',620,280,100,48)]:f.node(*args)
f.edge('a','b');f.edge('c','d');f.edge('a','d');f.edge('c','b')

f=make(5,'Three-way fan-out','dags',['fanout','port-gap','facing'],['tests/routing-fans.test.ts: fan on facing side'])
for id,x,y in [('hub',0,120),('a',320,0),('b',320,120),('c',320,240)]:f.node(id,x,y,160,80)
for id in ['a','b','c']:f.edge('hub',id)

f=make(6,'Five-way fan-in','dags',['fanin','port-gap','facing'],['tests/routing-fans.test.ts: fan-in'])
for i in range(5):f.node(f's{i}',0,i*100,128,56)
f.node('target',360,180,180,96)
for i in range(5):f.edge(f's{i}','target')

f=make(7,'Diamond with three outgoing branches','cycles',['diamond','three-exits','port-choice'],['docs/intent/diagram-quality/NEXT.md: diamonds with three exits'])
f.node('decision',200,160,112,112,shape='diamond',label='Ready?')
for id,x,y in [('a',500,0),('b',500,150),('c',500,310),('start',0,160)]:f.node(id,x,y)
f.edge('decision','a','yes');f.edge('decision','b','no');f.edge('decision','c','retry later');f.edge('start','decision')

f=make(8,'Diamond with four exits and a return','cycles',['diamond','four-exits','return'])
f.node('decision',260,200,112,112,shape='diamond',label='Outcome?')
for id,x,y in [('a',600,30),('b',600,180),('c',600,330),('d',260,440),('start',0,210)]:f.node(id,x,y,120,56)
for id,label in [('a','ok'),('b','retry'),('c','failed'),('d','unknown')]:f.edge('decision',id,label)
f.edge('start','decision');f.edge('c','start','reset',extra='constraint=false')

f=make(9,'Parallel and opposing connections','networks',['parallel','opposing','shared','bends'])
for id,x,y in [('a',0,100),('b',420,100),('c',0,350),('d',420,350)]:f.node(id,x,y,180,80)
f.edge('a','b','request');f.edge('a','b','audit');f.edge('b','a','reply');f.edge('c','d','request');f.edge('d','c','reply');f.edge('a','d')

f=make(10,'Fixed K3,3 connection tracing','networks',['nonplanar','crossing','shared','detour'])
for i in range(3):f.node(f'a{i}',0,140*i,120,60);f.node(f'b{i}',500,140*i,120,60)
for i in range(3):
 for j in range(3):f.edge(f'a{i}',f'b{j}')

f=make(11,'Avoidable crossing under fixed order','dags',['crossing','bend','detour'],['docs/DSL.md: Fixing line crossings example'])
for id,x,y in [('web',0,0),('mobile',0,180),('accounts',420,0),('orders',420,180)]:f.node(id,x,y)
f.edge('web','orders','orders');f.edge('mobile','accounts','accounts')

f=make(12,'Group title crossing and boundary exit','architecture',['group-title','border','forced-sides'],['tests/routing-group-borders.test.ts: crosses band beside title'])
f.group('g','Services',0,0,minw=520,minh=240)
f.node('a',0,20,parent='g');f.node('b',280,20,parent='g');f.node('c',0,450);f.node('d',600,220)
f.edge('b','a','return inside group');f.edge('a','c');f.edge('b','d')

f=make(13,'Route beside a group border slot','containers',['group-border','narrow-slot','standoff'],['tests/routing-group-borders.test.ts: 30px slot'])
for id,x,y in [('a',0,0),('b',0,400),('blocker',0,180)]:f.node(id,x,y)
f.group('g','Adjacent group',190,140,minw=250,minh=160);f.node('inside',0,0,parent='g')
f.edge('a','b');f.edge('inside','b')

f=make(14,'Nested boundaries and external callers','containers',['nested-groups','title-band','boundary-links'])
f.group('outer','Production region',200,40,minw=620,minh=500);f.group('inner','Application tier',0,0,parent='outer',minw=540,minh=240)
f.node('api',0,10,parent='inner');f.node('worker',280,10,parent='inner');f.node('db',160,330,parent='outer');f.node('client',0,650);f.node('ops',950,60);f.node('backup',950,650)
f.edge('client','api');f.edge('ops','worker');f.edge('api','db');f.edge('worker','backup');f.edge('db','backup','backup')

f=make(15,'Long edge labels in contested gaps','presentation',['edge-label','ownership','collision','long-label'],['docs/intent/diagram-quality/NEXT.md: labels in gaps with no room'])
for id,x,y in [('a',0,80),('b',260,80),('c',520,80),('d',260,300),('e',520,300)]:f.node(id,x,y,160,56)
f.edge('a','b','loaded before render');f.edge('b','c','persist source ID and timestamp');f.edge('d','e','cancel pending');f.edge('a','e','retry with context');f.edge('d','b','refresh')

f=make(16,'Return and forward skip','pipelines',['return','skip','labels','lane'],['tests/return-lanes.test.ts: skip above and return below'])
for i in range(5):f.node(f'n{i}',i*240,100)
for i in range(4):f.edge(f'n{i}',f'n{i+1}','next')
f.edge('n4','n0','retry',extra='constraint=false');f.edge('n0','n3','skip optional')

f=make(17,'Self-message and nearby obstacle','cycles',['self-loop','obstacle','corner-radius'])
for id,x,y in [('a',0,120),('b',300,120),('blocker',300,0),('d',600,120)]:f.node(id,x,y,160,80)
f.edge('a','b');f.edge('b','b','retry locally');f.edge('b','d');f.edge('d','a','reset',extra='constraint=false')

f=make(18,'Shared corridor with opposing lanes','routing',['shared-path','parallel','passes','corridor'])
for i in range(4):f.node(f'a{i}',0,i*110,120,56);f.node(f'b{i}',620,i*110,120,56)
for i in range(4):f.edge(f'a{i}',f'b{3-i}',f'channel {i}');f.edge(f'b{i}',f'a{(i+1)%4}',extra='constraint=false')

f=make(19,'Sixty-pixel passage between tall obstacles','authored',['tight-corridor','clearance','standoff'])
for args in [('a',0,220,100,56),('b',760,220,100,56),('left',250,80,160,320),('right',470,80,160,320),('c',370,0,160,56),('d',370,440,160,56)]:f.node(*args)
f.edge('a','b');f.edge('c','d');f.edge('a','d')

f=make(20,'Authored top exit around own source','authored',['explicit-ports','own-standoff','hooks'],['tests/routing-own-standoff.test.ts: state top to model left'])
for args in [('state',216,131,164,63),('model',644,152,164,63),('dsl',429,183,164,63),('other',210,420,164,63)]:f.node(*args)
f.edge('state','model','calls',extra='from=top to=left');f.edge('other','dsl');f.edge('dsl','model')

f=make(21,'Fan trunks with a small blocking box','routing',['jog','fan-trunk','parallel','labels'],['tests/routing-order.test.ts: fan turn line with blocker'])
for args in [('source',0,150,160,56),('a',300,0,160,56),('b',260,300,160,56),('blocker',200,240,40,40),('c',600,150,160,56),('d',600,370,160,56)]:f.node(*args)
f.edge('source','a','read');f.edge('source','b','write');f.edge('a','c');f.edge('b','d');f.edge('source','d','extra branch')

f=make(22,'Balanced fan-in and fan-out','dags',['fanin','fanout','port-stability','port-gap'])
for i in range(3):f.node(f'a{i}',0,i*150,140,56);f.node(f'b{i}',620,i*150,140,56)
f.node('hub1',250,150,160,80);f.node('hub2',900,150,160,80)
for i in range(3):f.edge(f'a{i}','hub1');f.edge('hub1',f'b{i}');f.edge(f'b{i}','hub2')

f=make(23,'Eleven branches at one hub','networks',['high-degree','fanout','port-gap','fanout-penalty'])
f.node('hub',0,400,180,120)
for i in range(11):f.node(f'n{i}',420+(i%2)*260,i*90,140,56);f.edge('hub',f'n{i}',f'branch {i}')

f=make(24,'Group endpoints beside member endpoints','architecture',['group-endpoint','title','border','parallel'])
f.group('g1','Publisher boundary',0,100,minw=320,minh=240);f.group('g2','Consumer boundary',650,100,minw=320,minh=240)
f.node('a',0,0,parent='g1');f.node('b',0,120,parent='g1');f.node('c',0,0,parent='g2');f.node('d',0,120,parent='g2');f.node('external',400,500,160,56)
f.edge('g1','g2','publish');f.edge('a','c','member route');f.edge('external','g2','connect boundary');f.edge('g1','external','notify');f.edge('b','d')

records=[]
for f in fixtures:
 source=f.text();p=OUT/(f.id+'.draft');p.write_text(source)
 automatic=re.sub(r'\s(?:from|to)=(?:auto|left|right|top|bottom)\b','',source)
 ap=OUT/(f.id+'-automatic.draft');ap.write_text(automatic)
 e=f.edges[0]; by={n['id']:n for n in f.nodes}
 # Side proposals are derived only from declared fixture positions, never routed winners.
 if e['from'] in by and e['to'] in by and by[e['from']]['parent']==by[e['to']]['parent']:
  a,b=by[e['from']],by[e['to']];dx=(b['x']+b['w']/2)-(a['x']+a['w']/2);dy=(b['y']+b['h']/2)-(a['y']+a['h']/2)
  side=('right','left') if abs(dx)>=abs(dy) and dx>=0 else (('left','right') if abs(dx)>=abs(dy) else (('bottom','top') if dy>=0 else ('top','bottom')))
 else:side=('right','left')
 if f.id=='route-12':side=('top','top')
 if f.id=='route-20':side=('top','left')
 forced=re.sub(rf'^(edge {re.escape(e["id"])} .*)$',lambda m:m.group(1)+f' from={side[0]} to={side[1]}',automatic,flags=re.M)
 fp=OUT/(f.id+'-explicit.draft');fp.write_text(forced)
 # Shift a target endpoint by 24px without moving any obstacle; this is an intentional route-only
 # state edit after compile, so the source pin is not reevaluated for this history probe.
 target=e['to'] if e['to'] in by else f.nodes[-1]['id']
 small={'id':target,'dx':0,'dy':24,'operation':'route-only position edit after freezing; do not recompile the original pin','reason':'One small shared endpoint shift; each candidate receives identical prior baseline routes.'}
 records.append({'id':f.id,'title':f.title,'family':f.family,'split':'development','path':str(p.relative_to(ROOT)),'source':str(p.relative_to(ROOT)),'sha256':sha(source),'nodeCount':len(f.nodes),'edgeCount':len(f.edges),'groupCount':len(f.groups),'tags':f.tags,'provenance':{'kind':'synthetic-fixed-geometry','motifSources':f.provenance,'note':'Motifs adapted with additional nodes; not exact copied regression tests and not independent main corpus cases.'},'declaredNodes':f.nodes,'declaredGroups':f.groups,'automaticPath':str(ap.relative_to(ROOT)),'smallEdit':small,'explicitVariants':[{'id':'authored-sides','edgeId':e['id'],'from':side[0],'to':side[1],'fromSide':side[0],'toSide':side[1],'path':str(fp.relative_to(ROOT)),'reason':'Declared before candidate inspection from facing geometry or the source regression intent.'}],'expectedInvariants':['All endpoint identities and authored sides retained.','Node/group positions fixed across setting candidates.','No non-finite coordinates or lost routes.','Record blocked routes as failures; retain in denominator.'],'positionContract':'Compile once through production source path; all parameter candidates reuse that exact resulting document. Source pins are parent-local; do not treat them as world coordinates.'})
manifest={'schemaVersion':1,'baseline':'f14d9b891adba75de6cc172b190017ea5a5ca091','freezePhase':'pre-outcome','fixtureCount':24,'geometryExecutionsByGenerator':0,'allDevelopment':True,'explicitComparisonCount':24,'fixtures':records,'cases':records}
text=json.dumps(manifest,indent=2)+'\n';(OUT/'manifest.json').write_text(text)
(OUT/'freeze.json').write_text(json.dumps({'manifestSha256':sha(text),'generatorSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':'before routing trials or visual candidate inspection'},indent=2)+'\n')
print(json.dumps({'fixtures':len(records),'sources':len(records)*3,'manifestSha256':sha(text)}))
