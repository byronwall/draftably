import { controllers, registerDispose, listen, later, every, clearTimer } from './controller-context';
import { SAMPLE_INFO, LAYOUT_SAMPLES } from './sample-catalog.js';
import { clone, clamp, finite, uid, DEFAULT_SETTINGS, baseDoc, migrateLegacy, normalize } from './document-model.js';
import { ICONS, PALETTE, SHAPES, TYPE_STYLE } from './editor-static.js';
import { LayoutLab } from './engines/layout-engine.js';
import { RouteLab } from './engines/routing-engine.js';
import { ExplorerLab } from './engines/explorer-engine.js';
import { SculptLab } from './engines/sculpt-engine.js';



'use strict';
// Diagram Studio 7.0. Focused, single-document diagram editor.
// Repository inspiration: GraphNode/GraphEdge/GraphLayout; semanticDocumentSignature;
// autoLayoutElk + local routing; graph-camera.test.ts. This is an independent implementation.
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


const STORAGE='diagram-studio-v5';
const UI_STORAGE='diagram-studio-v5-ui';
const icon=(name,cls='ui-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.cube}</svg>`;
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
function colorTokens(key){const c=PALETTE[key]||PALETTE.slate;return D?.theme==='dark'?{fill:c.dark[0],stroke:c.dark[1],ink:c.dark[2]}:c;}

function makeSample(kind='process'){if(LAYOUT_SAMPLES[kind])return normalize(clone(LAYOUT_SAMPLES[kind]));
 const d=baseDoc(({process:'Approval flow',architecture:'App & services',platform:'Dependencies',dataflow:'Data pipeline',blank:'Untitled diagram'})[kind]||'Untitled diagram');
 const n=(id,title,x,y,style={},parentId)=>{d.graph.nodes.push({id,title,...(parentId?{parentId}:{})});d.layout.nodes[id]={x,y,w:164,h:56};d.styles[id]={shape:'box',color:'blue',icon:'',...style};};
 const g=(id,title,x,y,w,h,color='slate',parentId)=>{d.graph.groups.push({id,title,...(parentId?{parentId}:{})});d.layout.nodes[id]={x,y,w,h};d.styles[id]={shape:'box',color,icon:''};d.layout.containers[id]={direction:'inherit',padding:24,manualSize:false};};
 const e=(id,from,to,label='')=>d.graph.edges.push({id,from,to,label,directed:true,emphasis:false});
 if(kind==='process'){
  n('request','Request',40,104,{shape:'pill',color:'slate'});g('review','Review',246,32,438,260,'violet');n('check','Check details',270,104,{},'review');n('decision','Ready?',478,76,{shape:'diamond',color:'amber'},'review');d.layout.nodes.decision.w=134;d.layout.nodes.decision.h=104;n('revise','Request changes',462,212,{color:'rose'},'review');n('publish','Publish',734,104,{color:'mint'});n('complete','Done',734,212,{shape:'pill',color:'mint'});
  e('a','request','check');e('b','check','decision');e('yes','decision','publish','Yes');e('no','decision','revise','Not yet');e('retry','revise','check','Updated');e('finish','publish','complete');
 }else if(kind==='architecture'){
  n('browser','Web app',40,120,{icon:'browser',color:'slate'});g('backend','Services',250,36,480,320,'violet');n('api','API',282,126,{icon:'server'},'backend');n('auth','Auth',510,96,{icon:'key',color:'amber'},'backend');n('worker','Worker',510,238,{icon:'bolt'},'backend');g('store','Storage',784,36,230,320,'blue');n('database','Database',817,114,{icon:'database'},'store');n('files','Files',817,250,{icon:'folder'},'store');e('request','browser','api','HTTPS');e('identity','api','auth');e('dispatch','api','worker');e('db','auth','database');e('write','worker','database');e('upload','worker','files');
 }else if(kind==='platform'){
  n('app','Application',50,100,{icon:'browser',color:'violet'});n('sdk','SDK',258,100,{icon:'code'});n('gateway','Gateway',466,100,{icon:'server'});n('compute','Compute',674,45,{icon:'bolt',color:'mint'});n('storage','Storage',674,163,{icon:'database'});n('metrics','Metrics',466,268,{icon:'chart',color:'slate'});e('link-sdk','app','sdk');e('link-gateway','sdk','gateway');e('link-compute','gateway','compute');e('link-storage','gateway','storage');e('link-metrics','gateway','metrics');
 }else if(kind==='dataflow'){
  const titles=['Read input','Validate','Normalize','Transform','Store','Query','Render','Export'];titles.forEach((t,i)=>n('step'+i,t,40+(i%4)*212,60+Math.floor(i/4)*156,{color:i===0?'amber':i===7?'mint':'blue'}));for(let i=0;i<7;i++)e('edge'+i,'step'+i,'step'+(i+1));
 }
 return normalize(d);
}
let D=makeSample('automatic-ports');
let S={selected:new Set(),tool:'select',connectFrom:null,pointer:null,drag:null,space:false,clipboard:null,undo:[],redo:[],revision:0,layoutBusy:false,engine:'Local tidy',elk:null,elkReady:false,lastRoutes:[],lastGeometry:null,routeWarnings:[],reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,treeClosed:new Set(),routeCache:null};
const board=()=>D;


const node=id=>D.graph.nodes.find(n=>n.id===id);
const group=id=>D.graph.groups.find(n=>n.id===id);
const edge=id=>D.graph.edges.find(n=>n.id===id);
const entity=id=>node(id)||group(id)||edge(id);
const allEntities=()=>[...D.graph.nodes,...D.graph.groups,...D.graph.edges];
function children(id){return [...D.graph.groups,...D.graph.nodes].filter(n=>(n.parentId||null)===(id||null));}
function descendants(id){const result=[];const walk=p=>{for(const c of children(p)){result.push(c.id);if(group(c.id))walk(c.id);}};walk(id);return result;}
function ancestors(id){const out=[];let p=(node(id)||group(id))?.parentId;while(p){out.push(p);p=group(p)?.parentId;}return out;}


function styleFor(n){return {shape:'box',color:'blue',icon:'',...D.styles[n.id]};}


function geometryNode(id){return S.sculptNodes?.[id]||S.animationNodes?.[id]||board().layout.nodes[id]||{x:0,y:0,w:176,h:68};}
function rectUnion(rs,pad=0){if(!rs.length)return{x:70,y:160,w:240,h:160};const x=Math.min(...rs.map(r=>r.x)),y=Math.min(...rs.map(r=>r.y)),r=Math.max(...rs.map(r=>r.x+r.w)),b=Math.max(...rs.map(r=>r.y+r.h));return {x:x-pad,y:y-pad,w:r-x+pad*2,h:b-y+pad*2};}
const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const inside=(p,r,pad=0)=>p.x>=r.x-pad&&p.x<=r.x+r.w+pad&&p.y>=r.y-pad&&p.y<=r.y+r.h+pad;
const overlap=(a,b,p=0)=>a.x<b.x+b.w+p&&a.x+a.w+p>b.x&&a.y<b.y+b.h+p&&a.y+a.h+p>b.y;


function groupRect(id,cache=new Map(),ignoreFrozen=false){
 if(!ignoreFrozen&&S.drag?.groupBounds?.has(id))return S.drag.groupBounds.get(id);
 const p=geometryNode(id),r={...p};if(D.collapsed.includes(id)){r.w=Math.min(r.w,210);r.h=58;}return r;
}
function visibleGraph(){
 const proxy=id=>{let p=id;for(const a of ancestors(id))if(D.collapsed.includes(a))p=a;return p;};
 const nodes=D.graph.nodes.filter(n=>proxy(n.id)===n.id),groups=D.graph.groups.filter(g=>!ancestors(g.id).some(id=>D.collapsed.includes(id)));
 const edges=D.graph.edges.map(e=>({...e,a:proxy(e.from),b:proxy(e.to)})).filter(e=>e.a!==e.b||e.from===e.to);
 return{nodes,groups,edges,focus:null,allowed:new Set(D.graph.nodes.map(n=>n.id))};
}
function objectRect(id){return group(id)?groupRect(id):geometryNode(id);}
function selectionRoots(){return [...S.selected].filter(id=>(node(id)||group(id))&&!ancestors(id).some(a=>S.selected.has(a)));}
function moveObject(id,dx,dy,{manual=false}={}){
 for(const child of [id,...(group(id)?descendants(id):[])]){const p=D.layout.nodes[child];if(p){p.x=rounded(p.x+dx);p.y=rounded(p.y+dy);}}
 if(manual&&D.layout.nodes[id])D.layout.nodes[id].manual=true;
}
function contentBounds(id){const rs=children(id).map(n=>group(n.id)?groupRect(n.id):visualNodeBounds(n,geometryNode(n.id)));return rs.length?rectUnion(rs):null;}
function fitContainer(id,{shrink=true}={}){
 const b=contentBounds(id);if(!b)return;const p=D.layout.containers[id]?.padding||24,r=D.layout.nodes[id];
 const next={x:b.x-p,y:b.y-p-28,w:Math.max(180,b.w+p*2),h:Math.max(120,b.h+p*2+28)};
 if(shrink)Object.assign(r,next);else Object.assign(r,rectUnion([r,next]));
}
function ensureParentFits(id){for(const p of ancestors(id))fitContainer(p,{shrink:false});}
function dropTarget(id,rect,frames){
 const excluded=new Set([id,...(group(id)?descendants(id):[])]),p=center(rect);
 return D.graph.groups.filter(g=>!excluded.has(g.id)&&!D.collapsed.includes(g.id)&&!ancestors(g.id).some(id=>D.collapsed.includes(id))&&inside(p,frames?.get(g.id)||groupRect(g.id))).sort((a,b)=>ancestors(b.id).length-ancestors(a.id).length||(groupRect(a.id).w*groupRect(a.id).h-groupRect(b.id).w*groupRect(b.id).h))[0];
}
function resizeRect(id,start,dx,dy,handle,aspect=false){
 let left=start.x,top=start.y,right=start.x+start.w,bottom=start.y+start.h;
 if(handle.includes('w'))left+=dx;if(handle.includes('e'))right+=dx;if(handle.includes('n'))top+=dy;if(handle.includes('s'))bottom+=dy;
 const minW=group(id)?180:40,minH=group(id)?100:28;
 if(aspect&&!group(id)){const ratio=start.h/start.w;bottom=top+(right-left)*ratio;}
 if(right-left<minW){if(handle.includes('w'))left=right-minW;else right=left+minW;}
 if(bottom-top<minH){if(handle.includes('n'))top=bottom-minH;else bottom=top+minH;}
 // Only the frame moves on resize. Children stay at exact world coordinates.
 // A frame cannot shrink across its contents and silently clip them.
 if(group(id)){const b=contentBounds(id),pad=D.layout.containers[id]?.padding||24;if(b){left=Math.min(left,b.x-pad);top=Math.min(top,b.y-pad-28);right=Math.max(right,b.x+b.w+pad);bottom=Math.max(bottom,b.y+b.h+pad);}}
 return{...start,x:rounded(left),y:rounded(top),w:rounded(right-left),h:rounded(bottom-top)};
}


function snapshot(){return JSON.stringify(D);}
function remember(before,label='Edit'){
 if(before===snapshot())return false;
 S.undo.push({data:before,label});if(S.undo.length>80)S.undo.shift();S.redo=[];S.revision++;persist();return true;
}
function change(label,fn,{inspector=true}={}){if(typeof controllers.sculpt.sculptBeforeEdit==='function')controllers.sculpt.sculptBeforeEdit();if(S.preview)acceptLayoutPreview();if(S.drag)finishDrag();const before=snapshot();fn();remember(before,label);renderAll({inspector});}
let saveTimer,toastTimer;
function persist(){
 if(S.preview)return;
 $('save-status').innerHTML='Saving…';clearTimer(saveTimer);
 saveTimer=later(()=>{if(S.preview)return;try{localStorage.setItem(STORAGE,snapshot());$('save-status').innerHTML='Saved';}catch(err){$('save-status').textContent='Not saved · export a backup';toast('Device storage is unavailable or full. Export JSON to keep your work.');console.warn('[diagram-studio] persistence failed',err);}},150);
}
function persistNow(){if(S.preview)discardLayoutPreview();clearTimer(saveTimer);try{localStorage.setItem(STORAGE,snapshot());return true;}catch{return false;}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimer(toastTimer);toastTimer=later(()=>$('toast').classList.remove('show'),3400);}
function undo(){if(typeof controllers.sculpt.sculptUndo==='function'&&controllers.sculpt.sculptUndo())return;if(S.preview){discardLayoutPreview();return;}if(!S.undo.length)return;const entry=S.undo.pop();S.redo.push({data:snapshot(),label:entry.label,...(entry.sculpt?{sculpt:entry.sculpt}:{})});if(typeof controllers.sculpt.sculptHistory==='function')controllers.sculpt.sculptHistory(entry,'undo');D=normalize(JSON.parse(entry.data));S.selected.clear();S.revision++;persist();renderAll();toast('Undid '+entry.label.toLowerCase());}
function redo(){if(typeof controllers.sculpt.sculptBeforeEdit==='function')controllers.sculpt.sculptBeforeEdit();if(!S.redo.length)return;const entry=S.redo.pop();S.undo.push({data:snapshot(),label:entry.label,...(entry.sculpt?{sculpt:entry.sculpt}:{})});if(typeof controllers.sculpt.sculptHistory==='function')controllers.sculpt.sculptHistory(entry,'redo');D=normalize(JSON.parse(entry.data));S.selected.clear();S.revision++;persist();renderAll();toast('Redid '+entry.label.toLowerCase());}




class MinHeap{
 constructor(){this.a=[];}
 push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].f<=v.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
 pop(){const first=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(true){let j=i*2+1;if(j>=this.a.length)break;if(j+1<this.a.length&&this.a[j+1].f<this.a[j].f)j++;if(this.a[j].f>=v.f)break;this.a[i]=this.a[j];i=j;}this.a[i]=v;}return first;}
 get length(){return this.a.length;}
}
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const samePoint=(a,b)=>Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01;
const rounded=n=>Math.round(n*10)/10;
const inflated=(r,p)=>({x:rounded(r.x-p),y:rounded(r.y-p),w:rounded(r.w+2*p),h:rounded(r.h+2*p),id:r.id});
function segmentBlocked(a,b,obstacles){
 if(Math.abs(a.x-b.x)<.01){const lo=Math.min(a.y,b.y),hi=Math.max(a.y,b.y);return obstacles.some(r=>a.x>r.x+.05&&a.x<r.x+r.w-.05&&hi>r.y+.05&&lo<r.y+r.h-.05);}
 if(Math.abs(a.y-b.y)<.01){const lo=Math.min(a.x,b.x),hi=Math.max(a.x,b.x);return obstacles.some(r=>a.y>r.y+.05&&a.y<r.y+r.h-.05&&hi>r.x+.05&&lo<r.x+r.w-.05);}
 return true;
}
function compressPoints(points){const list=points.filter((p,i)=>!i||!samePoint(p,points[i-1]));const out=[];for(const p of list){while(out.length>=2){const a=out[out.length-2],b=out[out.length-1];if(Math.abs(a.x-b.x)<.01&&Math.abs(b.x-p.x)<.01||Math.abs(a.y-b.y)<.01&&Math.abs(b.y-p.y)<.01)out.pop();else break;}out.push(p);}return out;}
function routePath(points,round=true){
 if(!points?.length)return '';
 let path=`M${points[0].x},${points[0].y}`;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],p=points[i],b=points[i+1];
  if(!b||!round){path+=`L${p.x},${p.y}`;continue;}
  const r=Math.min(D.settings.routing?.cornerRadius??6,dist(a,p)/2,dist(p,b)/2);
  if(r===0){path+=`L${p.x},${p.y}`;continue;}
  const before={x:p.x+Math.sign(a.x-p.x)*r,y:p.y+Math.sign(a.y-p.y)*r};
  const after={x:p.x+Math.sign(b.x-p.x)*r,y:p.y+Math.sign(b.y-p.y)*r};
  path+=`L${before.x},${before.y}Q${p.x},${p.y} ${after.x},${after.y}`;
 }
 return path;
}
function sharedCost(a,b,used){
 let cost=0;
 for(const [c,d] of used){
  const horiz=Math.abs(a.y-b.y)<.01,other=Math.abs(c.y-d.y)<.01;
  if(horiz===other){
   const axis=horiz?'x':'y',same=horiz?Math.abs(a.y-c.y)<.05:Math.abs(a.x-c.x)<.05;
   if(same){const length=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));if(length>0)cost+=length*.9+30;}
  }else{
   const h=horiz?[a,b]:[c,d],v=horiz?[c,d]:[a,b];
   if(v[0].x>Math.min(h[0].x,h[1].x)&&v[0].x<Math.max(h[0].x,h[1].x)&&h[0].y>Math.min(v[0].y,v[1].y)&&h[0].y<Math.max(v[0].y,v[1].y))cost+=18;
  }
 }
 return cost;
}
function orthogonalPath(start,end,obstacles,used=[]){
 if(samePoint(start,end))return[start,end];
 if((Math.abs(start.x-end.x)<.01||Math.abs(start.y-end.y)<.01)&&!segmentBlocked(start,end,obstacles)&&sharedCost(start,end,used)<30)return[start,end];
 // Simple elbows are a fast path, but not when they consume another edge's lane.
 const elbows=[{x:end.x,y:start.y},{x:start.x,y:end.y}];
 for(const p of elbows)if(!segmentBlocked(start,p,obstacles)&&!segmentBlocked(p,end,obstacles)&&sharedCost(start,p,used)+sharedCost(p,end,used)<30)return compressPoints([start,p,end]);
 const union=rectUnion([...obstacles,{x:start.x,y:start.y,w:0,h:0},{x:end.x,y:end.y,w:0,h:0}],28);
 const xs=[start.x,end.x,union.x,union.x+union.w],ys=[start.y,end.y,union.y,union.y+union.h];
 obstacles.forEach(r=>{xs.push(r.x,r.x+r.w);ys.push(r.y,r.y+r.h);});
 // Nearby extra corridors prevent repeated edges from sharing a backbone.
 for(const p of [start,end]){xs.push(p.x-12,p.x+12);ys.push(p.y-12,p.y+12);}
 const X=[...new Set(xs.map(rounded))].sort((a,b)=>a-b),Y=[...new Set(ys.map(rounded))].sort((a,b)=>a-b),nx=X.length,ny=Y.length;
 const ix=X.indexOf(rounded(start.x)),iy=Y.indexOf(rounded(start.y)),ex=X.indexOf(rounded(end.x)),ey=Y.indexOf(rounded(end.y));
 const startCell=iy*nx+ix,endCell=ey*nx+ex;
 const heap=new MinHeap(),costs=new Map(),previous=new Map();
 for(const dir of [0,1]){const key=startCell*2+dir;costs.set(key,0);heap.push({key,f:dist(start,end),g:0});}
 let found=null,visits=0;const segmentCache=new Map();
 while(heap.length&&visits++<65000){
  const cur=heap.pop();if(cur.g!==costs.get(cur.key))continue;
  const cell=Math.floor(cur.key/2),direction=cur.key%2;
  if(cell===endCell){found=cur.key;break;}
  const x=cell%nx,y=Math.floor(cell/nx),a={x:X[x],y:Y[y]};
  for(const [dx,dy,dir] of [[-1,0,0],[1,0,0],[0,-1,1],[0,1,1]]){
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=nx||yy>=ny)continue;
   const ncell=yy*nx+xx,key=ncell*2+dir,b={x:X[xx],y:Y[yy]};
   const segkey=Math.min(cell,ncell)+':'+Math.max(cell,ncell);
   let blocked=segmentCache.get(segkey);if(blocked===undefined){blocked=segmentBlocked(a,b,obstacles);segmentCache.set(segkey,blocked);}if(blocked)continue;
   const next=cur.g+dist(a,b)+(dir===direction?0:23)+sharedCost(a,b,used);
   if(next>=(costs.get(key)??Infinity))continue;
   costs.set(key,next);previous.set(key,cur.key);heap.push({key,g:next,f:next+dist(b,end)});
  }
 }
 if(found===null)return null;
 const points=[];let k=found;while(k!==undefined){const cell=Math.floor(k/2);points.push({x:X[cell%nx],y:Y[Math.floor(cell/nx)]});k=previous.get(k);}
 return compressPoints(points.reverse());
}
const opposite={left:'right',right:'left',top:'bottom',bottom:'top'};
const sideVector={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
function preferredSides(a,b,self=false){
 if(self)return['right','bottom'];
 const ca=center(a),cb=center(b),dx=cb.x-ca.x,dy=cb.y-ca.y;
 if(Math.abs(dy)>(a.h+b.h)/2+42&&Math.abs(dy)>Math.min(a.h,b.h)*1.2)return dy>=0?['bottom','top']:['top','bottom'];
 if(Math.abs(dx)<(a.w+b.w)*.32)return dy>=0?['bottom','top']:['top','bottom'];
 if(Math.abs(dy)<(a.h+b.h)*.5)return dx>=0?['right','left']:['left','right'];
 if(board().settings.direction==='DOWN'&&Math.abs(dy)>Math.min(a.h,b.h))return dy>=0?['bottom','top']:['top','bottom'];
 return dx>=0?['right','left']:['left','right'];
}
function portPoint(id,r,side,offset=0){
 const s=node(id)?styleFor(node(id)).shape:'box';let x=r.x+r.w/2,y=r.y+r.h/2;
 if(side==='left'||side==='right'){
  y+=clamp(offset,-r.h/2+12,r.h/2-12);
  let inset=0;
  if(s==='circle'||s==='icon')inset=r.w/2*(1-Math.sqrt(Math.max(0,1-((y-r.y-r.h/2)/(r.h/2))**2)));
  if(s==='diamond')inset=Math.abs(y-r.y-r.h/2)/(r.h/2)*(r.w/2);
  x=side==='left'?r.x+inset:r.x+r.w-inset;
 }else{
  x+=clamp(offset,-r.w/2+12,r.w/2-12);let inset=0;
  if(s==='circle'||s==='icon')inset=r.h/2*(1-Math.sqrt(Math.max(0,1-((x-r.x-r.w/2)/(r.w/2))**2)));
  if(s==='diamond')inset=Math.abs(x-r.x-r.w/2)/(r.w/2)*(r.h/2);
  y=side==='top'?r.y+inset:r.y+r.h-inset;
 }
 return {x:rounded(x),y:rounded(y)};
}
function labelPosition(label,points,obstacles,existing=[]){
 const w=Math.min(280,Math.max(36,label.length*5.9+16)),h=21,candidates=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],len=dist(a,b);if(len<20)continue;
  for(const t of [.5,.35,.65]){
   const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
   const r={x:p.x-w/2,y:p.y-h/2,w,h};
   const blocked=obstacles.some(o=>overlap(r,o,4))||existing.some(o=>overlap(r,o,6));
   candidates.push({...p,w,h,score:len+(a.y===b.y?50:0)-(blocked?10000:0)});
  }
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates[0]||{x:points[0]?.x||0,y:points[0]?.y||0,w,h};
}
function routingFingerprint(doc){return JSON.stringify([doc.graph,doc.layout,doc.styles,doc.collapsed,doc.settings.routing]);}
function makeRoutes(vg,rects){
 const signature=JSON.stringify([vg.edges,[...rects],D.layout.edges,D.settings.routing,vg.groups.map(g=>[g.id,g.parentId,D.collapsed.includes(g.id)]),vg.nodes.map(n=>[n.id,n.parentId,styleFor(n).shape]),!!S.drag,!!S.animationNodes]);
 if(S.routeCache?.signature===signature)return S.routeCache.routes;
 const adopt=S.pendingRouteResult?.fingerprint===routingFingerprint(D)&&!S.drag&&!S.animationNodes&&!S.sculptNodes;
 const result=adopt?clone(S.pendingRouteResult.result):RouteLab.compute({nodes:vg.nodes.map(n=>({...n,...rects.get(n.id),shape:styleFor(n).shape})),groups:vg.groups.map(g=>({...g,...rects.get(g.id),collapsed:D.collapsed.includes(g.id)})),edges:vg.edges.map(e=>({...e,from:e.a,to:e.b,cfg:D.layout.edges[e.id]||{}}))},{...D.settings.routing,previous:S.sculptRoutePrior||S.lastRoutes||[],quick:!!S.drag||!!S.animationNodes});
 const labels=[],obs=vg.nodes.map(n=>rects.get(n.id));
 for(const g of vg.groups){const r=rects.get(g.id);obs.push(D.collapsed.includes(g.id)?r:{x:r.x,y:r.y,w:r.w,h:32});}
 const byEdge=new Map(vg.edges.map(e=>[e.id,e]));
 const routes=result.routes.map(r=>{const e=byEdge.get(r.id),cfg=D.layout.edges[r.id]||{},label=e.label?labelPosition(e.label,r.points,obs,labels):null;
  if(label){label.x+=cfg.labelDx||0;label.y+=cfg.labelDy||0;labels.push({x:label.x-label.w/2,y:label.y-label.h/2,w:label.w,h:label.h});}
  return{...r,edge:e,label,path:routePath(r.points)};
 });
 S.lastRouteResult=clone(result);S.routingReport=result.report;S.routeWarnings=routes.filter(r=>r.blocked).map(r=>r.id);S.lastRoutes=routes;S.routeCache={signature,routes};return routes;
}




// Compact placement: rank the directed graph, minimize crossing order, compare
// wrapped arrangements against the available aspect ratio, then pack islands.
// Everything is local; no library download can block the editing surface.
// BEGIN MODULE layout-ui.js
// Layout Lab UI. Kept separate here for inspection; embedded in the HTML build.
function layoutScope(){const roots=selectionRoots();if(roots.length===1&&group(roots[0]))return{scope:'container',containerId:roots[0]};if(roots.length)return{scope:'selection'};return{scope:'all'};}
let layoutWorker=null,layoutJob=0,layoutReject=null,labOpen=false,layoutCheckpoint=null,labScope='auto';
function syncAlgorithmSelect(){const select=$('algorithm-quick');if(select&&document.activeElement!==select)select.value=D.settings.algorithm;}
function readLayoutSettings(){
 const opts={};for(const el of $('layout-lab').querySelectorAll('[data-layout-setting]')){
  const key=el.dataset.layoutSetting;opts[key]=el.type==='checkbox'?el.checked:el.type==='range'||el.type==='number'?Number(el.value):el.value;
 }return LayoutLab.settings({...D.settings,...opts});
}
function labNumber(label,key,min,max,step=1,help=''){
 return `<label class="lab-field"><span>${label}<output id="out-${key}">${esc(D.settings[key])}</output></span><input type="range" data-layout-setting="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${D.settings[key]}">${help?`<small>${help}</small>`:''}</label>`;
}
function labSelect(label,key,options){return `<label class="lab-field"><span>${label}</span><select data-layout-setting="${key}" aria-label="${label}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(D.settings[key])===v?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function layoutMenu(){closePopover();labOpen=!labOpen;renderLayoutLab();$('layout-options-btn').setAttribute('aria-expanded',String(labOpen));if(labOpen)$('layout-lab').querySelector('select')?.focus({preventScroll:true});else $('canvas').focus();}
function renderLayoutLab(){
 const el=$('layout-lab');el.hidden=!labOpen;if(!labOpen)return;
 const s=D.settings,a=LayoutLab.algorithms.find(a=>a.id===s.algorithm),scope=layoutScope();
 const opt={boundaryPull:()=>labNumber('Cross-boundary pull','boundaryPull',0,100,5,'How strongly actual connected endpoints affect the containing blocks.'),hierarchySweeps:()=>labNumber('Hierarchy sweeps','hierarchySweeps',1,4,1,'Alternate inner-first and outer-first passes; still one total move budget.'),groupGap:()=>labNumber('Between-container gap','groupGap',12,160,4,'Extra breathing room between sibling frames.'),rankGap:()=>labNumber('Rank spacing','rankGap',16,180,4),edgeLength:()=>labNumber('Link breathing room','edgeLength',20,220,4,'Added to a size-aware centre distance.'),repulsion:()=>labNumber('Repulsion','repulsion',0,100,5),flowStrength:()=>labNumber('Forward pressure','flowStrength',0,100,5),alignment:()=>labNumber('Alignment','alignment',0,100,5),compactness:()=>labNumber('Compactness / aspect pull','compactness',0,100,5),gridStrength:()=>labNumber('Grid attraction','gridStrength',0,100,5),ordering:()=>labSelect('Within-rank ordering','ordering',[['stable','Keep current order'],['crossings','Reorder to reduce crossings']]),fold:()=>labSelect('Long sequences','fold',[['auto','Fold to target aspect'],['never','Continuous ranks']]),rootId:()=>labSelect('Root','rootId',[['','Automatic'],...D.graph.nodes.map(n=>[n.id,n.title])])};
 el.innerHTML=`<div class="lab-head"><div><span class="eyebrow">LAYOUT LAB</span><h2>Improve, don’t restart.</h2></div><button class="icon ghost" data-action="layout-menu" aria-label="Close layout lab">${icon('close')}</button></div>
 <div class="lab-scroll"><label class="lab-field"><span>Approach <small>${LayoutLab.algorithms.length} local implementations</small></span><select data-layout-setting="algorithm" aria-label="Layout approach">${LayoutLab.algorithms.map(a=>`<option value="${a.id}" ${a.id===s.algorithm?'selected':''}>${a.name}</option>`).join('')}</select></label>
 <p class="lab-description">${a.short}</p>${intentSummary()}<details class="lab-implementation"><summary>${a.family} · how it works</summary><p>${a.detail}</p></details>
 <label class="lab-field"><span>Scope <small id="scope-hint">${scope.scope==='all'?'Nothing selected':S.selected.size+' selected'}</small></span><select id="lab-scope" aria-label="Layout scope"><option value="auto">Selection / container automatically</option><option value="all">Whole diagram</option><option value="selection">Selected siblings only</option><option value="neighbourhood">Selection + one-hop neighbours</option><option value="container">Inside selected container</option></select></label>
 <div class="lab-columns">${labSelect('Direction','direction',[['RIGHT','Left → right'],['DOWN','Top → bottom']])}${labSelect('Target aspect','aspect',[['1.6','Landscape 8:5'],['1','Square 1:1'],['1.333','Landscape 4:3'],['2','Wide 2:1'],['0.75','Portrait 3:4'],['canvas','Match canvas']])}</div>
 <label class="checkbox"><input type="checkbox" data-layout-setting="respectDirection" ${s.respectDirection?'checked':''}>Respect arrow direction</label><p class="note">Forward order is shared across connective approaches. Pins and frames win. Cycles retain feedback edges. Turn this off to permit folded ranks.</p>
 <section class="lab-section"><div class="row between"><h3>Small passes</h3><span class="lab-badge">DEFAULT</span></div>
 ${labNumber('Maximum move / action','maxMove',8,192,8,'World pixels, across all nested levels. No automatic camera fit.')}
 ${labNumber('Stay near this arrangement','stability',0,100,5,'A soft anchor, not a pin. Lower values allow more change.')}
 ${labNumber('Solver effort','iterations',8,96,8,'More internal steps; the same total movement limit.')}
 ${labNumber('Minimum shape gap','nodeGap',8,96,4)}
 </section><details class="lab-section" open><summary>Approach controls</summary>${a.controls.map(k=>opt[k]?.()||'').join('')||'<p class="note">Only padded collisions are repaired. Link direction and aspect are not objectives.</p>'}</details>
 <details class="lab-section"><summary>Protection & interaction</summary><label class="checkbox"><input type="checkbox" data-layout-setting="respectManual" ${s.respectManual?'checked':''}>Treat Manual markers as fixed</label><label class="checkbox"><input type="checkbox" data-layout-setting="growContainers" ${s.growContainers?'checked':''}>Allow containers to grow right / down</label><p class="note">Pins always stay fixed. A pinned descendant anchors its container. Frame growth is off by default.</p></details>
 <div id="lab-report">${reportMarkup()}</div>
 <section class="lab-section"><div class="row between"><h3>Compare alternatives</h3><span class="tiny muted">Session only</span></div><button class="primary full" data-action="compare-layouts">Compare layouts · Alt E</button><p class="note">Six settled candidates from the same starting document. Apply only the one you choose.</p><div class="lab-columns"><button data-action="layout-checkpoint">Capture checkpoint</button><button data-action="layout-restore" ${!layoutCheckpoint?'disabled':''}>Restore checkpoint</button></div><p class="note">Restore the same starting layout before comparing another approach. This is not a saved view.</p></section>
 </div><div class="lab-foot"><div class="lab-columns"><button class="primary" data-action="lab-pass">Improve <kbd>L</kbd></button><button data-action="lab-preview">Preview pass</button></div><button class="full ghost rebuild-button" data-action="lab-rebuild">Deterministic rebuild… <kbd>⇧ L</kbd></button><p>Rebuild ignores unpinned positions and opens a preview.</p></div>`;
 $('lab-scope').value=labScope;
}
function reportMarkup(){
 const r=S.layoutReport;if(!r)return'<div class="lab-report"><strong>Nothing moves until you ask.</strong><p>Drag something into place. Press L for a bounded pass. Undo is one step.</p></div>';
 const change=r.before.area?Math.round((r.after.area/r.before.area-1)*100):0;
 return `<div class="lab-report"><div class="row between"><strong>${esc(r.name)}</strong><span>${r.mode==='journey'?'Timeline step '+r.selectedStep:r.mode==='pass'?'Small pass':'Rebuild'}</span></div><div class="metric-grid"><div><b>${r.moved}</b><span>objects moved</span></div><div><b>${r.maxDisplacement}px</b><span>largest move</span></div><div><b>${r.before.overlaps} → ${r.after.overlaps}</b><span>sibling overlaps</span></div><div><b>${change>0?'+':''}${change}%</b><span>bounding area</span></div></div><p>Aspect ${r.before.aspect}:1 → ${r.after.aspect}:1 · ${r.milliseconds} ms · ${r.thread||'local'}</p>${r.warnings.map(w=>`<p class="lab-warning">${esc(w)}</p>`).join('')}</div>`;
}
function refreshReport(){if($('lab-report'))$('lab-report').innerHTML=reportMarkup();syncAlgorithmSelect();}
function acceptLayoutPreview(){
 if(!S.preview)return;const before=S.preview.before;S.preview=null;S.animationNodes=null;remember(before,'Layout preview');$('layout-preview').hidden=true;renderAll();refreshReport();
}
function discardLayoutPreview(){
 if(!S.preview)return;const camera=clone(D.camera),before=S.preview.before;S.preview=null;S.animationNodes=null;D=normalize(JSON.parse(before));D.camera=camera;S.revision++;S.routeCache=null;$('layout-preview').hidden=true;renderAll();refreshReport();persist();
}
function showPreview(){
 $('layout-preview').hidden=false;$('preview-name').textContent=(S.layoutReport?.mode==='rebuild'?'Rebuild':'Pass')+' preview';$('save-status').textContent='Preview · not saved';
}
function cancelLayout(){
 layoutJob++;if(layoutWorker){layoutWorker.terminate();layoutWorker=null;}if(layoutReject){layoutReject(new Error('Layout cancelled'));layoutReject=null;}S.layoutBusy=false;$('layout-cancel').hidden=true;renderAll();
}
async function computeInWorker(doc,opts){
 // Blob workers keep routing / pointer input responsive. CSP failures fall back
 // to the same async engine with periodic event-loop yields, not another layout.
 let worker;
 try{
  worker=new Worker(new URL('./workers/layout-worker.js', import.meta.url),{type:'module'});
 }catch(error){console.warn('[layout] Worker unavailable; using yielding main thread',error);const r=await LayoutLab.compute(doc,opts);r.report.thread='main-thread fallback';return r;}
 layoutWorker=worker;
 return new Promise((resolve,reject)=>{
  layoutReject=reject;const cleanup=()=>{worker.terminate();if(layoutWorker===worker)layoutWorker=null;layoutReject=null;};
  worker.onmessage=e=>{cleanup();if(!e.data.ok){reject(Error(e.data.error));return;}e.data.result.report.thread='worker';resolve(e.data.result);};
  worker.onerror=async e=>{e.preventDefault();cleanup();console.warn('[layout] Worker startup failed; using yielding main thread',e.message);try{const r=await LayoutLab.compute(doc,opts);r.report.thread='main-thread fallback';resolve(r);}catch(error){reject(error);}};
  worker.postMessage({doc,opts});
 });
}
async function runLayout(options={}){
 if(typeof controllers.sculpt.sculptBeforeEdit==='function')controllers.sculpt.sculptBeforeEdit();
 if(S.layoutBusy)return{status:'busy'};
 if(S.preview)acceptLayoutPreview();finishInlineEdit(true);if(S.drag)finishDrag();
 const before=snapshot(),revision=S.revision,job=++layoutJob;
 const opts={...D.settings,...layoutScope(),...(typeof controllers.sculpt.sculptFixedIds==='function'?{fixedIds:controllers.sculpt.sculptFixedIds()}:{}),...options,selected:options.selected||[...S.selected],viewport:{w:$('stage').clientWidth,h:$('stage').clientHeight}};
 S.layoutBusy=true;updateStatus();$('layout-cancel').hidden=false;
 try{
  LayoutLab.settings(opts);console.info('[layout] start',{algorithm:opts.algorithm,mode:opts.mode||'pass',scope:opts.scope,budget:opts.maxMove});
  const result=await computeInWorker(clone(D),opts);
  if(layoutJob!==job||S.revision!==revision)return{status:'cancelled'};
  const old=clone(D.layout.nodes),camera=clone(D.camera);D=normalize(result.document);D.camera=camera;
  S.layoutReport=result.report;S.engine=result.report.name;S.routeCache=null;
  if(options.preview){clearTimer(saveTimer);S.preview={before};showPreview();}else remember(before,'Layout: '+result.report.name);
  await animateLayout(old,D.layout.nodes);renderAll();refreshReport();
  if(options.fit===true)fitView();
  console.info('[layout] complete',result.report);
  toast(`${result.report.mode==='rebuild'?'Rebuild':'Pass'} · ${result.report.name} · ${result.report.moved} moved · max ${result.report.maxDisplacement}px${result.report.after.overlaps?' · '+result.report.after.overlaps+' overlaps remain':''}`);
  return{status:options.preview?'preview':'complete',...result.report};
 }catch(error){if(error.message==='Layout cancelled')return{status:'cancelled'};console.error('[layout] failed',error);toast(error.message);return{status:'error',message:error.message};}
 finally{if(job===layoutJob){S.layoutBusy=false;$('layout-cancel').hidden=true;renderAll();}}
}
function labRun(mode='pass',preview=false){
 const opts=labOpen?readLayoutSettings():{...D.settings};const scope=labOpen?$('lab-scope').value:'auto';
 return runLayout({...opts,...(scope==='auto'?layoutScope():{scope}),mode,preview});
}
async function labAction(name){
 if(name==='lab-pass'){await labRun();return true;}
 if(name==='lab-preview'){await labRun('pass',true);return true;}
 if(name==='lab-rebuild'){await labRun('rebuild',true);return true;}
 if(name==='layout-accept'){acceptLayoutPreview();return true;}
 if(name==='layout-discard'){discardLayoutPreview();return true;}
 if(name==='layout-cancel'){cancelLayout();return true;}
 if(name==='layout-checkpoint'){if(S.preview)acceptLayoutPreview();layoutCheckpoint=clone(D);renderLayoutLab();toast('Checkpoint captured. Restore it before trying another approach.');return true;}
 if(name==='layout-restore'){if(!layoutCheckpoint)return true;discardLayoutPreview();const camera=clone(D.camera);setDocument(clone(layoutCheckpoint),{fit:false,label:'Restore layout checkpoint'});D.camera=camera;renderAll();renderLayoutLab();return true;}
 return false;
}
// END MODULE layout-ui.js
function animateLayout(from,to){
 if(S.reduced)return Promise.resolve();const revision=S.revision;
 return new Promise(resolve=>{const start=performance.now();function frame(now){if(S.revision!==revision){S.animationNodes=null;resolve();return;}const t=clamp((now-start)/180,0,1),k=1-(1-t)**3;S.animationNodes={};for(const [id,p] of Object.entries(to)){const old=from[id]||p;S.animationNodes[id]={...p,x:old.x+(p.x-old.x)*k,y:old.y+(p.y-old.y)*k,w:old.w+(p.w-old.w)*k,h:old.h+(p.h-old.h)*k};}renderScene();if(t<1)requestAnimationFrame(frame);else{S.animationNodes=null;resolve();}}requestAnimationFrame(frame);});
}


const measureContext=document.createElement('canvas').getContext('2d');
function textWidth(text,size=13,weight=550){measureContext.font=`${weight} ${size}px Inter, Segoe UI, Arial, sans-serif`;return measureContext.measureText(text).width;}
function wrapText(text,width,size=13){
 const lines=[];for(const paragraph of String(text).split('\n')){
  let line='';for(const word of paragraph.split(/\s+/)){
   if(!word)continue;
   if(textWidth(word,size)>width){if(line){lines.push(line);line='';}let part='';for(const char of word){if(part&&textWidth(part+char,size)>width){lines.push(part);part='';}part+=char;}line=part;continue;}
   if(line&&textWidth(line+' '+word,size)>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;
  }lines.push(line);
 }return lines.length?lines:[''];
}
function nodeCaption(n){return n.title;}
function labelLayout(n,r){
 const style=styleFor(n),cfg=board().layout.labels[n.id]||{},mode=cfg.mode||(style.shape==='icon'||style.shape==='image'||style.shape==='circle'&&style.icon?'bottom':'center');
 let x=r.w/2,y=r.h/2,width=cfg.width||Math.max(60,r.w-24),align='middle';
 if(mode==='center'&&style.icon&&['box','pill'].includes(style.shape)){x+=14;width=Math.max(55,r.w-65);}
 if(style.shape==='diamond'&&mode==='center')width=Math.max(50,r.w*.64);
 if(mode!=='center')width=cfg.width||Math.max(142,r.w);
 const lineHeight=16,lines=wrapText(nodeCaption(n),width,13),height=lines.length*lineHeight;
 if(mode==='top')y=-16-height/2;
 if(mode==='bottom')y=r.h+15+height/2;
 if(mode==='left')x=-20-width/2;
 if(mode==='right')x=r.w+20+width/2;
 if(mode==='detached'){x=r.w/2+(cfg.dx??130);y=r.h/2+(cfg.dy??-65);}
 else{x+=cfg.dx||0;y+=cfg.dy||0;}
 return{x,y,width,height,lines,mode,lineHeight,leader:cfg.leader??mode==='detached'};
}
function visualNodeBounds(n,r){const l=labelLayout(n,r);return rectUnion([r,{x:r.x+l.x-l.width/2,y:r.y+l.y-l.height/2,w:l.width,h:l.height}]);}
function svgText(lines,x,y,{size=13,color='var(--text)',weight=550,anchor='middle',lineHeight=16,cls='node-title'}={}){const first=y-(lines.length-1)*lineHeight/2;return `<text class="${cls}" x="${x}" y="${first}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Inter,Segoe UI,Arial,sans-serif" text-anchor="${anchor}" dominant-baseline="central">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?lineHeight:0}">${esc(line)}</tspan>`).join('')}</text>`;}
function svgGlyph(name,x,y,size,color){return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">${ICONS[name]||ICONS.cube}</svg>`;}


function renderNode(n,vg){
 const r=geometryNode(n.id),style=styleFor(n),c=colorTokens(style.color),selected=S.selected.has(n.id),dimmed=vg.focus&&!vg.focus.has(n.id),label=labelLayout(n,r);
 let shape='';const attrs=`fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.2" class="node-shape"`;
 if(style.shape==='diamond')shape=`<path d="M${r.w/2},0 L${r.w},${r.h/2} L${r.w/2},${r.h} L0,${r.h/2} Z" ${attrs}/>`;
 else if(style.shape==='circle'||style.shape==='icon')shape=`<ellipse cx="${r.w/2}" cy="${r.h/2}" rx="${r.w/2}" ry="${r.h/2}" ${attrs}/>`;
 else if(style.shape==='text')shape=`<rect width="${r.w}" height="${r.h}" rx="6" fill="transparent" stroke="none"/>`;
 else if(style.shape==='image'){
  shape=`<rect width="${r.w}" height="${r.h}" rx="10" ${attrs}/>`;
  if(n.image)shape+=`<clipPath id="image-clip-${esc(n.id)}"><rect x="1" y="1" width="${r.w-2}" height="${r.h-2}" rx="9"/></clipPath><image href="${esc(n.image)}" x="1" y="1" width="${r.w-2}" height="${r.h-2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#image-clip-${esc(n.id)})"/>`;
  else shape+=svgGlyph('image',r.w/2-20,r.h/2-20,40,c.ink);
 }else shape=`<rect width="${r.w}" height="${r.h}" rx="${style.shape==='pill'?r.h/2:11}" ${attrs}/>`;
 if(style.icon&&style.shape!=='image'&&style.shape!=='text'&&style.shape!=='diamond'){
  const large=style.shape==='icon',size=large?30:20,x=large?r.w/2-size/2:style.shape==='circle'?r.w/2-size/2:17;
  shape+=svgGlyph(style.icon,x,r.h/2-size/2,size,c.ink);
 }
 const showLabel=true;
 let leader='';if(label.leader&&label.mode!=='center')leader=`<path class="leader" d="M${r.w/2},${r.h/2} L${label.x},${label.y}"/>`;
 const handles=selected?resizeHandles(n.id,r):'';
 const ports=['left','right','top','bottom'].map(side=>{const p=portPoint(n.id,{x:0,y:0,w:r.w,h:r.h},side);return `<circle class="port" data-port="${side}" data-owner="${esc(n.id)}" cx="${p.x}" cy="${p.y}" r="4.5"><title>Connect from ${side}</title></circle>`;}).join('');
 return `<g class="node ${selected?'selected ':''}${dimmed?'dimmed':''}" data-node="${esc(n.id)}" transform="translate(${r.x},${r.y})" tabindex="0" role="button" aria-label="${esc(n.title)}, ${esc(style.shape)}${r.pinned?', pinned':''}" aria-pressed="${selected}"><title>${esc(n.title)}</title>${leader}<rect class="selection-ring" x="-4" y="-4" width="${r.w+8}" height="${r.h+8}" rx="${style.shape==='icon'||style.shape==='circle'?(r.h+8)/2:style.shape==='pill'?r.h/2:14}"/>${shape}${showLabel?svgText(label.lines,label.x,label.y):''}${positionBadge(n.id,r)}${ports}${handles}</g>`;
}


function resizeHandles(id,r){
 const k=D.camera.k,size=7/k,points=[['nw',0,0],['n',r.w/2,0],['ne',r.w,0],['e',r.w,r.h/2],['se',r.w,r.h],['s',r.w/2,r.h],['sw',0,r.h],['w',0,r.h/2]];
 return points.filter(([side])=>group(id)||side.length===2).map(([side,x,y])=>`<rect class="resize-handle" data-resize="${esc(id)}" data-handle="${side}" x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" rx="${1/k}" style="cursor:${({nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw',n:'ns',s:'ns',e:'ew',w:'ew'})[side]}-resize" vector-effect="non-scaling-stroke"><title>Resize ${group(id)?'container only':'shape'}</title></rect>`).join('');
}
function positionBadge(id,r){
 const pinned=r.pinned,manual=r.manual&&D.settings.showManual;
 if(!pinned&&!manual)return '';
 const name=pinned?'Pinned':'Manual',w=pinned?45:47,x=r.w-w-9,y=group(id)?9:-18;
 return `<g class="position-badge"><rect x="${x}" y="${y}" width="${w}" height="16" rx="4"/><text x="${x+w/2}" y="${y+11}" text-anchor="middle" fill="${pinned?'var(--accent)':'var(--muted)'}">${name}</text></g>`;
}
function renderGroup(g,vg,rects){
 const r=rects.get(g.id),c=colorTokens(styleFor(g).color),selected=S.selected.has(g.id),collapsed=D.collapsed.includes(g.id),count=descendants(g.id).filter(id=>node(id)).length;
 return `<g class="group ${selected?'selected':''} ${S.drag?.dropId===g.id?'drop-target':''}" data-group="${esc(g.id)}" tabindex="0" role="button" aria-label="${esc(g.title)}, container, ${count} shapes" aria-pressed="${selected}" transform="translate(${r.x},${r.y})"><rect class="group-bg" width="${r.w}" height="${r.h}" rx="10" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.2"/><rect class="group-header" data-group-drag="${esc(g.id)}" width="${r.w-30}" height="32" fill="transparent"/>${svgGlyph('group',12,10,13,c.ink)}<text class="group-title" x="33" y="21" fill="${c.ink}" pointer-events="none">${esc(g.title.slice(0,Math.max(8,Math.floor((r.w-125)/6))))}</text><g class="group-collapse" data-collapse="${esc(g.id)}"><rect x="${r.w-29}" y="5" width="24" height="24" rx="5" fill="transparent"/><path d="M${r.w-22} 17h10${collapsed?'m-5-5v10':''}" fill="none" stroke="${c.ink}" stroke-width="1.4"/><title>${collapsed?'Expand':'Collapse'} container</title></g>${positionBadge(g.id,{...r,w:r.w-26})}${collapsed?`<text x="14" y="43" font-size="10" fill="${c.ink}">${count} shapes</text>`:''}${selected&&!collapsed?resizeHandles(g.id,r):''}</g>`;
}
function renderScene(){
 document.documentElement.dataset.theme=D.theme;
 const vg=visibleGraph(),rects=new Map();vg.nodes.forEach(n=>rects.set(n.id,{...geometryNode(n.id)}));vg.groups.forEach(g=>rects.set(g.id,groupRect(g.id)));
 S.lastGeometry={vg,rects};const active=document.activeElement,focused=active?.dataset?.node||active?.dataset?.group||active?.dataset?.edge;
 $('group-layer').innerHTML=vg.groups.sort((a,b)=>ancestors(a.id).length-ancestors(b.id).length).map(g=>renderGroup(g,vg,rects)).join('');
 const routes=makeRoutes(vg,rects);$('edge-layer').innerHTML=renderEdges(routes,vg);$('node-layer').innerHTML=vg.nodes.map(n=>renderNode(n,vg)).join('');
 $('world').classList.toggle('connecting',S.tool==='connect'||!!S.connectFrom);renderOverlay();applyCamera();
 if(focused&&!S.drag&&!S.inline){$('world').querySelector(`[data-node="${CSS.escape(focused)}"],[data-group="${CSS.escape(focused)}"],[data-edge="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});}
 $('empty-canvas').hidden=!!(vg.nodes.length||vg.groups.length);updateStatus(vg);
}
function renderOverlay(){
 let html='',d=S.drag;
 if(d?.kind==='marquee'||d?.kind==='draw'){
  const r={x:Math.min(d.start.x,d.current.x),y:Math.min(d.start.y,d.current.y),w:Math.abs(d.current.x-d.start.x),h:Math.abs(d.current.y-d.start.y)};
  html+=`<rect class="${d.kind==='draw'?'drawing-preview':'marquee'}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${d.kind==='draw'?8:0}"/>`;
 }
 if(S.connectFrom&&S.pointer){const id=S.connectFrom.id,r=geometryNode(id);if(r){const side=S.connectFrom.side==='auto'?(Math.abs(S.pointer.x-center(r).x)>Math.abs(S.pointer.y-center(r).y)?S.pointer.x>center(r).x?'right':'left':S.pointer.y>center(r).y?'bottom':'top'):S.connectFrom.side||'right',a=portPoint(id,r,side),b=S.pointer;const points=side==='left'||side==='right'?[a,{x:(a.x+b.x)/2,y:a.y},{x:(a.x+b.x)/2,y:b.y},b]:[a,{x:a.x,y:(a.y+b.y)/2},{x:b.x,y:(a.y+b.y)/2},b];html+=`<path class="connection-preview" d="${routePath(points)}"/>`;}}
 if(d?.guides)for(const g of d.guides)html+=`<path class="guide" d="${g.axis==='x'?`M${g.value} ${g.from}V${g.to}`:`M${g.from} ${g.value}H${g.to}`}"/>`;
 if(!S.sculptNodes&&S.tool!=='brush'&&!d&&!S.inline&&!S.connectFrom&&S.selected.size===1&&node([...S.selected][0])){
  const id=[...S.selected][0],r=geometryNode(id),size=22/D.camera.k;
  for(const side of ['right','bottom']){const p=portPoint(id,r,side),v=sideVector[side],x=p.x+v.x*26/D.camera.k,y=p.y+v.y*26/D.camera.k;
   html+=`<g class="quick-add" data-quick-add="${side}" data-quick-owner="${esc(id)}" role="button" tabindex="0" aria-label="Add connected shape ${side}"><title>Add connected shape ${side} · Alt + arrow</title><circle cx="${x}" cy="${y}" r="${size/2}"/><path d="M${x-size/4} ${y}h${size/2}M${x} ${y-size/4}v${size/2}"/></g>`;
  }
 }
 if(typeof controllers.sculpt.sculptOverlay==='function')html+=controllers.sculpt.sculptOverlay();
 $('overlay-layer').innerHTML=html;
}
function fitView({minimumZoom=.08}={}){
 renderScene();if(!D.graph.nodes.length&&!D.graph.groups.length)return;
 const b=sceneBounds(),w=$('stage').clientWidth,h=$('stage').clientHeight,pad=40,bottom=60,k=clamp(Math.min((w-pad*2)/Math.max(1,b.w),(h-pad-bottom)/Math.max(1,b.h)),minimumZoom,1.2);
 D.camera={x:(w-b.w*k)/2-b.x*k,y:(h-bottom+pad-b.h*k)/2-b.y*k,k};applyCamera();persist();
}
function updateStatus(vg=visibleGraph()){
 $('item-status').textContent=`${vg.nodes.length} shapes · ${vg.edges.length} connections${S.selected.size?' · '+S.selected.size+' selected':''}`;
 const modes={brush:'Hover previews · drag paints · [ / ] radius · Alt restores · Space pans',select:'Drag shapes to edit · background pans · Shift drag selects',pan:'Drag to pan · scroll to pan · pinch to zoom · V to edit',connect:S.connectFrom?'Connect from '+(node(S.connectFrom.id)?.title||'shape')+' → choose target or empty space · Esc to stop':'Connect: choose source, then target · Esc to stop',container:'Drag to draw a container around shapes',box:'Click or drag to add a rectangle',diamond:'Click or drag to add a diamond',circle:'Click or drag to add an ellipse',text:'Click to add text'};
 $('mode-status').textContent=S.drag?.kind==='resize'&&group(S.drag.id)?'Resizing container only · contents stay in place':modes[S.tool]||modes.select;
 const pinned=D.graph.nodes.filter(n=>D.layout.nodes[n.id]?.pinned||ancestors(n.id).some(a=>D.layout.nodes[a]?.pinned)).length+D.graph.groups.filter(g=>D.layout.nodes[g.id]?.pinned).length;
 $('engine-status').textContent=S.layoutBusy?'Arranging…':S.routeWarnings.length?S.routeWarnings.length+' obstructed routes':pinned?`${pinned} pinned · P to toggle`:S.layoutReport?`${S.layoutReport.mode==='journey'?'Timeline step '+S.layoutReport.selectedStep:S.layoutReport.mode==='rebuild'?'Rebuild':'Pass'} · ${S.layoutReport.name} · ${S.layoutReport.maxDisplacement}px max move`:'Tab extends · L improves · Alt R reroutes';
 $('engine-status').classList.toggle('warning',!!S.routeWarnings.length);
 $('undo-btn').disabled=!S.undo.length;$('redo-btn').disabled=!S.redo.length;$('layout-btn').disabled=S.layoutBusy||!!S.sculptNodes;
 if(controllers.sculpt.isJourneyOpen?.()&&typeof controllers.sculpt.sculptLockControls==='function')controllers.sculpt.sculptLockControls(true);
}


function renderEdges(routes,vg){
 const v=board();return routes.map(r=>{
  const e=r.edge,selected=S.selected.has(e.id),dim=vg.focus&&!(vg.focus.has(e.from)&&vg.focus.has(e.to));
  const col=e.dashed?colorTokens('slate').ink:e.emphasis?colorTokens('violet').ink:colorTokens('slate').ink;
  const stroke=r.blocked?colorTokens('rose').ink:col,marker='arrow-'+e.id;
  const label=r.label;const showLabel=!!label;
  const labelSvg=showLabel?`<g data-edge-label="${esc(e.id)}"><rect x="${label.x-label.w/2}" y="${label.y-label.h/2}" width="${label.w}" height="${label.h}" rx="6" fill="var(--canvas)" stroke="none"/><text class="edge-label" x="${label.x}" y="${label.y}" fill="${stroke}">${esc(e.label)}</text></g>`:'';
  const waypoints=selected?(v.layout.edges[e.id]?.waypoints||[]).map((p,i)=>`<rect class="waypoint" data-waypoint="${esc(e.id)}" data-index="${i}" x="${p.x-5}" y="${p.y-5}" width="10" height="10" rx="2"><title>Drag to move bend. Double-click to remove.</title></rect>`).join(''):'';
  return `<g class="edge ${selected?'selected ':''}${dim?'dimmed':''}" data-edge="${esc(e.id)}" tabindex="0" role="button" aria-label="${esc(node(e.from)?.title)} to ${esc(node(e.to)?.title)}${e.label?', '+esc(e.label):''}"><title>${esc(e.label||'Connection')}${r.blocked?' — route obstructed; move overlapping nodes or reset bends':''}</title><defs><marker id="${esc(marker)}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="${selected?'var(--accent)':stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs><path class="edge-hit" d="${r.path}"/><path class="edge-line" d="${r.path}" stroke="${stroke}" stroke-width="${e.emphasis?2:1.4}" opacity="${e.emphasis?1:.72}" ${e.dashed||false||r.blocked?'stroke-dasharray="5 5"':''} ${e.directed?`marker-end="url(#${esc(marker)})"`:''}/>${labelSvg}${waypoints}</g>`;
 }).join('');
}


function applyCamera(){const c=board().camera;$('world').setAttribute('transform',`translate(${c.x},${c.y}) scale(${c.k})`);$('dots').setAttribute('patternTransform',`translate(${c.x% (24*c.k)},${c.y%(24*c.k)}) scale(${c.k})`);$('zoom-label').textContent=Math.round(c.k*100)+'%';}
function screenToWorld(clientX,clientY){const r=$('canvas').getBoundingClientRect(),c=board().camera;return{x:(clientX-r.left-c.x)/c.k,y:(clientY-r.top-c.y)/c.k};}
function worldToScreen(p){const r=$('canvas').getBoundingClientRect(),c=board().camera;return{x:r.left+p.x*c.k+c.x,y:r.top+p.y*c.k+c.y};}
function sceneBounds(){const {vg,rects}=S.lastGeometry||{vg:visibleGraph(),rects:new Map()};const rs=vg.nodes.map(n=>visualNodeBounds(n,geometryNode(n.id)));if(true)for(const g of vg.groups)rs.push(rects.get(g.id)||groupRect(g.id));for(const route of S.lastRoutes){for(const p of route.points)rs.push({x:p.x,y:p.y,w:0,h:0});if(route.label)rs.push({x:route.label.x-route.label.w/2,y:route.label.y-12,w:route.label.w,h:24});}return rectUnion(rs);}


function zoomAt(factor,clientX,clientY){const bounds=$('canvas').getBoundingClientRect(),x=clientX-bounds.left,y=clientY-bounds.top,c=board().camera,world={x:(x-c.x)/c.k,y:(y-c.y)/c.k};const k=clamp(c.k*factor,.08,4);c.x=x-world.x*k;c.y=y-world.y*k;c.k=k;applyCamera();persist();}


function field(label,key,value,type='text',extra=''){return `<label class="field"><span>${label}</span><input data-field="${key}" type="${type}" value="${esc(value??'')}" ${extra}></label>`;}
function selectField(label,key,value,options){return `<label class="field"><span>${label}</span><select data-field="${key}">${options.map(o=>{const [val,text]=Array.isArray(o)?o:[o,o];return `<option value="${esc(val)}" ${val===value?'selected':''}>${esc(text)}</option>`;}).join('')}</select></label>`;}
function checkbox(label,key,checked){return `<label class="checkbox"><input type="checkbox" data-field="${key}" ${checked?'checked':''}>${label}</label>`;}
function parentSelect(n){const excluded=new Set([n.id,...(group(n.id)?descendants(n.id):[])]);return selectField('Container','parentId',n.parentId||'',[['','No container'],...D.graph.groups.filter(g=>!excluded.has(g.id)).map(g=>[g.id,g.title])]);}


function swatches(id){const n=entity(id);return `<div class="swatches" role="group" aria-label="Object color">${Object.entries(PALETTE).map(([key,c])=>`<button class="${styleFor(n).color===key?'selected':''}" data-color="${key}" aria-label="${key}" title="${key}" style="background:${colorTokens(key).ink}"></button>`).join('')}</div>`;}


let leftClosed=true,rightClosed=true,lastDialogFocus=null,lastPanelState=null;
function updatePanelState(){
 $('app').classList.toggle('right-closed',rightClosed);$('workspace').classList.toggle('left-closed',leftClosed);
 $('objects-panel').hidden=leftClosed;$('inspector-panel').hidden=rightClosed;
 document.querySelectorAll('[data-action="toggle-left"]').forEach(b=>b.setAttribute('aria-pressed',String(!leftClosed)));
 document.querySelectorAll('[data-action="toggle-right"]').forEach(b=>b.setAttribute('aria-pressed',String(!rightClosed)));
 try{localStorage.setItem(UI_STORAGE,JSON.stringify({leftClosed,rightClosed}));}catch{}
}
function renderLibrary(){
 const q=$('layer-search').value.trim().toLowerCase();$('layer-count').textContent=D.graph.nodes.length+D.graph.groups.length;
 let html='';function walk(parent,depth){for(const n of children(parent)){const g=group(n.id),hidden=ancestors(n.id).some(id=>S.treeClosed.has(id));if(hidden&&!q)continue;const match=n.title.toLowerCase().includes(q);if(!q||match){const p=D.layout.nodes[n.id];html+=`<div class="layer-row ${S.selected.has(n.id)?'active':''}" style="padding-left:${depth*12}px">${g?`<button class="tree-toggle" data-tree="${esc(n.id)}" aria-label="${S.treeClosed.has(n.id)?'Expand':'Collapse'} list for ${esc(n.title)}">${icon(S.treeClosed.has(n.id)?'arrow':'chevron')}</button>`:'<span style="width:22px;flex:none"></span>'}<button class="layer-label" data-select="${esc(n.id)}" title="${esc(n.title)}">${icon(g?'group':styleFor(n).shape)}<span>${esc(n.title)}</span>${p?.pinned?icon('pin','object-pin'):''}</button></div>`;}if(g)walk(n.id,depth+1);}}walk(null,0);
 $('layer-list').innerHTML=html||'<p class="note">No matching objects.</p>';
}
function geometryFields(id){
 const r=geometryNode(id);return `<div class="fields-2">${field('X','layout.x',Math.round(r.x),'number')}${field('Y','layout.y',Math.round(r.y),'number')}${field('Width','layout.w',Math.round(r.w),'number')}${field('Height','layout.h',Math.round(r.h),'number')}</div>`;
}
function pinControl(id){
 const p=geometryNode(id),inherited=ancestors(id).find(a=>geometryNode(a).pinned);
 return `${checkbox('Pin during layout','layout.pinned',p.pinned)}<p class="note">${inherited?'Protected by pinned container “'+esc(group(inherited).title)+'”.':p.pinned?'Layout keeps this position. You can still drag it.':p.manual?'Moved by hand. '+(D.settings.respectManual?'“Keep manual positions” is on.':'Layout may move it. Pin to protect it.'):'Layout is free to move this object.'}</p>`;
}

const INTENT_LABELS={'top-left':'Top left','left-center':'Left center',center:'Center · branch both ways','top-center':'Top center','top-right':'Top right','right-center':'Right center','bottom-left':'Bottom left','bottom-center':'Bottom center','bottom-right':'Bottom right'};
function setLayoutIntent(role,id,placement){
 if(!['start','end'].includes(role))throw Error('Choose start or end.');
 if(id&&!node(id))throw Error('Choose a shape for layout intent, not an edge or container.');
 const next=clone(D.layout.intent||{});
 if(!id)delete next[role];else{
  const other=role==='start'?'end':'start';if(next[other]?.id===id)delete next[other];
  next[role]={id,placement:placement||next[role]?.placement||(role==='start'?'top-left':'bottom-right')};
 }
 const valid=LayoutLab.normalizeIntent(next,new Set(D.graph.nodes.map(n=>n.id)));
 change('Set '+role+' preference',()=>{D.layout.intent=valid;});renderLayoutLab();
 toast(id?'Layout preference saved. Improve or compare to arrange it.':'Cleared '+role+' preference');return clone(valid);
}
function intentInspector(id){
 const intent=D.layout.intent||{},role=intent.start?.id===id?'start':intent.end?.id===id?'end':null;
 return `<section class="section intent-section"><h3>Layout intent</h3>${role?`<div class="row between"><span class="intent-role">${role==='start'?'Start':'End'}</span><button class="small ghost" data-action="clear-${role}">Clear</button></div>${selectField('Preferred area','intent.'+role,intent[role].placement,Object.entries(INTENT_LABELS).filter(([key])=>role==='start'||key!=='center'))}`:`<div class="fields-2"><button data-action="mark-start">Start here</button><button data-action="mark-end">End here</button></div>`}<p class="note">A preferred area, not a fixed coordinate. Pins and container boundaries still win.</p></section>`;
}
function intentSummary(){
 const intent=D.layout.intent||{},entries=Object.entries(intent);
 return `<section class="section intent-section"><h3>Drawing intent</h3>${entries.length?entries.map(([role,hint])=>`<div class="row" style="margin-bottom:6px"><span class="intent-role">${role}</span><button class="ghost grow" data-select="${esc(hint.id)}" style="justify-content:flex-start;overflow:hidden;text-overflow:ellipsis">${esc(node(hint.id)?.title||hint.id)}</button><button class="small ghost" data-action="clear-${role}" aria-label="Clear ${role}">×</button></div><p class="note">${esc(INTENT_LABELS[hint.placement])}</p>`).join(''):'<p class="note">Select a shape to mark a start or end and choose its preferred area. This helps resolve feedback loops without pinning coordinates.</p>'}</section>`;
}

function renderInspector(){
 const ids=[...S.selected].filter(id=>entity(id));S.selected=new Set(ids);let html='';
 if(ids.length>1){
  html=`<div class="inspector-heading"><strong>${ids.length} selected</strong><span class="state-pill">Selection</span></div><section class="section"><div class="fields-2"><button data-action="layout">Arrange</button><button data-action="group">Wrap container</button><button data-action="duplicate">Duplicate</button><button data-action="pin">Pin</button></div></section><section class="section"><div class="section-title"><span class="eyebrow">Align</span></div><div class="fields-2"><button data-action="align-left">Left</button><button data-action="align-top">Top</button><button data-action="align-center">Horizontal center</button><button data-action="align-middle">Vertical center</button><button data-action="distribute-x">Distribute X</button><button data-action="distribute-y">Distribute Y</button></div></section>${swatches(ids[0])}<button class="full danger ghost" data-action="delete">Delete selection</button>`;
 }else if(ids.length===1){
  const id=ids[0],n=entity(id),isGroup=!!group(id),isEdge=!!edge(id),s=styleFor(n),p=geometryNode(id);
  html=`<div class="inspector-heading"><strong>${isGroup?'Container':isEdge?'Connection':'Shape'}</strong>${!isEdge?`<span class="state-pill ${p.pinned?'pinned':''}">${p.pinned?'Pinned':p.manual?'Manual':'Automatic'}</span>`:''}</div>`;
  if(isEdge){
   const cfg=D.layout.edges[id]||{};
   html+=`<section class="section">${field('Label','label',n.label)}${checkbox('Arrow','directed',n.directed)}${checkbox('Dashed','dashed',n.dashed)}${checkbox('Emphasis','emphasis',n.emphasis)}</section><section class="section"><div class="fields-2">${selectField('From','edge.fromSide',cfg.fromSide||'auto',['auto','left','right','top','bottom'])}${selectField('To','edge.toSide',cfg.toSide||'auto',['auto','left','right','top','bottom'])}</div><div class="fields-2"><button data-action="reverse-edge">Reverse</button><button data-action="reset-route">Reset bends</button></div><p class="note">Resolved: ${esc(S.lastRoutes.find(r=>r.id===id)?.fromSide||"—")} → ${esc(S.lastRoutes.find(r=>r.id===id)?.toSide||"—")}. Auto ports can switch to avoid crossings.</p><div class="fields-2"><button data-action="auto-ports">Use auto ports</button><button data-action="insert-step">Insert step · Tab</button></div><p class="note">Double-click a line to add a bend. Double-click a bend to remove it. Alt-drag a label to move it.</p></section><button class="full danger ghost" data-action="delete">Delete connection</button>`;
  }else{
   html+=`<section class="section">${field('Label','title',n.title)}${swatches(id)}${!isGroup?selectField('Shape','style.shape',s.shape,[['box','Rectangle'],['pill','Pill'],['circle','Ellipse'],['diamond','Diamond'],['text','Text'],['icon','Icon'],['image','Image']]):''}</section><section class="section">${geometryFields(id)}${pinControl(id)}</section>`;
   if(!isGroup)html+=intentInspector(id);
   if(isGroup){const cfg=D.layout.containers[id]||{};
    html+=`<section class="section">${selectField('Arrange contents','container.direction',cfg.direction||'inherit',[['inherit','Follow diagram'],['RIGHT','Left to right'],['DOWN','Top to bottom']])}${field('Inner padding','container.padding',cfg.padding||24,'number','min="12" max="80"')}<div class="fields-2"><button data-action="layout">Layout inside</button><button data-action="fit-container">Fit contents</button></div><p class="note">Drag any edge or corner to resize the frame. Its contents stay put. Drag inside the empty frame to move the whole container.</p></section><section class="section">${parentSelect(n)}<div class="fields-2"><button data-action="collapse-selected">${D.collapsed.includes(id)?'Expand':'Collapse'}</button><button data-action="ungroup">Ungroup</button></div></section>`;
   }else{
    html+=`<details><summary>Label & icon</summary>${selectField('Label position','label.mode',labelLayout(n,p).mode,['center','top','bottom','left','right','detached'])}${selectField('Icon','style.icon',s.icon||'',[['','None'],...['user','browser','server','database','key','cloud','bolt','check','file','folder','mail','globe','terminal','cube','chart','truck']])}${s.shape==='image'?'<button data-action="replace-image" class="full">Replace image</button>':''}</details><section class="section">${parentSelect(n)}<button data-action="add-connected" class="full">Add connected box <kbd>⇧ Enter</kbd></button></section>`;
   }
   html+=`<div class="fields-2"><button data-action="duplicate">Duplicate</button><button class="danger ghost" data-action="delete">Delete</button></div>`;
  }
 }else html=`${intentSummary()}<div class="blank-inspector"><strong>Select a shape, connection, or container.</strong><p>Its appearance and geometry will be available here.</p></div><section class="section" style="margin-top:14px">${checkbox('Snap to nearby shapes','setting.snap',D.settings.snap)}${checkbox('Show manual position badges','setting.showManual',D.settings.showManual)}</section><button class="full" data-action="layout-menu">Layout options</button><button class="full ghost" style="margin-top:10px" data-action="help">Keyboard shortcuts <kbd>?</kbd></button>`;
 const open=[...$('inspector').querySelectorAll('details')].some(d=>d.open);$('inspector').innerHTML=html;if(open)$('inspector').querySelector('details')?.setAttribute('open','');
 if(controllers.sculpt.isJourneyOpen?.()&&typeof controllers.sculpt.sculptLockControls==='function')controllers.sculpt.sculptLockControls(true);
}
function renderAll({inspector=true}={}){if(typeof controllers.sculpt.sculptCheckDocument==='function')controllers.sculpt.sculptCheckDocument();
 syncAlgorithmSelect();renderScene();if(document.activeElement!==$('document-title'))$('document-title').value=D.title;renderLibrary();if(inspector)renderInspector();updatePanelState();
 document.querySelectorAll('[data-tool]').forEach(b=>{if(b.tagName!=='BUTTON')return;b.classList.toggle('active',b.dataset.tool===S.tool);b.setAttribute('aria-pressed',String(b.dataset.tool===S.tool));});
}
function closePopover(){const p=$('popover');if(!p.hidden){p.hidden=true;p._returnFocus?.focus({preventScroll:true});}}
function showPopover(anchor,content,cls=''){
 const p=$('popover');if(!p.hidden&&p.dataset.anchor===anchor.id){closePopover();return;}
 p.className='popover '+cls;p.innerHTML=content;p.dataset.anchor=anchor.id||'';p._returnFocus=anchor instanceof HTMLElement?anchor:$('canvas');p.hidden=false;
 const r=anchor.getBoundingClientRect(),w=p.offsetWidth;p.style.left=clamp(r.right-w,8,innerWidth-w-8)+'px';p.style.top=clamp(r.bottom+6,8,innerHeight-p.offsetHeight-8)+'px';p.querySelector('button,input,select')?.focus({preventScroll:true});
}
function menuButton(action,label,key='',glyph=''){return `<button data-action="${action}">${glyph?icon(glyph):''}${label}${key?`<kbd>${key}</kbd>`:''}</button>`;}
function fileMenu(){showPopover($('file-menu-btn'),`${menuButton('blank','New diagram','', 'plus')}${menuButton('quick-build','Build from a list…','B','layers')}${menuButton('import','Open diagram…','','folder')}${menuButton('image','Insert image…','','image')}<hr>${menuButton('journey-reopen','Reopen last layout timeline','','journey')}${menuButton('journey-save','Save layout timeline…','','download')}<hr><div class="menu-heading">Examples</div>${SAMPLE_INFO.map(s=>`<button data-sample="${s.id}">${icon(s.icon)}${s.title}</button>`).join('')}<hr>${menuButton('theme','Toggle light / dark','','sun')}${menuButton('help','Keyboard shortcuts','?', 'help')}`);}
function editMenu(anchor=$('edit-menu-btn')){showPopover(anchor,`${menuButton('quick-build','Build from a list…','B','layers')}${menuButton('add-node','Add box','N','plus')}${menuButton('add-connected','Add connected box','⇧ Enter','connect')}<hr>${menuButton('duplicate','Duplicate','⌘/Ctrl D','copy')}${menuButton('group','Wrap in container','⌘/Ctrl G','group')}${menuButton('ungroup','Ungroup','⌘/Ctrl ⇧ G')}${menuButton('pin','Toggle pin','P','pin')}${menuButton('release-manual','Clear manual markers')}${menuButton('delete','Delete selection','⌫','trash')}<hr><div class="menu-heading">Arrange selection</div>${menuButton('align-left','Align left')}${menuButton('align-top','Align top')}${menuButton('align-center','Align horizontal centers')}${menuButton('align-middle','Align vertical centers')}${menuButton('distribute-x','Distribute horizontally')}${menuButton('distribute-y','Distribute vertically')}`);}
function exportMenu(){showPopover($('export-btn'),`${menuButton('export-json','Save diagram','⌘/Ctrl S','download')}${menuButton('export-svg','Export SVG','','export')}${menuButton('export-png','Export PNG','','image')}<p class="note">Saved diagrams and exported SVGs remain editable. PNG is image-only.</p>`);}
function openDialog(title,body,footer=''){
 closePopover();lastDialogFocus=document.activeElement;$('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-foot').innerHTML=footer;$('main-dialog').showModal();
}
function closeDialog(){if($('main-dialog').open)$('main-dialog').close();}
function confirmAction(title,message,callback,label='Continue'){
 openDialog(title,`<p class="note" style="font-size:13px">${esc(message)}</p>`,`<button data-action="close-dialog">Cancel</button><button class="primary" id="confirm-action">${esc(label)}</button>`);$('confirm-action').onclick=()=>{closeDialog();callback();};
}
function showHelp(){
 const keys=[['Add box','N / double-click'],['Draw box / ellipse / diamond','R / O / D'],['Draw text / container','T / G'],['Edit / navigate','V / H'],['Pan trackpad / zoom','Scroll / pinch'],['Zoom with mouse','Cmd + move / Ctrl drag'],['Pan temporarily','Space + drag'],['Marquee / multi-select','Shift drag / Shift click'],['Connect (stays active)','C'],['Edit label','Enter / double-click'],['Next / sibling while typing','Tab / Shift Tab'],['Add in a direction','Alt + arrow'],['Build from a list','B'],['Reroute without moving shapes','Alt R'],['Automatic ports on selection','Alt Shift R'],['Lock a connection side','Alt + port drag'],['Insert step on selected connection','Tab'],['Add connected box','Shift Enter'],['Improve current scope','L'],['Layout timeline','Alt T'],['Local layout brush','W'],['Brush size (in brush mode)','[ / ]'],['Restore while brushing','Alt + drag'],['One brush dab','L in brush mode'],['Preview deterministic rebuild','Shift L'],['Layout settings','Alt L'],['Compare layouts / parameters','Alt E'],['Return to Edit','Escape'],['Pin / unpin','P'],['Nudge / nudge by 10','Arrows / Shift arrows'],['Wrap / ungroup','Ctrl/⌘ G / Shift G'],['Duplicate','Ctrl/⌘ D'],['Copy / paste','Ctrl/⌘ C / V'],['Undo / redo','Ctrl/⌘ Z / Shift Z'],['Delete / with children','Delete / Shift Delete'],['Fit / 100%','1 / 0'],['Objects / inspector','[ / ]'],['Hide / restore panels','\\'],['Keep container while dragging','Alt + drag'],['Save / open diagram','Ctrl/⌘ S / O']];
 openDialog('Keyboard shortcuts',`<div class="shortcuts">${keys.map(([a,b])=>`<div class="shortcut"><span>${a}</span><kbd>${b}</kbd></div>`).join('')}</div><p class="help-callout"><strong>Containers:</strong> resize any edge or corner without moving the contents. Drag their header or empty interior to move everything together.<br><strong>Connections:</strong> C stays active. Click a source, then a target; an empty target creates a connected box. Keyboard: select a source, press C, Tab to the target, then Enter. Escape returns to Edit.<br><strong>Layout:</strong> a Manual badge records a hand move; only a pin protects it by default. One selected container arranges its contents. Multiple selected siblings arrange together. Otherwise L improves everything. Each pass has a movement cap and keeps the camera. Rebuild is explicit and previewed.</p>`);
}


function selectItems(ids,{add=false,toggle=false,fit=false}={}){
 const next=add?new Set(S.selected):new Set();for(const id of ids){if(!entity(id))continue;if(toggle&&next.has(id))next.delete(id);else next.add(id);}S.selected=next;renderAll();if(fit)centerSelection();
}
function centerSelection(){
 const rects=[...S.selected].filter(id=>node(id)||group(id)).map(id=>group(id)?groupRect(id):geometryNode(id));if(!rects.length)return;
 const b=rectUnion(rects),c=board().camera;c.x=$('stage').clientWidth/2-(b.x+b.w/2)*c.k;c.y=$('stage').clientHeight/2-(b.y+b.h/2)*c.k;applyCamera();persist();
}


function setTool(tool){
 if(typeof controllers.sculpt.sculptToolChange==='function'&&controllers.sculpt.sculptToolChange(tool))return;
 finishInlineEdit(true);S.tool=tool;S.connectFrom=null;$('stage').dataset.tool=tool;
 if(tool==='connect'&&S.selected.size===1&&node([...S.selected][0]))S.connectFrom={id:[...S.selected][0],side:'auto'};
 renderAll();$('canvas').focus({preventScroll:true});
}
function canvasCenter(){const r=$('stage').getBoundingClientRect();return screenToWorld(r.left+r.width/2,r.top+r.height/2);}
function addNode(partial={},at=canvasCenter(),{edit=false}={}){
 const id=partial.id||uid('n');if(entity(id))throw Error('ID already exists: '+id);
 if(partial.parentId&&!group(partial.parentId))throw Error('Container does not exist.');
 const shape=partial.style?.shape||'box',w=partial.w||(shape==='circle'||shape==='icon'?80:shape==='diamond'?132:164),h=partial.h||(shape==='circle'||shape==='icon'?80:shape==='diamond'?100:shape==='text'?38:56);
 const next={id,title:partial.title||'New box',...(partial.parentId?{parentId:partial.parentId}:{}),...(partial.image?{image:partial.image}:{})};
 const pos={x:rounded(partial.position?.x??at.x-w/2),y:rounded(partial.position?.y??at.y-h/2),w,h,manual:false,pinned:false};
 change('Add shape',()=>{D.graph.nodes.push(next);D.layout.nodes[id]=pos;D.styles[id]={shape,color:'blue',icon:'',...partial.style};if(partial.parentId)ensureParentFits(id);S.selected=new Set([id]);});
 if(edit)startInlineEdit(id);return id;
}
function addEdge(partial){
 if(!node(partial.from)||!node(partial.to))throw Error('Both endpoints must exist.');const id=partial.id||uid('e');if(entity(id))throw Error('ID already exists: '+id);
 change('Add connection',()=>{D.graph.edges.push({id,from:partial.from,to:partial.to,label:partial.label||'',directed:partial.directed!==false,emphasis:!!partial.emphasis,dashed:!!partial.dashed});D.layout.edges[id]={fromSide:partial.fromSide||'auto',toSide:partial.toSide||'auto'};S.selected=new Set([id]);});return id;
}
function completeConnection(id,side='auto'){
 const from=S.connectFrom;if(!from||!node(id))return;S.connectFrom=null;
 addEdge({from:from.id,to:id,fromSide:from.side,toSide:side});
 // Connection mode remains selected and the inspector stays on the target.
 S.selected=new Set([id]);renderAll();$('canvas').focus({preventScroll:true});
}
// BEGIN MODULE fast-edit.js
// Focused creation flows. These functions share the app's model and undo system.
function inheritedDirection(id){
 for(const p of [id,...ancestors(id)]){const d=D.layout.containers[p]?.direction;if(d&&d!=='inherit')return d;}
 return D.settings.direction;
}
function revealObject(id){
 const r=objectRect(id),c=D.camera,w=$('stage').clientWidth,h=$('stage').clientHeight,pad=42;
 if(r.x*c.k+c.x<pad)c.x=pad-r.x*c.k;
 if((r.x+r.w)*c.k+c.x>w-pad)c.x=w-pad-(r.x+r.w)*c.k;
 if(r.y*c.k+c.y<pad)c.y=pad-r.y*c.k;
 if((r.y+r.h)*c.k+c.y>h-pad)c.y=h-pad-(r.y+r.h)*c.k;
 applyCamera();
}
function freePosition(rect,parentId,side='right',ignored=[]){
 const exclusions=new Set([parentId,...(parentId?ancestors(parentId):[]),...ignored]);
 const occupied=[...D.graph.nodes,...D.graph.groups].filter(n=>!exclusions.has(n.id)&&!ancestors(n.id).some(a=>exclusions.has(a)&&ignored.includes(a))).map(n=>objectRect(n.id));
 const base={...rect};
 // Try near the requested location first, then alternate around it. Never move existing objects.
 for(let i=0;i<140;i++){const sign=i%2?1:-1,step=Math.ceil(i/2),vertical=side==='left'||side==='right';
  const r={...base,x:base.x+(vertical?0:sign*step*(base.w+D.settings.nodeGap)),y:base.y+(vertical?sign*step*(base.h+D.settings.nodeGap):0)};
  if(!occupied.some(o=>overlap(r,o,12)))return r;
 }
 return {...base,y:base.y+140*(base.h+D.settings.nodeGap)};
}
function rawFastNode({from=null,siblingOf=null,side=null,at=null,title='Next step',parentId=undefined,style=undefined}={}){
 const reference=node(siblingOf||from),dir=reference?inheritedDirection(reference.id):D.settings.direction;
 side||=dir==='DOWN'?'bottom':'right';
 const w=164,h=56,r=reference?geometryNode(reference.id):null,gap=Math.max(40,D.settings.rankGap);
 let x=at?at.x-w/2:r?r.x+r.w+gap:canvasCenter().x-w/2,y=at?at.y-h/2:r?r.y+(r.h-h)/2:canvasCenter().y-h/2;
 if(r&&!at){if(side==='left')x=r.x-gap-w;if(side==='bottom'||side==='top'){x=r.x+(r.w-w)/2;y=side==='bottom'?r.y+r.h+gap:r.y-gap-h;}
  if(siblingOf){x=r.x+(dir==='DOWN'?r.w+D.settings.nodeGap:0);y=r.y+(dir==='DOWN'?0:r.h+D.settings.nodeGap);}}
 if(parentId===undefined)parentId=reference?.parentId||null;
 const pos=freePosition({x,y,w,h},parentId,side),id=uid('n');
 D.graph.nodes.push({id,title,...(parentId?{parentId}:{})});D.layout.nodes[id]={...pos,manual:false,pinned:false};D.styles[id]={shape:'box',color:reference?styleFor(reference).color:'blue',icon:'',...style};
 const sources=siblingOf?D.graph.edges.filter(e=>e.to===siblingOf&&e.from!==siblingOf).map(e=>e.from):from?[from]:[];
 for(const source of new Set(sources)){const eid=uid('e');D.graph.edges.push({id:eid,from:source,to:id,label:'',directed:true,emphasis:false,dashed:false});D.layout.edges[eid]={fromSide:'auto',toSide:'auto'};}
 ensureParentFits(id);return id;
}
function quickExtend({side=null,sibling=false,at=null,from=null}={}){
 finishInlineEdit(true);if(S.preview)acceptLayoutPreview();
 const picked=[...S.selected][0];
 if(edge(picked)&&!from&&!sibling&&!at)return insertStep(picked);
 const selected=from||[...S.selected].find(node),selectedGroup=[...S.selected].find(group);
 const before=snapshot();let parentId;
 if(at)parentId=dropTarget('',{x:at.x-82,y:at.y-28,w:164,h:56})?.id||null;
 else if(!selected&&selectedGroup){parentId=selectedGroup;const p=geometryNode(selectedGroup),pad=D.layout.containers[selectedGroup]?.padding||24;at={x:p.x+pad+82,y:p.y+pad+56};}
 const id=rawFastNode({from:sibling?null:selected,siblingOf:sibling?selected:null,side,at,parentId,title:sibling?'Another branch':'Next step'});
 S.selected=new Set([id]);S.connectFrom=null;remember(before,sibling?'Add sibling branch':'Add connected shape');renderAll();revealObject(id);startInlineEdit(id);return id;
}
function insertStep(edgeId,at=null){
 const e=edge(edgeId);if(!e)return;
 finishInlineEdit(true);if(S.preview)acceptLayoutPreview();const before=snapshot(),cfg=clone(D.layout.edges[e.id]||{}),route=S.lastRoutes.find(r=>r.id===edgeId);
 const candidates=route?.points?.slice(1).map((b,i)=>({a:route.points[i],b,len:dist(route.points[i],b)})).sort((a,b)=>b.len-a.len)||[];
 const target=at||(candidates[0]?{x:(candidates[0].a.x+candidates[0].b.x)/2,y:(candidates[0].a.y+candidates[0].b.y)/2}:center(geometryNode(e.from)));
 const common=[node(e.from)?.parentId,...ancestors(e.from)].find(id=>id&&ancestors(e.to).includes(id))||null;
 const id=rawFastNode({at:target,parentId:common,title:'New step',style:{color:styleFor(node(e.from)).color}}),to=e.to;
 e.to=id;D.layout.edges[e.id]={fromSide:cfg.fromSide||'auto',toSide:'auto'};
 const eid=uid('e');D.graph.edges.push({...clone(e),id:eid,from:id,to,label:''});D.layout.edges[eid]={fromSide:'auto',toSide:cfg.toSide||'auto'};
 S.selected=new Set([id]);remember(before,'Insert connected step');renderAll();revealObject(id);startInlineEdit(id);return id;
}
function quickBuildDialog(text=''){
 const source=[...S.selected].find(node),container=[...S.selected].find(group);
 openDialog('Build from a list',`<p class="note">One title per line. Add a connected flow or several branches in one action.</p><label class="field"><span>Shape titles</span><textarea id="quick-lines" rows="9" aria-label="Shape titles" placeholder="Receive request\nCheck details\nApprove\nPublish"></textarea></label><div class="fields-2"><label class="field"><span>Connections</span><select id="quick-mode"><option value="chain">Sequential flow</option><option value="branches">Branches from first shape</option><option value="none">Unconnected shapes</option></select></label><label class="field"><span>Container title (optional)</span><input id="quick-container" placeholder="e.g. Review" aria-label="Container title for new shapes"></label></div>${source?`<label class="checkbox"><input id="quick-continue" type="checkbox" checked>Continue from ${esc(node(source).title)}</label>`:container?`<p class="note">New shapes go inside ${esc(group(container).title)}.</p>`:''}<p id="quick-count" class="note">Up to 60 titles. Ctrl / Cmd + Enter builds the diagram. One undo restores the starting point.</p>`,`<button data-action="close-dialog">Cancel</button><button class="primary" id="quick-create">Build diagram</button>`);
 $('quick-lines').value=text;$('quick-lines').focus();
 const build=()=>{const lines=$('quick-lines').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!lines.length||lines.length>60){$('quick-count').textContent='Enter between 1 and 60 nonempty titles.';return;}
  const mode=$('quick-mode').value,title=$('quick-container').value.trim(),attach=$('quick-continue')?.checked?source:null;closeDialog();fastBuild(lines,{mode,title,source:attach,parentId:container});};
 $('quick-create').onclick=build;listen($('quick-lines'), 'keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();build();}});
}
function fastBuild(lines,{mode='chain',title='',source=null,parentId=null}={}){
 if(!Array.isArray(lines)||lines.length<1||lines.length>60||lines.some(s=>typeof s!=='string'||!s.trim()))throw Error('Provide 1–60 nonempty titles.');
 if(!['chain','branches','none'].includes(mode))throw Error('Unknown quick-build mode.');
 if(source&&!node(source)||parentId&&!group(parentId))throw Error('Quick-build context no longer exists.');
 if(S.preview)acceptLayoutPreview();finishInlineEdit(true);const before=snapshot(),ids=[],start=source?geometryNode(source):null,origin=canvasCenter();
 parentId||=node(source)?.parentId||null;
 const frame=parentId?geometryNode(parentId):null;
 const columns=Math.max(2,Math.min(5,Math.floor(($('stage').clientWidth-100)/212))),base={x:start?start.x+start.w+52:frame?frame.x+24:origin.x-164,y:start?start.y:frame?frame.y+56:origin.y-80};
 for(const [i,line] of lines.entries()){
  const from=mode==='chain'?(ids.at(-1)||source):mode==='branches'?(source||ids[0]):null;
  const at={x:base.x+(i%columns)*224+82,y:base.y+Math.floor(i/columns)*156+28};
  ids.push(rawFastNode({title:line.trim(),from,parentId,at}));
 }
 if(title){const r=rectUnion(ids.map(objectRect)),gid=uid('g');D.graph.groups.push({id:gid,title,...(parentId?{parentId}:{})});D.layout.nodes[gid]={x:r.x-24,y:r.y-52,w:r.w+48,h:r.h+76,manual:false,pinned:false};D.layout.containers[gid]={direction:'inherit',padding:24,manualSize:true};D.styles[gid]={shape:'box',color:'violet',icon:''};ids.forEach(id=>node(id).parentId=gid);ensureParentFits(gid);S.selected=new Set([gid]);}
 else S.selected=new Set(ids);
 remember(before,'Build '+lines.length+' shapes');renderAll();fitView();toast(`${lines.length} shapes created · ${mode==='none'?'no connections':mode==='chain'?'connected flow':'branches'} · one undo`);console.info('[quick-build]',{nodes:lines.length,mode,container:!!title});return ids;
}
function reroute({auto=false}={}){
 finishInlineEdit(true);if(auto){const selectedEdges=[...S.selected].filter(edge);const ids=selectedEdges.length?selectedEdges:D.graph.edges.filter(e=>S.selected.has(e.from)||S.selected.has(e.to)).map(e=>e.id);
  if(!ids.length){toast('Select connections or shapes to release their fixed ports.');return;}
  change('Use automatic ports',()=>{for(const id of ids){const cfg=D.layout.edges[id]||={};cfg.fromSide='auto';cfg.toSide='auto';}});
 }
 S.routeCache=null;S.lastRoutes=[];renderScene();renderInspector();const r=S.routingReport;toast(`Routes refreshed · ${r?.crossings||0} crossings · ${r?.lanePairs||0} close lane pairs · ${r?.blocked||0} obstructed · shapes unchanged`);console.info('[routing]',r);return clone(r);
}
function routingMenu(){
 const s=D.settings.routing||RouteLab.defaults;
 const num=(label,key,min,max,help)=>`<label class="lab-field"><span>${label}<output data-route-output="${key}">${s[key]}</output></span><input type="range" min="${min}" max="${max}" value="${s[key]}" data-route-setting="${key}" aria-label="${label}"><small>${help}</small></label>`;
 showPopover($('routing-options-btn'),`<div class="route-menu"><div class="menu-heading">Automatic connections</div><p class="note">Choose source and target sides together. Shapes never move.</p><div class="fields-2"><button data-route-preset="balanced">Balanced</button><button data-route-preset="separate">Fewer crossings</button></div>${num('Crossing cost','crossingPenalty',0,1200,'Higher values prefer detours over crossings.')}${num('Bend cost','bendPenalty',0,100,'Higher values prefer simpler routes.')}${num('Shape clearance','clearance',4,30,'World pixels around shapes and unrelated containers.')}${num('Parallel edge gap','edgeGap',4,48,'Preferred world-pixel buffer between parallel runs, independent of port spacing.')}${num('Lane separation cost','parallelPenalty',0,60,'Higher values spend more route length to keep lanes apart.')}${num('Corner radius','cornerRadius',0,16,'Rounded orthogonal corners; zero keeps square corners.')}${num('Port spacing','portGap',6,28,'Minimum preferred separation on a shape side.')}${num('Spread fan-out','fanoutPenalty',0,160,'Prefer different sides for independent branches when the detour is short.')}${num('Keep previous sides','portStability',0,150,'Damps port switching; never locks an automatic side.')}<details><summary>Advanced routing</summary>${num('Shared-path cost','sharedPenalty',0,20,'Penalty per world pixel of a reused route segment.')}${num('Routing passes','passes',1,5,'One initial routing pass, followed by up to four conflict-repair passes.')}</details><button class="primary full" data-action="compare-routes">Compare ports & routes</button><button class="full" data-action="reroute">Reroute now <kbd>Alt R</kbd></button><button class="full ghost" data-action="auto-ports">Use auto ports on selection</button><p class="note" id="routing-summary">${S.routingReport?.crossings||0} crossings · ${S.routingReport?.lanePairs||0} close lane pairs · ${S.routingReport?.bends||0} bends · ${S.routingReport?.milliseconds||0} ms</p></div>`);
}
// The submit chord works from any builder field, not only its multiline input.
listen($('main-dialog'), 'cancel',()=>{queueMicrotask(()=>setTool('select'));});
listen($('main-dialog'), 'keydown',e=>{
 if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&$('quick-create')){e.preventDefault();e.stopPropagation();$('quick-create').click();}
});
// END MODULE fast-edit.js
function addConnected(){return quickExtend();}
function startInlineEdit(id){
 const n=entity(id);if(!n)return;finishInlineEdit(true);S.connectFrom=null;S.drag=null;
 let at,w=180,h=44;
 if(edge(id)){const route=S.lastRoutes.find(r=>r.id===id),points=route?.points||[{x:0,y:0}],p=route?.label||points[Math.floor(points.length/2)];at={x:p.x,y:p.y};}
 else{const r=objectRect(id),l=group(id)?{x:r.w/2,y:17,width:r.w-70,height:20}:labelLayout(n,r);at={x:r.x+l.x,y:r.y+l.y};w=clamp(l.width*D.camera.k+22,140,420);h=Math.max(42,l.height*D.camera.k+16);}
 const input=document.createElement('textarea');input.className='inline-edit';input.setAttribute('aria-label',edge(id)?'Edit connection label':group(id)?'Edit container title':'Edit node title');input.value=edge(id)?n.label:n.title;input.style.width=w+'px';input.style.height=h+'px';input.style.left=clamp(at.x*D.camera.k+D.camera.x-w/2,5,Math.max(5,$('stage').clientWidth-w-5))+'px';input.style.top=clamp(at.y*D.camera.k+D.camera.y-h/2,5,$('stage').clientHeight-h-5)+'px';
 S.inline={id,input};$('stage').appendChild(input);input.focus();input.select();
 listen(input, 'keydown',e=>{e.stopPropagation();if(e.isComposing)return;if(e.key==='Tab'){e.preventDefault();const edited=id;finishInlineEdit(true);S.selected=new Set([edited]);if(node(edited)||edge(edited))quickExtend({sibling:e.shiftKey});else $('canvas').focus();return;}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finishInlineEdit(true);$('canvas').focus();}if(e.key==='Escape'){e.preventDefault();finishInlineEdit(false);setTool('select');$('canvas').focus();}});listen(input, 'blur',()=>finishInlineEdit(true));
}
function finishInlineEdit(commit=true){
 if(!S.inline)return;const {id,input}=S.inline;S.inline=null;const value=input.value.trim(),n=entity(id);input.remove();if(!commit||!n)return;
 const key=edge(id)?'label':'title',text=edge(id)?value:value||'Untitled';if(n[key]===text)return;
 change('Edit label',()=>{n[key]=text;if(node(id)){const p=geometryNode(id),label=labelLayout(n,p);if(label.mode==='center'&&label.height+20>p.h)p.h=label.height+20;ensureParentFits(id);}});
}
function cleanupDeleted(ids){
 D.graph.edges=D.graph.edges.filter(e=>!ids.has(e.id)&&!ids.has(e.from)&&!ids.has(e.to));D.graph.nodes=D.graph.nodes.filter(n=>!ids.has(n.id));D.graph.groups=D.graph.groups.filter(g=>!ids.has(g.id));
 const kept=new Set(allEntities().map(n=>n.id));for(const key of ['nodes','edges','labels','containers'])for(const id of Object.keys(D.layout[key]))if(!kept.has(id))delete D.layout[key][id];for(const id of Object.keys(D.styles))if(!kept.has(id))delete D.styles[id];D.collapsed=D.collapsed.filter(id=>kept.has(id));for(const role of ['start','end'])if(D.layout.intent?.[role]&&!kept.has(D.layout.intent[role].id))delete D.layout.intent[role];S.selected.clear();S.connectFrom=null;
}
function deleteSelection(deep=false){
 if(!S.selected.size)return;const ids=new Set(S.selected);
 change(deep?'Delete with contents':'Delete selection',()=>{for(const id of [...ids])if(group(id)){if(deep)descendants(id).forEach(n=>ids.add(n));else children(id).forEach(n=>{const p=group(id).parentId;if(p)n.parentId=p;else delete n.parentId;});}cleanupDeleted(ids);});
}
function addContainer(rect,{roots=[],parentId=null,title='Container'}={}){
 const id=uid('g');change('Create container',()=>{D.graph.groups.push({id,title,...(parentId?{parentId}:{})});D.layout.nodes[id]={...rect,manual:false,pinned:false};D.layout.containers[id]={direction:'inherit',padding:24,manualSize:true};D.styles[id]={shape:'box',color:'violet',icon:''};roots.forEach(n=>{entity(n).parentId=id;});fitContainer(id,{shrink:false});ensureParentFits(id);S.selected=new Set([id]);});return id;
}
function wrapSelection(){
 const roots=selectionRoots();if(!roots.length){const c=canvasCenter();return addContainer({x:c.x-170,y:c.y-120,w:340,h:240});}
 const b=rectUnion(roots.map(objectRect)),parents=[...new Set(roots.map(id=>entity(id).parentId||null))],parentId=parents.length===1?parents[0]:null;
 return addContainer({x:b.x-28,y:b.y-56,w:b.w+56,h:b.h+84},{roots,parentId});
}
function ungroupSelection(){
 const ids=new Set([...S.selected].filter(group));if(!ids.size)return;
 change('Ungroup',()=>{for(const id of ids){const p=group(id).parentId;for(const n of children(id)){if(p&&!ids.has(p))n.parentId=p;else delete n.parentId;}}cleanupDeleted(ids);});
}
function setPinned(value){
 const ids=selectionRoots();if(!ids.length)return;
 change(value?'Pin objects':'Unpin objects',()=>{for(const id of ids)D.layout.nodes[id].pinned=value;});
}
function arrangeSelection(kind){
 const ids=selectionRoots();if(ids.length<2){toast('Select two or more objects.');return;}
 const positions=ids.map(id=>({id,...objectRect(id)})),b=rectUnion(positions);
 change('Align objects',()=>{
  if(kind==='distribute-x'||kind==='distribute-y'){
   const axis=kind.endsWith('x')?'x':'y',size=axis==='x'?'w':'h';positions.sort((a,b)=>a[axis]-b[axis]);const total=positions.reduce((sum,p)=>sum+p[size],0),span=positions.at(-1)[axis]+positions.at(-1)[size]-positions[0][axis],gap=Math.max(12,(span-total)/(positions.length-1));let offset=positions[0][axis];for(const p of positions){moveObject(p.id,axis==='x'?offset-p.x:0,axis==='y'?offset-p.y:0,{manual:true});offset+=p[size]+gap;}return;
  }
  for(const p of positions){const dx=kind==='left'?b.x-p.x:kind==='center'?b.x+b.w/2-p.x-p.w/2:0,dy=kind==='top'?b.y-p.y:kind==='middle'?b.y+b.h/2-p.y-p.h/2:0;moveObject(p.id,dx,dy,{manual:true});ensureParentFits(p.id);}
 });
}
function changeField(input){
 const path=input.dataset.field,id=[...S.selected][0],n=entity(id),raw=input.type==='checkbox'?input.checked:input.value;
 if(input.type==='number'&&(raw===''||!Number.isFinite(Number(raw)))){toast('Enter a finite number.');renderInspector();return;}
 const value=input.type==='number'?Number(raw):raw;
 change('Edit '+path.split('.').at(-1),()=>{
  if(path.startsWith('setting.')){D.settings[path.slice(8)]=value;return;}if(!n)return;
  if(path.startsWith('intent.')){const role=path.slice(7);if(D.layout.intent?.[role]?.id===id&&Object.hasOwn(INTENT_LABELS,value))D.layout.intent[role].placement=value;return;}
  if(path.startsWith('layout.')){const key=path.slice(7),p=D.layout.nodes[id];if(key==='x'||key==='y'){moveObject(id,key==='x'?value-p.x:0,key==='y'?value-p.y:0,{manual:true});ensureParentFits(id);return;}
   if(key==='w'||key==='h'){const r=resizeRect(id,p,key==='w'?value-p.w:0,key==='h'?value-p.h:0,'se');Object.assign(p,r);if(group(id))D.layout.containers[id].manualSize=true;ensureParentFits(id);return;}
   p[key]=value;return;
  }
  if(path.startsWith('style.')){const k=path.slice(6);D.styles[id][k]=value;if(k==='shape'&&value==='icon'){D.styles[id].icon||='user';D.layout.nodes[id].w=80;D.layout.nodes[id].h=80;}if(k==='shape'&&value==='diamond'){D.layout.nodes[id].w=Math.max(D.layout.nodes[id].w,132);D.layout.nodes[id].h=Math.max(D.layout.nodes[id].h,100);}return;}
  if(path.startsWith('label.')){const k=path.slice(6),cfg=D.layout.labels[id]||={};cfg[k]=value;if(k==='mode'){cfg.dx=0;cfg.dy=0;if(value==='detached'){cfg.dx=130;cfg.dy=-60;cfg.leader=true;}}return;}
  if(path.startsWith('edge.')){(D.layout.edges[id]||={})[path.slice(5)]=value;return;}
  if(path.startsWith('container.')){const k=path.slice(10);D.layout.containers[id][k]=k==='padding'?clamp(Number(value),12,80):value;return;}
  if(path==='parentId'){if(value)n.parentId=value;else delete n.parentId;ensureParentFits(id);return;}
  if(path==='title')n.title=value.trim()||'Untitled';else n[path]=value;
 });
}
function toggleCollapse(id){if(!group(id))return;change('Toggle container',()=>{const index=D.collapsed.indexOf(id);if(index<0)D.collapsed.push(id);else D.collapsed.splice(index,1);});}


function makeClipboard(){
 const ids=new Set(S.selected);for(const id of S.selected)if(group(id))descendants(id).forEach(n=>ids.add(n));
 const nodes=D.graph.nodes.filter(n=>ids.has(n.id)),groups=D.graph.groups.filter(n=>ids.has(n.id));
 const edges=D.graph.edges.filter(e=>ids.has(e.id)||(ids.has(e.from)&&ids.has(e.to)));edges.forEach(e=>ids.add(e.id));
 const v=board(),part={kind:'diagram-studio/clipboard',nodes:clone(nodes),groups:clone(groups),edges:clone(edges),layout:{},styles:{}};
 for(const key of ['nodes','edges','labels','containers'])part.layout[key]=Object.fromEntries(Object.entries(v.layout[key]).filter(([id])=>ids.has(id)).map(([id,value])=>[id,clone(value)]));
 part.styles=Object.fromEntries(Object.entries(v.styles).filter(([id])=>ids.has(id)).map(([id,value])=>[id,clone(value)]));return part;
}
function copySelection(){if(!S.selected.size)return null;S.clipboard=makeClipboard();toast('Copied '+(S.clipboard.nodes.length+S.clipboard.groups.length+S.clipboard.edges.length)+' objects');return S.clipboard;}
function pasteFragment(part=S.clipboard){
 if(!part||part.kind!=='diagram-studio/clipboard'){toast('Copy some objects first, or import JSON.');return;}
 const all=[...part.nodes,...part.groups,...part.edges],ids=new Map(all.map(n=>[n.id,uid(part.groups.includes(n)?'g':part.edges.includes(n)?'e':'n')]));
 // Validate the final document before exposing any imported fragment.
 const candidate=clone(D),selected=[];
 for(const n of part.nodes){const next=clone(n);next.id=ids.get(n.id);next.parentId=ids.get(n.parentId)||(candidate.graph.groups.some(g=>g.id===n.parentId)?n.parentId:undefined);candidate.graph.nodes.push(next);selected.push(next.id);}
 for(const g of part.groups){const next=clone(g);next.id=ids.get(g.id);next.parentId=ids.get(g.parentId)||(candidate.graph.groups.some(c=>c.id===g.parentId)?g.parentId:undefined);candidate.graph.groups.push(next);selected.push(next.id);}
 for(const e of part.edges){const from=ids.get(e.from)||e.from,to=ids.get(e.to)||e.to;if(!candidate.graph.nodes.some(n=>n.id===from)||!candidate.graph.nodes.some(n=>n.id===to))continue;candidate.graph.edges.push({...clone(e),id:ids.get(e.id),from,to});}
 for(const v of [candidate]){for(const [oldId,newId] of ids){for(const key of ['nodes','edges','labels','containers'])if(part.layout?.[key]?.[oldId]){const value=clone(part.layout[key][oldId]);if(key==='nodes'){value.x+=32;value.y+=32;value.pinned=false;value.manual=true;}if(key==='edges'&&value.waypoints)value.waypoints=value.waypoints.map(p=>({x:p.x+32,y:p.y+32}));v.layout[key][newId]=value;}if(part.styles?.[oldId])v.styles[newId]=clone(part.styles[oldId]);}}
 const valid=normalize(candidate);change('Paste objects',()=>{D=valid;S.selected=new Set(selected.length?selected:[...ids.values()].filter(id=>edge(id)));});
}
function duplicateSelection(){if(!S.selected.size)return;pasteFragment(makeClipboard());toast('Duplicated selection');}


function addWaypoint(id,point){
 const route=S.lastRoutes.find(r=>r.id===id);if(!route)return;
 const current=board().layout.edges[id]?.waypoints||[];if(current.length>=40){toast('Use at most 40 waypoints per edge.');return;}
 const p=point||{x:route.label?.x??(route.points[0].x+route.points.at(-1).x)/2,y:(route.label?.y??(route.points[0].y+route.points.at(-1).y)/2)+38};
 if(D.graph.nodes.some(n=>inside(p,geometryNode(n.id),4))){toast('Place a waypoint outside a node.');return;}
 change('Add waypoint',()=>{const cfg=board().layout.edges[id]||={};(cfg.waypoints||=[]).push({x:rounded(p.x),y:rounded(p.y)});S.selected=new Set([id]);});
}


function startDrag(kind,event,extra={}){
 const p=screenToWorld(event.clientX,event.clientY);S.drag={kind,start:p,current:p,startClient:{x:event.clientX,y:event.clientY},camera:clone(D.camera),before:snapshot(),moved:false,pointerId:event.pointerId,...extra};
 try{$('canvas').setPointerCapture(event.pointerId);}catch{}
}
function onPointerDown(e){
 if(e.pointerType==='touch'&&beginTouches(e)){e.preventDefault();return;}
 if(typeof controllers.sculpt.sculptPointerDown==='function'&&controllers.sculpt.sculptPointerDown(e))return;
 if(e.metaKey||e.ctrlKey){startZoomDrag(e);return;}
 if(e.button>1)return;if(S.inline){finishInlineEdit(true);return;}
 closePopover();const t=e.target,pos=screenToWorld(e.clientX,e.clientY);S.pointer=pos;
 const n=t.closest('[data-node]'),g=t.closest('[data-group]'),edgeEl=t.closest('[data-edge]'),port=t.closest('[data-port]');
 if(e.button===1||S.space){e.preventDefault();startDrag('pan',e);$('stage').classList.add('is-dragging');return;}
 const qa=t.closest('[data-quick-add]');if(qa){e.preventDefault();S.selected=new Set([qa.dataset.quickOwner]);quickExtend({side:qa.dataset.quickAdd});return;}
 const special=t.closest('[data-resize],[data-collapse],[data-waypoint]');
 if(S.tool==='pan'&&!e.shiftKey&&!special){e.preventDefault();startDrag('pan',e,{clickId:n?.dataset.node||g?.dataset.group||edgeEl?.dataset.edge});$('stage').classList.add('is-dragging');return;}
 if(S.preview)acceptLayoutPreview();
 const collapse=t.closest('[data-collapse]');if(collapse){e.preventDefault();toggleCollapse(collapse.dataset.collapse);return;}
 const resize=t.closest('[data-resize]');if(resize){e.preventDefault();const id=resize.dataset.resize;startDrag('resize',e,{id,handle:resize.dataset.handle||'se',rect:clone(D.layout.nodes[id])});return;}
 if(['box','circle','diamond','text','container'].includes(S.tool)){e.preventDefault();startDrag('draw',e,{shape:S.tool});return;}
 const waypoint=t.closest('[data-waypoint]');if(waypoint){e.preventDefault();const id=waypoint.dataset.waypoint,index=Number(waypoint.dataset.index);startDrag('waypoint',e,{id,index,point:clone(D.layout.edges[id].waypoints[index]),doubleCandidate:S.lastClick?.id===id&&S.lastClick.index===index&&performance.now()-S.lastClick.time<350});return;}
 const edgeLabel=t.closest('[data-edge-label]');if(edgeLabel&&e.altKey){e.preventDefault();const id=edgeLabel.dataset.edgeLabel;startDrag('edge-label',e,{id,offset:clone(D.layout.edges[id]||{})});return;}
 if(n&&(S.tool==='connect'||S.connectFrom)){
  e.preventDefault();const id=n.dataset.node;
  if(S.connectFrom){completeConnection(id,e.altKey?(port?.dataset.port||'auto'):'auto');return;}
  S.connectFrom={id,side:e.altKey?(port?.dataset.port||'auto'):'auto'};S.selected=new Set([id]);startDrag('connect',e);renderAll();return;
 }
 if(port){e.preventDefault();const id=port.dataset.owner;S.connectFrom={id,side:e.altKey?port.dataset.port:'auto'};S.selected=new Set([id]);startDrag('connect',e);renderAll();return;}
 if(n||g){
  e.preventDefault();const id=n?.dataset.node||g.dataset.group;
  const doubleCandidate=!e.shiftKey&&S.lastClick?.id===id&&performance.now()-S.lastClick.time<380&&Math.hypot(e.clientX-S.lastClick.x,e.clientY-S.lastClick.y)<7;
  if(e.shiftKey){if(S.selected.has(id))S.selected.delete(id);else S.selected.add(id);}else if(!S.selected.has(id))S.selected=new Set([id]);
  if(!S.selected.has(id)){renderAll();return;}
  const roots=selectionRoots(),moving=new Set(roots);for(const id of roots)if(group(id))descendants(id).forEach(n=>moving.add(n));
  const positions=Object.fromEntries([...moving].map(id=>[id,clone(D.layout.nodes[id])])),groupBounds=new Map(D.graph.groups.map(g=>[g.id,clone(groupRect(g.id))]));
  startDrag('objects',e,{id,roots,moving,positions,groupBounds,initialGroupBounds:new Map([...groupBounds].map(([id,r])=>[id,clone(r)])),refRect:clone(objectRect(id)),keepParent:e.altKey,doubleCandidate});renderAll();return;
 }
 if(edgeEl){e.preventDefault();const id=edgeEl.dataset.edge;startDrag('edge-click',e,{id,doubleCandidate:S.lastClick?.id===id&&performance.now()-S.lastClick.time<350});selectItems([id],{add:e.shiftKey,toggle:e.shiftKey});return;}
 e.preventDefault();if(S.tool==='connect'){if(S.connectFrom){quickExtend({from:S.connectFrom.id,at:screenToWorld(e.clientX,e.clientY)});}else{S.connectFrom=null;renderScene();}return;}
 if(!e.shiftKey&&S.tool!=='select'){startDrag('pan',e);return;} if(!e.shiftKey&&S.tool==='select'){startDrag('pan',e);return;} const previousSelection=e.shiftKey?new Set(S.selected):new Set();startDrag('marquee',e,{previousSelection});renderAll();$('canvas').focus({preventScroll:true});
}
function onPointerMove(e){
 if(e.pointerType==='touch'&&moveTouches(e)){e.preventDefault();return;}
 if(typeof controllers.sculpt.sculptPointerMove==='function'&&controllers.sculpt.sculptPointerMove(e))return;
 if(modifierMove(e))return;
 S.pointer=screenToWorld(e.clientX,e.clientY);const d=S.drag;if(!d){if(S.connectFrom)renderOverlay();return;}
 d.current=S.pointer;const dx=d.current.x-d.start.x,dy=d.current.y-d.start.y;
 if(Math.hypot(e.clientX-d.startClient.x,e.clientY-d.startClient.y)>3)d.moved=true;
 if(d.kind==='zoom'){const k=clamp(d.camera.k*Math.exp((d.startClient.y-e.clientY)*.008),.08,4),r=$('canvas').getBoundingClientRect();D.camera={x:d.startClient.x-r.left-d.zoomWorld.x*k,y:d.startClient.y-r.top-d.zoomWorld.y*k,k};applyCamera();return;}
 if(d.kind==='pan'){D.camera.x=d.camera.x+e.clientX-d.startClient.x;D.camera.y=d.camera.y+e.clientY-d.startClient.y;applyCamera();return;}
 if(d.kind==='connect'||d.kind==='draw'){renderOverlay();return;}
 if(d.kind==='marquee'){
  const r={x:Math.min(d.start.x,d.current.x),y:Math.min(d.start.y,d.current.y),w:Math.abs(dx),h:Math.abs(dy)};S.selected=new Set(d.previousSelection);
  if(d.moved){for(const n of visibleGraph().nodes)if(overlap(geometryNode(n.id),r))S.selected.add(n.id);for(const g of visibleGraph().groups){const p=groupRect(g.id);if(inside({x:p.x,y:p.y},r)&&inside({x:p.x+p.w,y:p.y+p.h},r)){S.selected.add(g.id);descendants(g.id).forEach(id=>S.selected.delete(id));}}}renderScene();return;
 }
 if(!d.moved)return;
 if(d.kind==='objects'){
  let xdelta=dx,ydelta=dy;d.guides=[];
  if(D.settings.snap&&!e.ctrlKey&&!e.metaKey){const r=d.refRect,c=center({...r,x:r.x+dx,y:r.y+dy});for(const n of visibleGraph().nodes){if(d.moving.has(n.id))continue;const p=geometryNode(n.id),o=center(p),tol=5/D.camera.k;
   if(Math.abs(c.x-o.x)<tol&&!d.guides.some(g=>g.axis==='x')){xdelta+=o.x-c.x;d.guides.push({axis:'x',value:o.x,from:Math.min(p.y,r.y+dy)-30,to:Math.max(p.y+p.h,r.y+dy+r.h)+30});}
   if(Math.abs(c.y-o.y)<tol&&!d.guides.some(g=>g.axis==='y')){ydelta+=o.y-c.y;d.guides.push({axis:'y',value:o.y,from:Math.min(p.x,r.x+dx)-30,to:Math.max(p.x+p.w,r.x+dx+r.w)+30});}
  }}
  for(const [id,p] of Object.entries(d.positions))D.layout.nodes[id]={...p,x:rounded(p.x+xdelta),y:rounded(p.y+ydelta)};
  for(const id of d.moving)if(group(id)){const r=d.initialGroupBounds.get(id);d.groupBounds.set(id,{...r,x:r.x+xdelta,y:r.y+ydelta});}
  d.keepParent=e.altKey;d.dropId=d.roots.length===1?dropTarget(d.id,D.layout.nodes[d.id],d.groupBounds)?.id:null;
 }else if(d.kind==='resize'){
  D.layout.nodes[d.id]=resizeRect(d.id,d.rect,dx,dy,d.handle,e.shiftKey);if(group(d.id))D.layout.containers[d.id].manualSize=true;
 }else if(d.kind==='waypoint')D.layout.edges[d.id].waypoints[d.index]={x:rounded(d.point.x+dx),y:rounded(d.point.y+dy)};
 else if(d.kind==='edge-label'){const cfg=D.layout.edges[d.id]||={};cfg.labelDx=rounded((d.offset.labelDx||0)+dx);cfg.labelDy=rounded((d.offset.labelDy||0)+dy);}
 renderScene();
}
function finishDrag(event){
 if(typeof controllers.sculpt.sculptPointerUp==='function'&&controllers.sculpt.sculptPointerUp(event))return;
 const d=S.drag;if(!d)return;S.drag=null;$('stage').classList.remove('is-dragging');
 if(d.kind==='connect'){
  const target=event?document.elementFromPoint(event.clientX,event.clientY):null,n=target?.closest('[data-node]'),port=target?.closest('[data-port]');
  if(d.moved&&n)completeConnection(n.dataset.node,event.altKey?(port?.dataset.port||'auto'):'auto');else if(d.moved&&event&&target?.closest('#canvas')&&S.connectFrom){quickExtend({from:S.connectFrom.id,at:screenToWorld(event.clientX,event.clientY)});}else if(d.moved){S.connectFrom=null;renderAll();}else renderAll();return;
 }
 if(d.kind==='zoom'){persist();return;}
 if(d.kind==='pan'){if(d.moved)persist();else if(d.clickId)selectItems([d.clickId]);else{S.selected.clear();renderAll();}return;}
 if(d.kind==='marquee'){renderAll();return;}
 if(d.kind==='draw'){
  const r=d.moved?{x:Math.min(d.start.x,d.current.x),y:Math.min(d.start.y,d.current.y),w:Math.max(40,Math.abs(d.current.x-d.start.x)),h:Math.max(28,Math.abs(d.current.y-d.start.y))}:{x:d.start.x-82,y:d.start.y-28,w:164,h:56};
  S.tool='select';$('stage').dataset.tool='select';
  if(d.shape==='container'){
   if(!d.moved){r.x=d.start.x-170;r.y=d.start.y-120;r.w=340;r.h=240;}r.w=Math.max(180,r.w);r.h=Math.max(120,r.h);
   const parent=D.graph.groups.filter(g=>inside({x:r.x,y:r.y},groupRect(g.id))&&inside({x:r.x+r.w,y:r.y+r.h},groupRect(g.id))).sort((a,b)=>ancestors(b.id).length-ancestors(a.id).length)[0];
   const roots=children(parent?.id).filter(n=>{const p=objectRect(n.id);return inside({x:p.x,y:p.y},r)&&inside({x:p.x+p.w,y:p.y+p.h},r);}).map(n=>n.id);
   const id=addContainer(r,{roots,parentId:parent?.id});startInlineEdit(id);
  }else{const target=dropTarget('',r);addNode({title:d.shape==='text'?'Text':'New box',style:{shape:d.shape,icon:'',color:d.shape==='text'?'slate':'blue'},position:{x:r.x,y:r.y},w:r.w,h:r.h,...(target?{parentId:target.id}:{})},center(r),{edit:true});}
  renderOverlay();return;
 }
 if(!d.moved){
  if(d.doubleCandidate){S.suppressDblUntil=performance.now()+450;S.lastClick=null;if(d.kind==='waypoint')change('Remove bend',()=>D.layout.edges[d.id].waypoints.splice(d.index,1));else if(d.kind==='edge-click')addWaypoint(d.id,d.start);else startInlineEdit(d.id);return;}
  if(d.id&&event)S.lastClick={id:d.id,index:d.index,time:performance.now(),x:event.clientX,y:event.clientY};return;
 }
 S.lastClick=null;
 if(d.kind==='objects'){
  // Moving a container does not silently mark all of its children as manual.
  for(const id of d.roots){D.layout.nodes[id].manual=true;if(!d.keepParent){const target=dropTarget(id,D.layout.nodes[id],d.groupBounds);if(target)entity(id).parentId=target.id;else delete entity(id).parentId;}ensureParentFits(id);}
 }
 if(d.kind==='resize')ensureParentFits(d.id);
 if(d.kind==='waypoint'){const p=D.layout.edges[d.id]?.waypoints[d.index];if(p&&D.graph.nodes.some(n=>inside(p,geometryNode(n.id),4))){D=normalize(JSON.parse(d.before));toast('A bend must stay outside shapes.');renderAll();return;}}
 remember(d.before,({objects:'Move objects',resize:group(d.id)?'Resize container':'Resize shape',waypoint:'Move bend','edge-label':'Move connection label'})[d.kind]||'Edit');renderAll();
}
function cancelDrag(){
 if(typeof controllers.sculpt.sculptCancelStroke==='function')controllers.sculpt.sculptCancelStroke();if(!S.drag)return;D=normalize(JSON.parse(S.drag.before));S.drag=null;$('stage').classList.remove('is-dragging');renderAll();}
function onDoubleClick(e){if(typeof controllers.sculpt.sculptInteracting==='function'&&controllers.sculpt.sculptInteracting()){e.preventDefault();return;}
 if(S.inline||performance.now()<(S.suppressDblUntil||0))return;
 const wp=e.target.closest('[data-waypoint]');if(wp){change('Remove bend',()=>D.layout.edges[wp.dataset.waypoint].waypoints.splice(Number(wp.dataset.index),1));return;}
 const n=e.target.closest('[data-node]'),g=e.target.closest('[data-group]'),ed=e.target.closest('[data-edge]');
 if(n){startInlineEdit(n.dataset.node);return;}if(e.target.closest('[data-group-drag]')){startInlineEdit(g.dataset.group);return;}if(ed){if(e.target.closest('[data-edge-label]'))startInlineEdit(ed.dataset.edge);else addWaypoint(ed.dataset.edge,screenToWorld(e.clientX,e.clientY));return;}
 const p=screenToWorld(e.clientX,e.clientY),target=dropTarget('',{x:p.x,y:p.y,w:0,h:0});addNode(target?{parentId:target.id}:{},p,{edit:true});
}


async function insertImage(file,replaceId=null){
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('Use a PNG, JPEG, WebP, or GIF image. SVG files are imported only as editable diagrams.');
 if(file.size>20*1024*1024)throw Error('Use an image smaller than 20 MB.');
 const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read image.'));r.readAsDataURL(file);});
 const image=new Image();image.src=url;await image.decode();const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 const data=canvas.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',.92),w=Math.min(300,canvas.width),h=clamp(w*canvas.height/canvas.width,32,400);
 if(replaceId&&node(replaceId)){change('Replace image',()=>{node(replaceId).image=data;(board().styles[replaceId]||={}).shape='image';board().layout.nodes[replaceId].w=w;board().layout.nodes[replaceId].h=h;});}
 else addNode({title:file.name.replace(/\.[^.]+$/,'')||'Image',type:'input',image:data,style:{shape:'image',icon:'',color:'slate'},w,h});
 toast('Image embedded · no external file required');
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();later(()=>URL.revokeObjectURL(url),30000);}
function filename(extension){return (D.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'diagram')+'.'+extension;}


function setDocument(input,{fit=true,label='Open diagram'}={}){
 if(typeof controllers.sculpt.sculptBeforeEdit==='function')controllers.sculpt.sculptBeforeEdit();
 if(S.preview)discardLayoutPreview();
 const valid=normalize(input);finishInlineEdit(true);if(S.drag)cancelDrag();
 change(label,()=>{D=valid;S.selected.clear();S.connectFrom=null;S.tool='select';S.treeClosed.clear();S.routeCache=null;S.lastRoutes=[];$('stage').dataset.tool='select';});
 if(fit)fitView();return clone(D);
}
async function importText(text,name=''){
 const trimmed=text.trim();let next;
 if(trimmed.startsWith('<')){const xml=new DOMParser().parseFromString(trimmed,'image/svg+xml');if(xml.querySelector('parsererror'))throw Error('This SVG is not valid XML.');const metadata=xml.querySelector('metadata#diagram-studio-data');if(!metadata)throw Error('Use an SVG exported by Diagram Studio. Other SVGs are not editable diagrams.');next=JSON.parse(metadata.textContent);}
 else if(trimmed.startsWith('{'))next=JSON.parse(trimmed);
 else throw Error('Open a saved JSON diagram or an exported, editable SVG.');
 if(next.kind==='diagram-studio-journey'&&typeof controllers.sculpt.sculptImportJourney==='function')return controllers.sculpt.sculptImportJourney(next);
 const legacy=Array.isArray(next.views),needsLayout=!next.layout?.nodes&&!next.views?.some(v=>Object.keys(v.layout?.nodes||{}).length);
 const result=setDocument(next,{label:'Import diagram'});if(needsLayout)await runLayout({fit:true});toast(legacy?'Imported the active v1 diagram. The original file is unchanged.':'Opened '+(name||'diagram'));return result;
}
async function loadFile(file){
 if(!file)return;if(/^image\/(png|jpeg|webp|gif)$/.test(file.type)){await insertImage(file);return;}
 if(file.size>24*1024*1024)throw Error('Use a diagram smaller than 24 MB.');await importText(await file.text(),file.name);
}
function exportSVG(){
 finishInlineEdit(true);const selected=S.selected,connection=S.connectFrom;S.selected=new Set();S.connectFrom=null;renderScene();
 try{
  const b=sceneBounds(),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),x=b.x-28,y=b.y-28,w=b.w+56,h=b.h+56;
  svg.setAttribute('xmlns',ns);svg.setAttribute('width',Math.ceil(w));svg.setAttribute('height',Math.ceil(h));svg.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);svg.setAttribute('role','img');
  const title=document.createElementNS(ns,'title');title.textContent=D.title;svg.appendChild(title);
  const meta=document.createElementNS(ns,'metadata');meta.id='diagram-studio-data';meta.textContent=JSON.stringify(D);svg.appendChild(meta);
  const bg=document.createElementNS(ns,'rect');Object.entries({x,y,width:w,height:h,fill:getComputedStyle($('stage')).backgroundColor}).forEach(([k,v])=>bg.setAttribute(k,v));svg.appendChild(bg);
  const original=$('world'),world=original.cloneNode(true);world.removeAttribute('transform');
  const originals=[original,...original.querySelectorAll('*')],copies=[world,...world.querySelectorAll('*')],props=['fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','fill-opacity','stroke-opacity','opacity','font-family','font-size','font-weight','letter-spacing','text-anchor','dominant-baseline'];
  originals.forEach((el,i)=>{const cs=getComputedStyle(el),dest=copies[i];for(const p of props){const value=cs.getPropertyValue(p);if(value)dest.setAttribute(p,value);}for(const attr of [...dest.attributes])if(attr.name.startsWith('data-')||['tabindex','class','style','aria-pressed'].includes(attr.name))dest.removeAttribute(attr.name);});
  original.querySelectorAll('.port,.selection-ring,.resize-handle,.label-handle,.waypoint,.edge-hit,.group-collapse,.group-header,.position-badge,#overlay-layer').forEach(el=>copies[originals.indexOf(el)]?.remove());svg.appendChild(world);
  return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg);
 }finally{S.selected=selected;S.connectFrom=connection;renderScene();}
}


async function exportPNG(){
 const svg=exportSVG(),blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
 try{const image=new Image();image.src=url;let decodeTimer;try{await Promise.race([image.decode(),new Promise((_,reject)=>{decodeTimer=later(()=>reject(Error('Image decoding timed out. Save SVG instead.')),12000);})]);}finally{clearTimer(decodeTimer);}const scale=Math.min(2,8192/Math.max(image.naturalWidth,image.naturalHeight),Math.sqrt(24e6/(image.naturalWidth*image.naturalHeight)));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG conversion failed. Export SVG instead.')),'image/png'));}finally{URL.revokeObjectURL(url);}
}


async function exportDocument(format='json',{download=false}={}){
 if(typeof controllers.sculpt.sculptInteracting==='function'&&controllers.sculpt.sculptInteracting())throw Error('Keep or cancel the preview before exporting the diagram.');
 finishInlineEdit(true);let result;
 if(format==='json')result=JSON.stringify(D,null,2);else if(format==='svg')result=exportSVG();else if(format==='png')result=await exportPNG();else throw Error('Export format must be json, svg, or png.');
 if(download){downloadBlob(result instanceof Blob?result:new Blob([result],{type:format==='json'?'application/json':'image/svg+xml'}),filename(format));toast(format.toUpperCase()+' export created');}
 console.info('[diagram-studio] export',{format,nodes:D.graph.nodes.length,schemaVersion:D.schemaVersion});return result;
}




async function chooseSample(id){
 const load=async()=>{setDocument(makeSample(id),{label:'Load example'});};
 if(D.graph.nodes.length||D.graph.groups.length)confirmAction('Open example?','This replaces the current diagram. Undo restores it. Save a copy first to keep both.',()=>void load(),'Open example');else await load();
}
async function action(name,el){
 if(typeof controllers.sculpt.sculptAction==='function'&&await controllers.sculpt.sculptAction(name,el))return;
 try{
  if(name==='mark-start'||name==='mark-end'){setLayoutIntent(name.slice(5),[...S.selected].find(node));return;}
  if(name==='clear-start'||name==='clear-end'){setLayoutIntent(name.slice(6),null);return;}
  if(name==='compare-layouts'||name==='compare-routes'){controllers.explorer.openExplorer(name==='compare-routes'?'routing':'layout');return;}
  if(name==='file-menu'){fileMenu();return;}if(name==='edit-menu'){editMenu();return;}if(name==='layout-menu'){layoutMenu();return;}if(name==='export-menu'){exportMenu();return;}
  if(await labAction(name))return;
  if(name==='run-layout'){await labRun();return;}
  closePopover();
  if(name==='undo'){undo();return;}if(name==='redo'){redo();return;}
  if(name==='layout'){await labRun();return;}if(name==='layout-all'){await labRun('rebuild',true);return;}
  if(name==='add-node'){setTool('select');addNode({},canvasCenter(),{edit:true});return;}
  if(name==='add-connected'){addConnected();return;}if(name==='quick-build'){quickBuildDialog();return;}if(name==='insert-step'){insertStep([...S.selected].find(edge));return;}if(name==='reroute'){reroute();return;}if(name==='routing-menu'){routingMenu();return;}if(name==='auto-ports'){reroute({auto:true});return;}
  if(name==='group'){const id=wrapSelection();if(id)startInlineEdit(id);return;}if(name==='ungroup'){ungroupSelection();return;}
  if(name==='duplicate'){duplicateSelection();return;}if(name==='delete'){deleteSelection();return;}if(name==='delete-deep'){deleteSelection(true);return;}
  if(name==='pin'){const roots=selectionRoots();if(roots.length)setPinned(!roots.every(id=>D.layout.nodes[id].pinned));return;}
  if(name==='release-manual'){change('Clear manual markers',()=>{for(const id of selectionRoots())D.layout.nodes[id].manual=false;});return;}
  if(name.startsWith('align-')){arrangeSelection(name.slice(6));return;}if(name.startsWith('distribute-')){arrangeSelection(name);return;}
  if(name==='fit'){fitView();return;}
  if(name==='zoom-in'||name==='zoom-out'){const r=$('canvas').getBoundingClientRect();zoomAt(name==='zoom-in'?1.18:1/1.18,r.left+r.width/2,r.top+r.height/2);return;}
  if(name==='reset-camera'){const r=$('canvas').getBoundingClientRect();zoomAt(1/D.camera.k,r.left+r.width/2,r.top+r.height/2);return;}
  if(name==='toggle-left'){leftClosed=!leftClosed;updatePanelState();applyCamera();return;}
  if(name==='toggle-right'){rightClosed=!rightClosed;updatePanelState();applyCamera();return;}
  if(name==='toggle-panels'){if(!leftClosed||!rightClosed){lastPanelState={leftClosed,rightClosed};leftClosed=rightClosed=true;}else{leftClosed=lastPanelState?.leftClosed??false;rightClosed=lastPanelState?.rightClosed??false;}updatePanelState();applyCamera();return;}
  if(name==='fit-container'){const id=selectionRoots().find(group);if(id)change('Fit container',()=>{fitContainer(id);D.layout.containers[id].manualSize=true;});return;}
  if(name==='collapse-selected'){const id=selectionRoots().find(group);if(id)toggleCollapse(id);return;}
  if(name==='reverse-edge'){const id=[...S.selected].find(edge);if(id)change('Reverse connection',()=>{const e=edge(id);[e.from,e.to]=[e.to,e.from];const cfg=D.layout.edges[id]||={};[cfg.fromSide,cfg.toSide]=[cfg.toSide||'auto',cfg.fromSide||'auto'];cfg.waypoints?.reverse();});return;}
  if(name==='reset-route'){const id=[...S.selected].find(edge);if(id)change('Reset connection bends',()=>{delete (D.layout.edges[id]||{}).waypoints;});return;}
  if(name==='blank'){confirmAction('New diagram?','The current diagram is saved in this browser. Starting a new diagram replaces it. Undo can restore it until you close this page.',()=>setDocument(baseDoc(),{label:'New diagram'}),'New diagram');return;}
  if(name==='theme'){change('Change theme',()=>{D.theme=D.theme==='light'?'dark':'light';});return;}
  if(name==='help'){showHelp();return;}if(name==='close-dialog'){closeDialog();return;}
  if(name==='import'){$('file-input').value='';$('file-input').click();return;}
  if(name==='image'||name==='replace-image'){S.replaceImageId=name==='replace-image'?[...S.selected].find(node):null;$('image-input').value='';$('image-input').click();return;}
  if(name.startsWith('export-')){await exportDocument(name.slice(7),{download:true});return;}
 }catch(error){console.warn('[diagram-studio] action failed',name,error);toast(error.message);}
}
listen(document, 'click',e=>{
 const t=e.target.closest('[data-action],[data-tool],[data-select],[data-sample],[data-color],[data-tree]');if(!t||t.disabled)return;
 if(t.dataset.action){void action(t.dataset.action,t);return;}if(t.dataset.tool&&t.tagName==='BUTTON'){setTool(t.dataset.tool);return;}
 if(t.dataset.select){selectItems([t.dataset.select],{add:e.shiftKey,toggle:e.shiftKey});return;}
 if(t.dataset.sample){void chooseSample(t.dataset.sample);return;}
 if(t.dataset.color){change('Change color',()=>{for(const id of S.selected)if(node(id)||group(id))(D.styles[id]||={}).color=t.dataset.color;});return;}
 if(t.dataset.tree){const id=t.dataset.tree;if(S.treeClosed.has(id))S.treeClosed.delete(id);else S.treeClosed.add(id);renderLibrary();}
});
listen(document, 'pointerdown',e=>{if(!$('popover').hidden&&!e.target.closest('#popover,#file-menu-btn,#edit-menu-btn,#layout-options-btn,#export-btn,#routing-options-btn'))closePopover();});
listen($('inspector'), 'change',e=>{if(e.target.dataset.field)changeField(e.target);});
listen($('layer-search'), 'input',renderLibrary);
listen($('document-title'), 'change',e=>change('Rename diagram',()=>{D.title=e.target.value.trim()||'Untitled diagram';}));
listen($('document-title'), 'keydown',e=>{if(e.key==='Enter'){$('document-title').blur();$('canvas').focus();}});
listen($('popover'), 'keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePopover();return;}
 if(['ArrowDown','ArrowUp'].includes(e.key)&&e.target.tagName==='BUTTON'){const items=[...$('popover').querySelectorAll('button:not(:disabled),input,select')],i=items.indexOf(e.target);e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}
});
listen($('main-dialog'), 'close',()=>{if(document.activeElement===document.body&&lastDialogFocus?.isConnected)lastDialogFocus.focus({preventScroll:true});});
for(const [id,load] of [['file-input',loadFile],['image-input',file=>insertImage(file,S.replaceImageId)]])listen($(id),'change',async e=>{try{for(const f of e.target.files)await load(f);S.replaceImageId=null;}catch(error){openDialog('Could not open file',`<p class="error">${esc(error.message)}</p><p class="note">The current diagram has not been replaced.</p>`);}});
listen($('canvas'), 'pointerdown',onPointerDown);listen($('canvas'), 'pointermove',onPointerMove);
listen($('canvas'), 'pointerup',e=>{if(e.pointerType==='touch'&&endTouches(e))return;finishDrag(e);try{$('canvas').releasePointerCapture(e.pointerId);}catch{}});
listen($('canvas'), 'pointercancel',e=>{endTouches(e);cancelDrag();});listen($('canvas'), 'dblclick',onDoubleClick);
listen($('canvas'), 'wheel',onWheel,{passive:false});
listen($('canvas'), 'contextmenu',e=>{e.preventDefault();const n=e.target.closest('[data-node],[data-group],[data-edge]');if(n&&!S.selected.has(n.dataset.node||n.dataset.group||n.dataset.edge))selectItems([n.dataset.node||n.dataset.group||n.dataset.edge]);editMenu({id:'context',getBoundingClientRect:()=>({right:e.clientX+220,bottom:e.clientY})});});
let dragDepth=0;listen($('stage'), 'dragenter',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();dragDepth++;$('drop-overlay').hidden=false;}});listen($('stage'), 'dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});listen($('stage'), 'dragleave',()=>{if(--dragDepth<=0)$('drop-overlay').hidden=true;});listen($('stage'), 'drop',async e=>{e.preventDefault();dragDepth=0;$('drop-overlay').hidden=true;try{for(const f of e.dataTransfer.files)await loadFile(f);}catch(error){toast(error.message);}});
function editableTarget(el){return el?.matches('input,textarea,select,[contenteditable=true]');}
listen(document, 'copy',e=>{if(editableTarget(e.target)||$('main-dialog').open||$('explorer-dialog')?.open||!S.selected.size)return;const part=copySelection();e.clipboardData.setData('text/plain',JSON.stringify(part));e.preventDefault();});
listen(document, 'paste',async e=>{
 if(editableTarget(e.target)||$('main-dialog').open||$('explorer-dialog')?.open)return;
 try{const image=[...e.clipboardData.items].find(i=>/^image\/(png|jpeg|webp|gif)$/.test(i.type));if(image){e.preventDefault();await insertImage(image.getAsFile());return;}const text=e.clipboardData.getData('text/plain');if(text.trim().includes('\n')&&!text.trim().startsWith('{')){e.preventDefault();quickBuildDialog(text);return;}if(text.trim().startsWith('{')){e.preventDefault();const data=JSON.parse(text);if(data.kind==='diagram-studio/clipboard')pasteFragment(data);else await importText(text);return;}if(!text&&S.clipboard){e.preventDefault();pasteFragment();}}catch(error){toast(error.message);}
});
listen(document, 'keydown',e=>{
 if(e.isComposing||$('main-dialog').open||$('explorer-dialog')?.open)return;if(typeof controllers.sculpt.sculptKey==='function'&&controllers.sculpt.sculptKey(e))return;const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(e.key==='Escape'){
  if(S.layoutBusy){e.preventDefault();cancelLayout();return;}
  if(S.preview){e.preventDefault();discardLayoutPreview();return;}
  if(S.inline)return;if(!$('popover').hidden){e.preventDefault();closePopover();return;}
  e.preventDefault();cancelDrag();S.connectFrom=null;if(S.tool!=='select'){setTool('select');return;}S.selected.clear();renderAll();$('canvas').focus();return;
 }
 if(editableTarget(e.target))return;
 if(e.code==='Space'&&!e.repeat){e.preventDefault();S.space=true;$('stage').classList.add('space');return;}
 if(mod){
  if(key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(key==='y'){e.preventDefault();redo();return;}
  if(key==='a'){e.preventDefault();selectItems(visibleGraph().nodes.map(n=>n.id));return;}
  if(key==='d'){e.preventDefault();duplicateSelection();return;}if(key==='g'){e.preventDefault();if(e.shiftKey)ungroupSelection();else{const id=wrapSelection();if(id)startInlineEdit(id);}return;}
  if(key==='s'){e.preventDefault();void exportDocument('json',{download:true});return;}if(key==='o'){e.preventDefault();void action('import');return;}return;
 }
 const focused=e.target.closest?.('[data-node],[data-group],[data-edge]'),focusedId=focused?.dataset.node||focused?.dataset.group||focused?.dataset.edge;
 if(e.key==='Enter'&&e.target.closest?.('[data-quick-add]')){e.preventDefault();const q=e.target.closest('[data-quick-add]');S.selected=new Set([q.dataset.quickOwner]);quickExtend({side:q.dataset.quickAdd});return;}
 if(e.key==='Enter'){
  if(e.target.tagName==='BUTTON')return;e.preventDefault();
  if(S.tool==='connect'){const id=focusedId&&node(focusedId)?focusedId:[...S.selected].find(node);if(!id)return;if(S.connectFrom)completeConnection(id);else{S.connectFrom={id,side:'auto'};renderAll();}return;}
  if(e.shiftKey){addConnected();return;}const id=focusedId||[...S.selected][0];if(id)startInlineEdit(id);return;
 }
 if(e.key==='Tab'&&S.tool==='connect'&&(e.target===$('canvas')||focused)){
  const targets=visibleGraph().nodes.map(n=>n.id),anchor=focusedId||[...S.selected].find(node),i=targets.indexOf(anchor),next=targets[(i+(e.shiftKey?-1:1)+targets.length)%targets.length];
  if(next){e.preventDefault();S.selected=new Set([next]);renderAll();$('world').querySelector(`[data-node="${CSS.escape(next)}"]`)?.focus({preventScroll:true});}return;
 }
 if(e.key==='Tab'&&S.tool!=='connect'&&(e.target===$('canvas')||focused)&&S.selected.size===1&&(node([...S.selected][0])||edge([...S.selected][0]))){e.preventDefault();quickExtend({sibling:e.shiftKey});return;}
 if(e.altKey&&e.key.startsWith('Arrow')&&(e.target===$('canvas')||focused)){e.preventDefault();quickExtend({side:{ArrowRight:'right',ArrowLeft:'left',ArrowUp:'top',ArrowDown:'bottom'}[e.key]});return;}
 if(e.altKey&&key==='s'){e.preventDefault();const id=[...S.selected].find(node);if(id)setLayoutIntent('start',id);else toast('Select a shape first.');return;}
 if(e.altKey&&e.key==='End'){e.preventDefault();const id=[...S.selected].find(node);if(id)setLayoutIntent('end',id);else toast('Select a shape first.');return;}
 if(e.altKey&&key==='r'){e.preventDefault();reroute({auto:e.shiftKey});return;}
 if(key==='b'&&!e.altKey){e.preventDefault();quickBuildDialog();return;}
 if(['Delete','Backspace'].includes(e.key)){e.preventDefault();deleteSelection(e.shiftKey);return;}
 if(e.key.startsWith('Arrow')&&(e.target===$('canvas')||focused)){
  e.preventDefault();if(focusedId&&!S.selected.has(focusedId))S.selected=new Set([focusedId]);const amount=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0,dy=e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0,roots=selectionRoots();
  if(roots.length)change('Nudge',()=>{for(const id of roots){moveObject(id,dx,dy,{manual:true});ensureParentFits(id);}});else{D.camera.x-=dx*30;D.camera.y-=dy*30;applyCamera();persist();}return;
 }
 if(e.altKey&&key==='e'){e.preventDefault();controllers.explorer.openExplorer('layout');return;}
 if(key==='l'){e.preventDefault();void action(e.altKey?'layout-menu':e.shiftKey?'layout-all':'layout');return;}
 const actions={n:'add-node',p:'pin','1':'fit','0':'reset-camera','?':'help','[':'toggle-left',']':'toggle-right','\\':'toggle-panels','+':'zoom-in','=':'zoom-in','-':'zoom-out'};
 if(actions[key]){e.preventDefault();void action(actions[key]);return;}
 const tools={v:'select',h:'pan',c:'connect',r:'box',d:'diamond',o:'circle',t:'text',g:'container'};if(tools[key]){e.preventDefault();setTool(tools[key]);}
});
listen(document, 'keyup',e=>{if(e.key==='Meta'||e.key==='Control')modifierZoom=null;if(e.code==='Space'){S.space=false;$('stage').classList.remove('space');}});
listen(window, 'blur',()=>{if(typeof controllers.sculpt.sculptBlur==='function')controllers.sculpt.sculptBlur();touchPointers.clear();touchGesture=null;modifierZoom=null;S.space=false;$('stage').classList.remove('space');if(S.drag)cancelDrag();});
listen(window, 'beforeunload',()=>{if(typeof controllers.sculpt.sculptBeforeUnload==='function')controllers.sculpt.sculptBeforeUnload();finishInlineEdit(true);persistNow();});
listen(window, 'storage',e=>{if(e.key===STORAGE&&e.newValue&&e.newValue!==snapshot())toast('Another tab saved this diagram. Save a copy before reloading.');});
listen(window, 'resize',()=>{updatePanelState();applyCamera();});
listen(matchMedia('(prefers-reduced-motion: reduce)'), 'change',e=>{S.reduced=e.matches;});


function diagnostics(){
 const vg=visibleGraph(),collisions=[];for(const r of S.lastRoutes){for(let i=1;i<r.points.length;i++)for(const n of vg.nodes){if(n.id===r.edge.a||n.id===r.edge.b)continue;if(segmentBlocked(r.points[i-1],r.points[i],[geometryNode(n.id)]))collisions.push({edge:r.id,node:n.id,segment:i});}}
 const overlaps=[];for(let i=0;i<vg.nodes.length;i++)for(let j=i+1;j<vg.nodes.length;j++)if(overlap(geometryNode(vg.nodes[i].id),geometryNode(vg.nodes[j].id)))overlaps.push([vg.nodes[i].id,vg.nodes[j].id]);
 return{version:'7.0.0',explorer:typeof controllers.explorer.explorerDiagnostics==='function'?controllers.explorer.explorerDiagnostics():null,ready:true,sculpt:typeof controllers.sculpt.sculptDiagnostics==='function'?controllers.sculpt.sculptDiagnostics():null,tool:S.tool,canvasArea:Math.round($('stage').clientWidth*$('stage').clientHeight/(innerWidth*innerHeight)*100),layoutReport:S.layoutReport,engine:S.engine,elkReady:S.elkReady,layoutBusy:S.layoutBusy,preview:!!S.preview,algorithms:LayoutLab.algorithms.map(a=>a.id),reducedMotion:S.reduced,selected:[...S.selected],visibleNodes:vg.nodes.length,visibleEdges:vg.edges.length,routingReport:clone(S.routingReport||{}),routeObstructions:[...S.routeWarnings],routeNodeCollisions:collisions,nodeOverlaps:overlaps,routes:S.lastRoutes.map(r=>({id:r.id,points:clone(r.points),fromSide:r.fromSide,toSide:r.toSide,fromOffset:r.fromOffset,toOffset:r.toOffset,blocked:r.blocked})),undoDepth:S.undo.length,redoDepth:S.redo.length};
}


window.diagramStudio=Object.freeze({
 version:'7.0.0',timeline:options=>controllers.sculpt.openJourney(options),timelineState:()=>controllers.sculpt.sculptDiagnostics(),scrub:index=>controllers.sculpt.journeyScrub(index),keepFrame:options=>controllers.sculpt.journeyKeep(options),cancelTimeline:()=>controllers.sculpt.closeJourney(),bookmarkFrame:()=>controllers.sculpt.journeyBookmark(),brush:options=>controllers.sculpt.brushActivate(options),brushDab:options=>controllers.sculpt.brushApplyAt(options),clearLocalHolds:()=>controllers.sculpt.sculptClearHolds(),getJourney:()=>controllers.sculpt.sculptExportJourney(),setIntent:setLayoutIntent,get:()=>clone(D),set:setDocument,select:(ids,options={})=>{selectItems(Array.isArray(ids)?ids:[ids],options);return[...S.selected];},layout:runLayout,algorithms:()=>clone(LayoutLab.algorithms),preview:options=>runLayout({...options,preview:true}),acceptPreview:acceptLayoutPreview,discardPreview:discardLayoutPreview,cancelLayout,fit:fitView,import:importText,export:exportDocument,addNode,addEdge,undo,redo,diagnostics,samples:()=>clone(SAMPLE_INFO),loadSample:id=>setDocument(makeSample(id),{label:'Load example'}),newDocument:()=>setDocument(baseDoc(),{label:'New diagram'}),pin:setPinned,reroute,fastBuild,extend:quickExtend,insertStep,compare:(mode='layout')=>controllers.explorer.openExplorer(mode),explorerState:()=>controllers.explorer.explorerDiagnostics(),generateComparison:config=>controllers.explorer.generateExplorer(config),applyCandidate:index=>controllers.explorer.applyExplorerCandidate(index),closeComparison:()=>controllers.explorer.closeExplorer(),exportSheet:()=>controllers.explorer.exportExplorerSheet(false),getExperiment:()=>controllers.explorer.getExplorerExperiment(),comparisonView:mode=>controllers.explorer.exSetPresentation(mode),anchorComparison:id=>controllers.explorer.exChooseAnchor(id)
});
// BEGIN MODULE navigation.js
// Edit-first input with independent navigation gestures. Canvas-space pixels never modify document geometry.
const touchPointers=new Map();let touchGesture=null,modifierZoom=null,lastMouse=null;
function beginTouches(e){
 touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touchPointers.size<2)return false;
 if(S.drag)cancelDrag();
 const [a,b]=[...touchPointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 touchGesture={distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),world:screenToWorld(mid.x,mid.y),camera:clone(D.camera)};
 for(const id of touchPointers.keys())try{$('canvas').setPointerCapture(id);}catch{}
 return true;
}
function moveTouches(e){
 if(!touchPointers.has(e.pointerId))return false;touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(!touchGesture||touchPointers.size<2)return false;
 const [a,b]=[...touchPointers.values()],r=$('canvas').getBoundingClientRect(),mid={x:(a.x+b.x)/2-r.left,y:(a.y+b.y)/2-r.top},k=clamp(touchGesture.camera.k*Math.hypot(b.x-a.x,b.y-a.y)/touchGesture.distance,.08,4);
 D.camera={x:mid.x-touchGesture.world.x*k,y:mid.y-touchGesture.world.y*k,k};applyCamera();return true;
}
function endTouches(e){
 touchPointers.delete(e.pointerId);if(!touchGesture)return false;
 if(touchPointers.size<2){touchGesture=null;S.drag=null;persist();}return true;
}
function onWheel(e){
 e.preventDefault();if(controllers.sculpt.hasActiveStroke?.())return;finishInlineEdit(true);if(S.drag||touchGesture)return;
 const unit=e.deltaMode===1?16:e.deltaMode===2?$('stage').clientHeight:1;
 if(e.ctrlKey||e.metaKey){zoomAt(Math.exp(-clamp(e.deltaY*unit,-350,350)*.007),e.clientX,e.clientY);return;}
 D.camera.x-=e.deltaX*unit;D.camera.y-=e.deltaY*unit;applyCamera();persist();
}
function modifierMove(e){
 lastMouse={x:e.clientX,y:e.clientY};
 // Cmd + free mouse movement matches the requested gesture; Ctrl + drag is the
 // non-Mac equivalent. Cmd/Control + scroll remains supported as well.
 if(!e.metaKey||e.buttons||S.drag||S.inline||touchGesture){modifierZoom=null;return false;}
 if(!modifierZoom){modifierZoom={start:{x:e.clientX,y:e.clientY},lastY:e.clientY,world:screenToWorld(e.clientX,e.clientY)};return true;}
 const dy=modifierZoom.lastY-e.clientY;modifierZoom.lastY=e.clientY;
 if(Math.abs(dy)>120){modifierZoom=null;return true;}
 const r=$('canvas').getBoundingClientRect(),k=clamp(D.camera.k*Math.exp(dy*.008),.08,4);
 D.camera={x:modifierZoom.start.x-r.left-modifierZoom.world.x*k,y:modifierZoom.start.y-r.top-modifierZoom.world.y*k,k};applyCamera();persist();return true;
}
function startZoomDrag(e){
 const point=screenToWorld(e.clientX,e.clientY);startDrag('zoom',e,{zoomWorld:point});e.preventDefault();
}
// END MODULE navigation.js
listen($('algorithm-quick'), 'change',e=>{D.settings.algorithm=e.target.value;persist();renderLayoutLab();});
listen($('popover'), 'input',e=>{const k=e.target.dataset.routeSetting;if(k){const out=$('popover').querySelector(`[data-route-output="${k}"]`);if(out)out.textContent=e.target.value;}});
listen($('popover'), 'change',e=>{const k=e.target.dataset.routeSetting;if(!k)return;const before=snapshot();D.settings.routing=RouteLab.settings({...D.settings.routing,[k]:Number(e.target.value)});remember(before,'Change routing settings');S.routeCache=null;renderScene();const q=$('routing-summary');if(q)q.textContent=`${S.routingReport.crossings} crossings · ${S.routingReport.lanePairs||0} close lane pairs · ${S.routingReport.bends} bends · ${S.routingReport.milliseconds} ms`;});
listen($('popover'), 'click',e=>{const p=e.target.closest('[data-route-preset]');if(!p)return;const before=snapshot();D.settings.routing=RouteLab.settings({...RouteLab.defaults,...(p.dataset.routePreset==='separate'?{crossingPenalty:900,sharedPenalty:9,portStability:10}:{} )});remember(before,'Change routing preset');S.lastRoutes=[];S.routeCache=null;renderScene();closePopover();routingMenu();});
listen($('layout-lab'), 'input',e=>{const k=e.target.dataset.layoutSetting;if(!k)return;const out=$('out-'+k);if(out)out.textContent=e.target.value;});
listen($('layout-lab'), 'change',e=>{if(e.target.id==='lab-scope'){labScope=e.target.value;return;}if(!e.target.dataset.layoutSetting)return;try{const s=readLayoutSettings();D.settings={...D.settings,...s};persist();syncAlgorithmSelect();if(e.target.dataset.layoutSetting==='algorithm')renderLayoutLab();}catch(error){toast(error.message);}});
listen($('preview-before'), 'pointerdown',e=>{if(!S.preview)return;e.preventDefault();S.animationNodes=JSON.parse(S.preview.before).layout.nodes;renderScene();e.target.setPointerCapture(e.pointerId);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])listen($('preview-before'), type,()=>{S.animationNodes=null;renderScene();});
listen($('preview-before'), 'keydown',e=>{if((e.key===' '||e.key==='Enter')&&S.preview){e.preventDefault();S.animationNodes=JSON.parse(S.preview.before).layout.nodes;renderScene();}});
listen($('preview-before'), 'keyup',()=>{S.animationNodes=null;renderScene();});
(function boot(){
 let restored=false,notice='';
 try{
  const stored=localStorage.getItem(STORAGE)||localStorage.getItem('diagram-studio-v4')||localStorage.getItem('diagram-studio-v3')||localStorage.getItem('diagram-studio-v2');if(stored){try{D=normalize(JSON.parse(stored));restored=true;}catch(error){localStorage.setItem(STORAGE+'-recovery',stored);notice='The saved file could not be read. A recovery copy was kept.';console.warn('[diagram-studio] recovery',error);}}
  const ui=localStorage.getItem(UI_STORAGE);if(ui){const parsed=JSON.parse(ui);leftClosed=parsed.leftClosed!==false;rightClosed=parsed.rightClosed!==false;}
 }catch{notice='Browser storage is unavailable. Save a diagram file to keep edits.';}
 hydrateIcons();renderAll();
 requestAnimationFrame(async()=>{if(!restored)fitView();else applyCamera();if(notice)toast(notice);});
 console.info('[diagram-studio] ready',{version:'7.0.0',restored,objects:D.graph.nodes.length+D.graph.groups.length});
})();




export { $, clone, esc, clamp, uid, icon, normalize, D, S, node, group, edge, ancestors, geometryNode, rectUnion, center, groupRect, visibleGraph, snapshot, remember, change, persist, toast, undo, redo, dist, routePath, labelPosition, routingFingerprint, layoutScope, renderLayoutLab, cancelLayout, visualNodeBounds, renderNode, renderGroup, renderScene, renderOverlay, fitView, renderEdges, applyCamera, screenToWorld, field, checkbox, renderAll, closePopover, setTool, canvasCenter, reroute, finishInlineEdit, startDrag, finishDrag, downloadBlob, filename, setDocument, action, editableTarget };

registerDispose(() => { clearTimer(saveTimer); clearTimer(toastTimer); cancelLayout(); finishInlineEdit(true); persistNow(); });

export function setCommittedDocument(value) { D = value; }
export function setTransientState(value) { S = value; }

export function hideLayoutLab() { labOpen = false; renderLayoutLab(); }
