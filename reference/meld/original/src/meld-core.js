/* Meld 0.1 — original, dependency-free experimental diagram compiler.
 * Geometry is a pure function of source + view + explicit context.
 * No DOM measurements, randomness, clocks, network, or previous-render state.
 * MIT license. See LICENSE. */
(function (global) {
'use strict';
const VERSION = 'meld-0.1';
const cmp = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const round = n => Math.round(n * 16) / 16;
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '['+v.map(stable).join(',')+']' : '{'+Object.keys(v).sort(cmp).map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
function hash(s) { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0'); }
// Synchronous SHA-256 for content-addressed checkpoint keys. Debug geometry
// fingerprints remain short FNV-1a values; replay verification compares full strings.
function sha256(text) {
  const bytes=new TextEncoder().encode(text),length=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(length);data.set(bytes);data[bytes.length]=128;
  const view=new DataView(data.buffer);view.setUint32(length-8,Math.floor(bytes.length/536870912),false);view.setUint32(length-4,(bytes.length*8)>>>0,false);
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64),ror=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let offset=0;offset<length;offset+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4,false);for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(ror(x,7)^ror(x,18)^(x>>>3))+w[i-7]+(ror(y,17)^ror(y,19)^(y>>>10)))>>>0;}let [a,b,c,d,e,f,g,j]=h;for(let i=0;i<64;i++){const t1=(j+(ror(e,6)^ror(e,11)^ror(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((ror(a,2)^ror(a,13)^ror(a,22))+((a&b)^(a&c)^(b&c)))>>>0;j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,j].forEach((v,i)=>{h[i]=(h[i]+v)>>>0;});}
  return [...h].map(x=>x.toString(16).padStart(8,'0')).join('');
}
const withoutLines = v => Array.isArray(v) ? v.map(withoutLines) : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).filter(([k])=>k!=='line').map(([k,x])=>[k,withoutLines(x)])) : v;
class DslError extends Error { constructor(message,line=0){super((line?'Line '+line+': ':'')+message);this.name='DslError';this.line=line;} }
function tokenize(line, lineNo=0) {
  const out=[]; let token='', quoted=false, escaped=false;
  for(let i=0;i<line.length;i++) { const c=line[i];
    if(escaped){ token+=c; escaped=false; continue; }
    if(quoted && c==='\\'){token+=c;escaped=true;continue;}
    if(c==='"'){quoted=!quoted;token+=c;continue;}
    if(!quoted && (c==='#' || (c==='/'&&line[i+1]==='/'))) break;
    if(!quoted && /\s/.test(c)){if(token){out.push(token);token='';}} else token+=c;
  }
  if(quoted)throw new DslError('Unclosed quoted string.',lineNo);
  if(token)out.push(token);return out;
}
function val(s,line){if(s===undefined)return undefined;if(s.startsWith('"')){try{return JSON.parse(s);}catch(e){throw new DslError('Invalid quoted string or escape.',line);}}return s;}
function parse(source) {
  if(typeof source!=='string')throw new DslError('Source must be text.');
  if(source.length>300000)throw new DslError('Prototype limit: 300,000 source characters.');
  const m={title:'Untitled diagram',version:1,nodes:[],edges:[],layouts:[],views:[],hints:[],snapshots:[],boxes:[],diagramLine:0};
  const nodeIds=new Set(),edgeIds=new Set(),viewIds=new Set(),unique=new Set();
  const assert=(ok,msg,line)=>{if(!ok)throw new DslError(msg,line);};
  const id=(s,l)=>{s=val(s,l);assert(typeof s==='string'&&/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(s),'Expected a stable identifier (letters, digits, _, . or -).',l);return s;};
  const num=(s,d,l,min=-100000,max=100000)=>{if(s===undefined)return d;const n=Number(s);assert(Number.isFinite(n)&&n>=min&&n<=max,`Expected a number from ${min} to ${max}; got ${s}.`,l);return n;};
  const en=(s,d,choices,l)=>{s=s===undefined?d:s;assert(choices.includes(s),`Expected ${choices.join(' | ')}; got ${s}.`,l);return s;};
  const once=(key,l)=>{assert(!unique.has(key),'Duplicate declaration: '+key+'. Edit the existing declaration instead.',l);unique.add(key);};
  source.split(/\r?\n/).forEach((text,i)=>{
    const line=i+1,t=tokenize(text,line);if(!t.length)return;const cmd=t.shift(),p=[],a={};
    t.forEach(raw=>{const j=raw.indexOf('=');if(j>0&&!raw.startsWith('"')){const k=raw.slice(0,j);assert(!Object.hasOwn(a,k),'Duplicate attribute '+k+'.',line);a[k]=val(raw.slice(j+1),line);}else p.push(val(raw,line));});
    const attrs=allowed=>Object.keys(a).forEach(k=>assert(allowed.includes(k),'Unknown '+cmd+' attribute: '+k+'.',line));
    const count=(lo,hi=lo)=>assert(p.length>=lo&&p.length<=hi,'Wrong number of arguments for '+cmd+'.',line);
    const view=()=>a.view===undefined?'*':id(a.view,line);
    if(cmd==='diagram'){count(1);attrs(['version']);assert(!m.diagramLine,'Only one diagram declaration is allowed.',line);m.diagramLine=line;m.title=p[0];m.version=num(a.version,1,line,1,1);}
    else if(cmd==='node'||cmd==='group'){
      count(2);attrs(['in','kind','detail','priority','color']);const n=id(p[0],line);assert(n!=='root','root is reserved for the outer layout scope.',line);assert(!nodeIds.has(n),'Duplicate node/group id '+n+'.',line);nodeIds.add(n);
      m.nodes.push({id:n,label:p[1],type:cmd,parent:a.in===undefined?'root':id(a.in,line),kind:en(a.kind,cmd==='group'?'group':'service',['group','service','app','database','queue','person','document'],line),detail:a.detail||'',priority:num(a.priority,5,line,1,10),color:en(a.color,'auto',['auto','blue','teal','violet','orange','slate'],line),line});
    } else if(cmd==='edge'){
      count(4,5);attrs(['importance','kind','from','to']);assert(p[2]==='->','Edges use: edge id source -> target "label".',line);const e=id(p[0],line);assert(!edgeIds.has(e),'Duplicate edge id '+e+'.',line);edgeIds.add(e);
      m.edges.push({id:e,source:id(p[1],line),target:id(p[3],line),label:p[4]||'',importance:num(a.importance,7,line,1,10),kind:en(a.kind,'sync',['sync','async','data'],line),from:en(a.from,'auto',['auto','left','right','top','bottom'],line),to:en(a.to,'auto',['auto','left','right','top','bottom'],line),line});
    } else if(cmd==='layout'){
      count(2);attrs(['direction','gap','columns','min-width','min-height','view']);const scope=id(p[0],line),v=view();once('layout:'+scope+':'+v,line);
      m.layouts.push({scope,algorithm:en(p[1],'flow',['flow','row','column','grid','radial'],line),direction:en(a.direction,'auto',['auto','right','down'],line),gap:num(a.gap,28,line,8,300),columns:a.columns===undefined||a.columns==='auto'?'auto':num(a.columns,2,line,1,20),'min-width':num(a['min-width'],0,line,0,10000),'min-height':num(a['min-height'],0,line,0,10000),view:v,line});
      assert(a.columns===undefined||a.columns==='auto'||Number.isInteger(Number(a.columns)),'columns must be an integer.',line);
    } else if(cmd==='view'){
      count(2);attrs(['mode','width','height','detail','edges','min-font','focus','collapse']);const n=id(p[0],line);assert(!viewIds.has(n),'Duplicate view id '+n+'.',line);viewIds.add(n);
      m.views.push({id:n,label:p[1],mode:en(a.mode,'interactive',['interactive','static'],line),width:num(a.width,1100,line,240,4000),height:num(a.height,720,line,200,4000),detail:en(a.detail,'auto',['auto','full','overview'],line),edges:en(a.edges,'all',['all','primary'],line),'min-font':num(a['min-font'],11,line,8,24),focus:a.focus&&a.focus!=='none'?id(a.focus,line):null,collapse:a.collapse&&a.collapse!=='none'?a.collapse.split(',').map(x=>id(x,line)):[],line});
    } else if(['order','align','near','nudge','stay','pin','size'].includes(cmd)){
      const h={type:cmd,view:view(),line};
      if(cmd==='order'){count(2,300);attrs(['view']);h.scope=id(p[0],line);h.ids=p.slice(1).map(x=>id(x,line));once('order:'+h.scope+':'+h.view,line);}
      else if(cmd==='align'){count(3,300);attrs(['view','strength']);h.axis=en(p[0],'x',['x','y'],line);h.ids=p.slice(1).map(x=>id(x,line));h.strength=en(a.strength,'prefer',['prefer','required'],line);once('align:'+h.axis+':'+h.ids.join(',')+':'+h.view,line);}
      else {
        count(cmd==='near'?2:1);h.id=id(p[0],line);
        if(cmd==='near'){attrs(['view','side','gap','offset','strength']);h.ref=id(p[1],line);assert(h.ref!==h.id,'A node cannot be placed relative to itself.',line);h.side=en(a.side,'right',['right','left','above','below'],line);h.gap=num(a.gap,28,line,0,2000);h.offset=num(a.offset,0,line);h.strength=en(a.strength,'prefer',['prefer','required'],line);}
        if(cmd==='nudge'){attrs(['view','dx','dy']);h.dx=num(a.dx,0,line);h.dy=num(a.dy,0,line);}
        if(cmd==='stay'||cmd==='pin'){attrs(cmd==='stay'?['view','x','y','weight']:['view','x','y']);h.x=num(a.x,0,line,0);h.y=num(a.y,0,line,0);if(cmd==='stay')h.weight=num(a.weight,8,line,1,100);}
        if(cmd==='size'){attrs(['view','width','height']);h.width=num(a.width,184,line,80,1200);h.height=num(a.height,72,line,48,1200);}
        once(cmd+':'+h.id+':'+h.view,line);
      }
      m.hints.push(h);
    } else if(cmd==='snapshot'){
      count(1);attrs(['key','engine']);const v=id(p[0],line);once('snapshot:'+v,line);assert(typeof a.key==='string'&&/^[0-9a-f]{64}$/.test(a.key),'Snapshot requires key=<64 hex characters>.',line);m.snapshots.push({view:v,key:a.key,engine:a.engine||VERSION,line});
    } else if(cmd==='box'){
      count(2);attrs(['x','y','width','height']);const v=id(p[0],line),n=id(p[1],line);once('box:'+v+':'+n,line);m.boxes.push({view:v,id:n,x:num(a.x,0,line),y:num(a.y,0,line),w:num(a.width,184,line,1,100000),h:num(a.height,72,line,1,100000),line});
    } else throw new DslError('Unknown statement '+cmd+'.',line);
  });
  if(!m.views.length)m.views.push({id:'explore',label:'Explore',mode:'interactive',width:1100,height:720,detail:'auto',edges:'all','min-font':11,focus:null,collapse:[],line:0});
  assert(m.nodes.length<=250,'Prototype limit: 250 nodes/groups.',0);assert(m.edges.length<=800,'Prototype limit: 800 edges.',0);
  const by=new Map(m.nodes.map(n=>[n.id,n]));
  const exists=(n,l)=>assert(by.has(n),'Unknown node/group '+n+'.',l);
  const scope=(n,l)=>assert(n==='root'||by.get(n)?.type==='group','Unknown container scope '+n+'.',l);
  m.nodes.forEach(n=>{scope(n.parent,n.line);let x=n,seen=new Set();while(x){assert(!seen.has(x.id),'Containment cycle at '+x.id+'.',n.line);seen.add(x.id);assert(seen.size<=12,'Prototype limit: 12 nesting levels.',n.line);x=by.get(x.parent);}});
  m.edges.forEach(e=>{exists(e.source,e.line);exists(e.target,e.line);});
  const validView=(v,l)=>assert(v==='*'||m.views.some(x=>x.id===v),'Unknown view '+v+'.',l);
  m.layouts.forEach(x=>{scope(x.scope,x.line);validView(x.view,x.line);});
  m.hints.forEach(h=>{validView(h.view,h.line);if(h.scope)scope(h.scope,h.line);if(h.id)exists(h.id,h.line);if(h.ref){exists(h.ref,h.line);assert(by.get(h.ref).parent===by.get(h.id).parent,'Relative placement is sibling-scoped. Place the containing groups relative to one another instead.',h.line);}if(h.ids){h.ids.forEach(x=>exists(x,h.line));assert(new Set(h.ids).size===h.ids.length,'Duplicate member in '+h.type+'.',h.line);const parent=h.scope||by.get(h.ids[0]).parent;assert(h.ids.every(x=>by.get(x).parent===parent),'Members of '+h.type+' must be direct siblings in its scope.',h.line);}if(h.type==='size')assert(by.get(h.id).type==='node','Use layout min-width/min-height to reserve room in a group.',h.line);});
  m.views.forEach(v=>{if(v.focus)exists(v.focus,v.line);v.collapse.forEach(x=>{exists(x,v.line);assert(by.get(x).type==='group','Only groups can collapse: '+x+'.',v.line);});});
  m.snapshots.forEach(x=>validView(x.view,x.line));m.boxes.forEach(x=>{validView(x.view,x.line);assert(m.snapshots.some(s=>s.view===x.view),'box requires a snapshot declaration for view '+x.view+'.',x.line);});
  return m;
}
function effectiveHints(m,view) {
  const hs=m.hints.filter(h=>h.view==='*'||h.view===view);
  // A view-specific position preference replaces a global position preference for that object.
  const pos=['near','nudge','stay','pin'];const withLocal=new Set(hs.filter(h=>h.view===view&&pos.includes(h.type)).map(h=>h.id));
  return hs.filter(h=>!(h.view==='*'&&pos.includes(h.type)&&withLocal.has(h.id))).filter(h=>h.view!=='*'||!hs.some(v=>v.view===view&&v.type===h.type&&(h.type==='order'?v.scope===h.scope:h.type==='size'?v.id===h.id:false)));
}
function layoutFor(m,scope,v){return m.layouts.find(l=>l.scope===scope&&l.view===v.id)||m.layouts.find(l=>l.scope===scope&&l.view==='*')||{scope,algorithm:scope==='root'?'flow':'column',direction:'auto',gap:scope==='root'?48:24,columns:'auto','min-width':0,'min-height':0,view:'*'};}
function wrap(text,limit){const lines=[];for(const part of String(text).split(/\n/)){let line='';for(let w of part.split(/\s+/)){while(w.length>limit){if(line){lines.push(line);line='';}lines.push(w.slice(0,limit));w=w.slice(limit);}if(!w)continue;if(line.length+w.length+1>limit){lines.push(line);line=w;}else line+=(line?' ':'')+w;}lines.push(line);}return lines.length?lines:[''];}
function project(m,v,collapsed){
  const by=new Map(m.nodes.map(n=>[n.id,n])),children=new Map([['root',[]]]);m.nodes.forEach(n=>{if(!children.has(n.parent))children.set(n.parent,[]);children.get(n.parent).push(n.id);if(n.type==='group'&&!children.has(n.id))children.set(n.id,[]);});
  const descendants=id=>{const a=[];function visit(x){a.push(x);(children.get(x)||[]).forEach(visit);}visit(id);return a;};
  let allowed=new Set(m.nodes.map(n=>n.id));const focusSet=v.focus?new Set(descendants(v.focus)):new Set();
  if(v.focus){allowed=new Set(focusSet);m.edges.forEach(e=>{if(focusSet.has(e.source))allowed.add(e.target);if(focusSet.has(e.target))allowed.add(e.source);});for(const id of [...allowed]){let n=by.get(id);while(n&&n.parent!=='root'){allowed.add(n.parent);n=by.get(n.parent);}}}
  const rep=id=>{if(!allowed.has(id))return null;let n=by.get(id),r=id;while(n){if(collapsed.has(n.id))r=n.id;n=by.get(n.parent);}return r;};
  const visible=m.nodes.filter(n=>allowed.has(n.id)&&rep(n.id)===n.id).map(n=>({...n,collapsed:collapsed.has(n.id),descendantCount:descendants(n.id).length-1,leafCount:descendants(n.id).filter(id=>by.get(id).type==='node').length}));
  const visibleIds=new Set(visible.map(n=>n.id)),edges=[],merge=new Map();const stats={excluded:0,internal:0,filtered:0,represented:0};
  m.edges.forEach(e=>{const s=rep(e.source),t=rep(e.target);if(!s||!t){stats.excluded++;return;}if(s===t&&(e.source!==e.target||s!==e.source)){stats.internal++;return;}if(v.edges==='primary'&&e.importance<7){stats.filtered++;return;}stats.represented++;
    const redirected=s!==e.source||t!==e.target;const key=redirected?s+'|'+t+'|'+e.kind:e.id;
    if(merge.has(key)){const ex=merge.get(key);ex.members.push(e.id);ex.labels.push(e.label);ex.importance=Math.max(ex.importance,e.importance);ex.label=ex.members.length+' links';}
    else{const ne={...e,id:key,source:s,target:t,members:[e.id],labels:[e.label],redirected};merge.set(key,ne);edges.push(ne);}
  });
  const hidden=m.nodes.filter(n=>n.type==='node'&&!visibleIds.has(n.id)).length;
  return {nodes:visible,edges,stats,hidden,allowed,focusSet,children,by};
}
function rankLayers(ids,edges,order){
  const adj=new Map(ids.map(id=>[id,[]]));edges.forEach(([a,b])=>{if(a!==b&&adj.has(a)&&adj.has(b)&&!adj.get(a).includes(b))adj.get(a).push(b);});
  const index=new Map(),low=new Map(),stack=[],on=new Set(),comps=[];let k=0;
  function visit(v){index.set(v,k);low.set(v,k++);stack.push(v);on.add(v);for(const w of adj.get(v)){if(!index.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(on.has(w))low.set(v,Math.min(low.get(v),index.get(w)));}if(low.get(v)===index.get(v)){const c=[];let w;do{w=stack.pop();on.delete(w);c.push(w);}while(w!==v);comps.push(c);}}
  ids.forEach(id=>{if(!index.has(id))visit(id);});const cid=new Map();comps.forEach((c,i)=>c.forEach(n=>cid.set(n,i)));const next=comps.map(()=>new Set()),ind=comps.map(()=>0),r=comps.map(()=>0);
  edges.forEach(([a,b])=>{const ca=cid.get(a),cb=cid.get(b);if(ca!==undefined&&cb!==undefined&&ca!==cb&&!next[ca].has(cb)){next[ca].add(cb);ind[cb]++;}});
  const priority=i=>Math.min(...comps[i].map(x=>order.indexOf(x)));let q=comps.map((_,i)=>i).filter(i=>!ind[i]);while(q.length){q.sort((a,b)=>priority(a)-priority(b));const a=q.shift();for(const b of next[a]){r[b]=Math.max(r[b],r[a]+1);if(--ind[b]===0)q.push(b);}}
  const layers=[];order.forEach(id=>{const rr=r[cid.get(id)];(layers[rr]||(layers[rr]=[])).push(id);});return layers.filter(Boolean);
}
function baseLayout(items,layout,pairs,budget,v){
  const out=new Map(),gap=layout.gap,axis=layout.direction==='auto'?(v.width>=700&&v.width/v.height>1.12?'right':'down'):layout.direction;
  const put=(id,x,y)=>out.set(id,{x:round(x),y:round(y)});const ids=items.map(x=>x.id),by=new Map(items.map(x=>[x.id,x]));if(!items.length)return {positions:out,axis};
  if(layout.algorithm==='row'||layout.algorithm==='column'){
    let cursor=0;items.forEach(n=>{put(n.id,layout.algorithm==='row'?cursor:0,layout.algorithm==='column'?cursor:0);cursor+=(layout.algorithm==='row'?n.w:n.h)+gap;});
  }else if(layout.algorithm==='grid'){
    const mw=Math.max(...items.map(n=>n.w)),cols=layout.columns==='auto'?clamp(Math.floor((budget+gap)/(mw+gap)),1,items.length):Math.min(layout.columns,items.length);
    const cw=Array(cols).fill(0),rh=Array(Math.ceil(items.length/cols)).fill(0);items.forEach((n,i)=>{cw[i%cols]=Math.max(cw[i%cols],n.w);rh[Math.floor(i/cols)]=Math.max(rh[Math.floor(i/cols)],n.h);});items.forEach((n,i)=>{put(n.id,cw.slice(0,i%cols).reduce((s,x)=>s+x+gap,0),rh.slice(0,Math.floor(i/cols)).reduce((s,x)=>s+x+gap,0));});
  }else if(layout.algorithm==='radial'){
    const maxD=Math.max(...items.map(n=>Math.hypot(n.w,n.h))),radius=items.length===1?0:Math.max(maxD*.75,(maxD+gap)*items.length/(2*Math.PI));items.forEach((n,i)=>{const a=-Math.PI/2+2*Math.PI*i/items.length;put(n.id,radius+Math.cos(a)*radius+(maxD-n.w)/2,radius+Math.sin(a)*radius+(maxD-n.h)/2);});
  }else{
    const layers=pairs.length?rankLayers(ids,pairs,ids):ids.map(id=>[id]);const dims=layers.map(layer=>({major:Math.max(...layer.map(id=>axis==='right'?by.get(id).w:by.get(id).h)),minor:layer.reduce((s,id)=>s+(axis==='right'?by.get(id).h:by.get(id).w),0)+gap*(layer.length-1)}));
    let major=0;layers.forEach((layer,i)=>{let minor=0;layer.forEach(id=>{put(id,axis==='right'?major:minor,axis==='right'?minor:major);minor+=(axis==='right'?by.get(id).h:by.get(id).w)+gap;});major+=dims[i].major+gap;});
  }
  return {positions:out,axis};
}
class Union {constructor(ids){this.p=new Map(ids.map(x=>[x,x]));}find(x){let r=x;while(this.p.get(r)!==r)r=this.p.get(r);return r;}join(a,b){a=this.find(a);b=this.find(b);if(a!==b)this.p.set(b,a);}}
function refine(items,base,hs,scope,diagnostics,axis){
  const ids=items.map(n=>n.id),by=new Map(items.map(n=>[n.id,n])),pos=new Map(items.map(n=>[n.id,{...base.get(n.id)}])),weight=new Map(ids.map(id=>[id,1]));
  const local=hs.filter(h=>h.id?by.has(h.id):h.ids?h.ids.every(id=>by.has(id)):false);
  // Soft stays and nudges are explicit inputs, never copied from an unrecorded last frame.
  local.filter(h=>h.type==='stay').forEach(h=>{pos.set(h.id,{x:h.x,y:h.y});weight.set(h.id,h.weight);});
  local.filter(h=>h.type==='nudge').forEach(h=>{const p=base.get(h.id);pos.set(h.id,{x:p.x+h.dx,y:p.y+h.dy});weight.set(h.id,4);});
  const near=new Map(local.filter(h=>h.type==='near'&&by.has(h.ref)).map(h=>[h.id,h])),done=new Set(),visiting=new Set();
  function place(id){if(done.has(id)||!near.has(id))return;if(visiting.has(id))throw new DslError('Relative-placement cycle in scope '+scope+'. Replace one near with nudge.',near.get(id).line);visiting.add(id);const h=near.get(id);place(h.ref);const a=by.get(id),b=by.get(h.ref),p=pos.get(h.ref);let x=p.x+(b.w-a.w)/2,y=p.y+(b.h-a.h)/2;
    if(h.side==='right'){x=p.x+b.w+h.gap;y+=h.offset;}if(h.side==='left'){x=p.x-a.w-h.gap;y+=h.offset;}if(h.side==='below'){y=p.y+b.h+h.gap;x+=h.offset;}if(h.side==='above'){y=p.y-a.h-h.gap;x+=h.offset;}pos.set(id,{x,y});weight.set(id,5);visiting.delete(id);done.add(id);}
  ids.forEach(place);
  local.filter(h=>h.type==='align'&&h.strength==='prefer').forEach(h=>{const ref=h.ids[0],n=by.get(ref),p=pos.get(ref),center=p[h.axis]+(h.axis==='x'?n.w:n.h)/2;h.ids.slice(1).forEach(id=>{const item=by.get(id);pos.get(id)[h.axis]=center-(h.axis==='x'?item.w:item.h)/2;});});
  const pins=new Map(local.filter(h=>h.type==='pin').map(h=>[h.id,h]));pins.forEach((h,id)=>{pos.set(id,{x:h.x,y:h.y});});
  const uf={x:new Union(ids),y:new Union(ids)};
  local.filter(h=>h.type==='align'&&h.strength==='required').forEach(h=>h.ids.slice(1).forEach(id=>{
    const roots=new Set([uf[h.axis].find(h.ids[0]),uf[h.axis].find(id)]),fixed=ids.filter(k=>pins.has(k)&&roots.has(uf[h.axis].find(k))).map(k=>pos.get(k)[h.axis]+(h.axis==='x'?by.get(k).w:by.get(k).h)/2);
    if(fixed.length>1&&Math.max(...fixed)-Math.min(...fixed)>.01){diagnostics.push({level:'error',code:'pin-align-conflict',message:'Incompatible pins and required '+h.axis+' alignment in '+scope+'. Pins were preserved; alignment was not enforced.'});}
    else uf[h.axis].join(h.ids[0],id);
  }));
  const vars={x:new Map(),y:new Map()};for(const a of ['x','y'])for(const id of ids){const root=uf[a].find(id),n=by.get(id),center=pos.get(id)[a]+(a==='x'?n.w:n.h)/2;if(!vars[a].has(root))vars[a].set(root,{sum:0,weight:0,value:0,fixed:null,members:[]});const z=vars[a].get(root);z.sum+=center*weight.get(id);z.weight+=weight.get(id);z.members.push(id);if(pins.has(id)){if(z.fixed!==null&&Math.abs(z.fixed-center)>.01)diagnostics.push({level:'error',code:'pin-align-conflict',message:'Incompatible pins and required '+a+' alignment in '+scope+'.'});else z.fixed=center;}}
  for(const a of ['x','y'])for(const z of vars[a].values())z.value=z.fixed===null?z.sum/z.weight:z.fixed;
  const variable=(a,id)=>vars[a].get(uf[a].find(id));const center=(a,id)=>variable(a,id).value;
  function separate(a,id1,id2,gap){const u=variable(a,id1),w=variable(a,id2),delta=gap-(u.value-w.value);if(delta<=.005||u===w)return 0;if(u.fixed!==null&&w.fixed!==null)return 0;if(u.fixed!==null)w.value-=delta;else if(w.fixed!==null)u.value+=delta;else{const total=u.weight+w.weight;u.value+=delta*w.weight/total;w.value-=delta*u.weight/total;}return delta;}
  const required=local.filter(h=>h.type==='near'&&h.strength==='required'&&by.has(h.ref));const minGap=12;
  for(let pass=0;pass<48;pass++){
    let movement=0;
    for(const h of required){const a=h.side==='right'||h.side==='left'?'x':'y',plus=h.side==='right'||h.side==='below',n=by.get(h.id),r=by.get(h.ref),gap=(a==='x'?n.w+r.w:n.h+r.h)/2+h.gap;movement+=separate(a,plus?h.id:h.ref,plus?h.ref:h.id,gap);}
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
      const a=items[i],b=items[j],dx=center('x',b.id)-center('x',a.id),dy=center('y',b.id)-center('y',a.id),ox=(a.w+b.w)/2+minGap-Math.abs(dx),oy=(a.h+b.h)/2+minGap-Math.abs(dy);if(ox<=.005||oy<=.005)continue;
      const choices=['x','y'].filter(ax=>variable(ax,a.id)!==variable(ax,b.id)&&!(variable(ax,a.id).fixed!==null&&variable(ax,b.id).fixed!==null));if(!choices.length)continue;
      choices.sort((p,q)=>((p==='x'?ox:oy)+(p===(axis==='right'?'x':'y')?0:3))-((q==='x'?ox:oy)+(q===(axis==='right'?'x':'y')?0:3)));
      const ax=choices[0],d=ax==='x'?dx:dy,first=d>=0?b.id:a.id,second=d>=0?a.id:b.id;movement+=separate(ax,first,second,(ax==='x'?a.w+b.w:a.h+b.h)/2+minGap);
    }
    // Group-local content origins are nonnegative; fixed pins are never adjusted.
    for(const a of ['x','y'])for(const z of vars[a].values()){const half=Math.max(...z.members.map(id=>(a==='x'?by.get(id).w:by.get(id).h)/2));if(z.value<half&&z.fixed===null){movement+=half-z.value;z.value=half;}}
    if(movement<.01)break;
  }
  for(const n of items)pos.set(n.id,{x:round(center('x',n.id)-n.w/2),y:round(center('y',n.id)-n.h/2)});
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j],pa=pos.get(a.id),pb=pos.get(b.id);if(pa.x+a.w>pb.x+.1&&pb.x+b.w>pa.x+.1&&pa.y+a.h>pb.y+.1&&pb.y+b.h>pa.y+.1)diagnostics.push({level:'error',code:'overlap',message:`${a.id} overlaps ${b.id}; relax a pin/alignment or give ${scope} more room.`});}
  for(const h of required){const a=by.get(h.id),b=by.get(h.ref),p=pos.get(a.id),q=pos.get(b.id),distance=h.side==='right'?p.x-q.x-b.w:h.side==='left'?q.x-p.x-a.w:h.side==='below'?p.y-q.y-b.h:q.y-p.y-a.h;if(distance<h.gap-.2)diagnostics.push({level:'error',code:'unsatisfied-near',message:`Required ${h.id} ${h.side} ${h.ref} is not satisfied.`});}
  return pos;
}
function segmentHits(a,b,r){const eps=.05;if(Math.abs(a.x-b.x)<eps)return a.x>r.x+eps&&a.x<r.x+r.w-eps&&Math.max(a.y,b.y)>r.y+eps&&Math.min(a.y,b.y)<r.y+r.h-eps;if(Math.abs(a.y-b.y)<eps)return a.y>r.y+eps&&a.y<r.y+r.h-eps&&Math.max(a.x,b.x)>r.x+eps&&Math.min(a.x,b.x)<r.x+r.w-eps;return false;}
function simplify(points){const a=[];for(const p of points){const q={x:round(p.x),y:round(p.y)};if(!a.length||q.x!==a.at(-1).x||q.y!==a.at(-1).y)a.push(q);while(a.length>=3){const [u,v,w]=a.slice(-3);if((u.x===v.x&&v.x===w.x)||(u.y===v.y&&v.y===w.y))a.splice(a.length-2,1);else break;}}return a;}
function port(n,side,offset=0){if(side==='left')return{x:n.x,y:n.y+n.h/2+offset};if(side==='right')return{x:n.x+n.w,y:n.y+n.h/2+offset};if(side==='top')return{x:n.x+n.w/2+offset,y:n.y};return{x:n.x+n.w/2+offset,y:n.y+n.h};}
function lead(p,side){return{x:p.x+(side==='left'?-14:side==='right'?14:0),y:p.y+(side==='top'?-14:side==='bottom'?14:0)};}
function routeEdges(nodes,edges,diagnostics){
  const by=new Map(nodes.map(n=>[n.id,n])),obstacles=nodes.filter(n=>n.type==='node'||n.collapsed),result=[];
  edges.forEach((edge,ei)=>{
    const a=by.get(edge.source),b=by.get(edge.target);if(!a||!b)return;let best=null;
    if(a.id===b.id){const x=a.x+a.w,y=a.y+a.h/2;best={points:[{x,y:y-12},{x:x+36,y:y-12},{x:x+36,y:y+36},{x:x-24,y:y+36},{x:x-24,y:a.y+a.h}],hits:0,cost:0};}
    else {
      const dx=b.x+b.w/2-a.x-a.w/2,dy=b.y+b.h/2-a.y-a.h/2;
      const pairs=Math.abs(dx)>=Math.abs(dy)?[[dx>=0?'right':'left',dx>=0?'left':'right'],[dy>=0?'bottom':'top',dy>=0?'top':'bottom']]:[[dy>=0?'bottom':'top',dy>=0?'top':'bottom'],[dx>=0?'right':'left',dx>=0?'left':'right']];
      if(edge.from!=='auto'||edge.to!=='auto')pairs.splice(0,pairs.length,[edge.from==='auto'?pairs[0][0]:edge.from,edge.to==='auto'?pairs[0][1]:edge.to]);
      for(const [sf,tf] of pairs){const s=port(a,sf),t=port(b,tf),sl=lead(s,sf),tl=lead(t,tf),xs=[(sl.x+tl.x)/2],ys=[(sl.y+tl.y)/2];
        obstacles.forEach(o=>{if(o.id!==a.id&&o.id!==b.id){xs.push(o.x-16,o.x+o.w+16);ys.push(o.y-16,o.y+o.h+16);}});
        xs.push(Math.min(a.x,b.x)-24,Math.max(a.x+a.w,b.x+b.w)+24);ys.push(Math.min(a.y,b.y)-24,Math.max(a.y+a.h,b.y+b.h)+24);
        const candidates=[[s,sl,{x:tl.x,y:sl.y},tl,t],[s,sl,{x:sl.x,y:tl.y},tl,t]];
        [...new Set(xs)].slice(0,90).forEach(x=>candidates.push([s,sl,{x,y:sl.y},{x,y:tl.y},tl,t]));[...new Set(ys)].slice(0,90).forEach(y=>candidates.push([s,sl,{x:sl.x,y},{x:tl.x,y},tl,t]));
        for(const raw of candidates){const pts=simplify(raw);let hits=0,length=0;for(let i=1;i<pts.length;i++){length+=Math.abs(pts[i].x-pts[i-1].x)+Math.abs(pts[i].y-pts[i-1].y);for(const o of obstacles){if((o.id===a.id&&i===1)||(o.id===b.id&&i===pts.length-1))continue;if(segmentHits(pts[i-1],pts[i],o))hits++;}}const cost=hits*100000+length+(pts.length-2)*20;if(!best||cost<best.cost-.001)best={points:pts,cost,hits};}
      }
    }
    const pts=best.points,lines=edge.label?wrap(edge.label,22):[],lw=lines.length?Math.max(...lines.map(s=>s.length))*7+12:0,lh=lines.length*14;
    let mid={x:pts[0].x,y:pts[0].y},labelBox={x:mid.x,y:mid.y,w:lw,h:lh},labelHits=0;
    if(lines.length){
      const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
      const avoid=[...obstacles,...nodes.filter(n=>n.type==='group'&&!n.collapsed).map(n=>({x:n.x,y:n.y,w:n.w,h:39}))];
      const candidates=[];
      for(let i=1;i<pts.length;i++) {const a=pts[i-1],b=pts[i],d=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);if(d<10)continue;for(const t of [.5,.25,.75])for(const side of [-1,1])for(const lift of [0,20,40,60]){const horizontal=a.y===b.y,cx=a.x+(b.x-a.x)*t+(horizontal?0:side*(lw/2+6+lift)),cy=a.y+(b.y-a.y)*t+(horizontal?side*(lh/2+5+lift):0),r={x:round(cx-lw/2),y:round(cy-lh/2),w:lw,h:lh};let hits=0,area=0;for(const o of avoid){const z=overlap(r,o);if(z>.1){hits++;area+=z;}}for(const e of result){if(e.labelLines.length){const z=overlap(r,e.labelBox);if(z>.1){hits++;area+=z;}}}const cost=hits*100000+area*10+Math.max(0,lw-d)*2+(1-t)*.1+(side===1?2:0)+lift*2-Math.min(d,150)*.05;candidates.push({r,cost,hits});}}
      candidates.sort((a,b)=>a.cost-b.cost);if(candidates.length){labelBox=candidates[0].r;labelHits=candidates[0].hits;mid={x:round(labelBox.x+lw/2),y:round(labelBox.y+11)};}
      if(labelHits)diagnostics.push({level:'warning',code:'edge-label',message:`Label for ${edge.members.join(', ')} could not avoid every box/label. Try a larger gap or fewer visible edges.`});
    }
    if(best.hits)diagnostics.push({level:'warning',code:'edge-route',message:`Route ${edge.members.join(', ')} crosses a box. The prototype router is heuristic.`});
    result.push({...edge,points:pts,path:pts.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' '),labelLines:lines,labelX:round(mid.x),labelY:round(mid.y),labelBox,routeHits:best.hits});
  });return result;
}
function boundsOf(nodes,edges){const rects=nodes.map(n=>({x:n.x,y:n.y,w:n.w,h:n.h}));edges.forEach(e=>{e.points.forEach(p=>rects.push({x:p.x,y:p.y,w:0,h:0}));if(e.labelLines.length)rects.push(e.labelBox);});if(!rects.length)return{x:0,y:0,w:200,h:120};const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));return{x:round(x),y:round(y),w:round(Math.max(...rects.map(r=>r.x+r.w))-x),h:round(Math.max(...rects.map(r=>r.y+r.h))-y)};}
function fitFor(bounds,v){const scale=Math.min(1,(v.width-48)/Math.max(1,bounds.w),(v.height-100)/Math.max(1,bounds.h));return{scale:round(scale*4096)/4096,tx:round((v.width-bounds.w*scale)/2-bounds.x*scale),ty:round(48+(v.height-100-bounds.h*scale)/2-bounds.y*scale)};}
function buildScene(m,v,collapsed,hs){
  const p=project(m,v,collapsed),visible=new Map(p.nodes.map(n=>[n.id,n])),diags=[],boxes=new Map(),baseBy=new Map(),scopes={};
  const immediate=(id,scope)=>{let n=visible.get(id);while(n&&n.parent!==scope)n=visible.get(n.parent);return n?.id;};
  function arrange(scope,budget){
    const kids=p.nodes.filter(n=>n.parent===scope),l=layoutFor(m,scope,v),oh=hs.find(h=>h.type==='order'&&h.scope===scope);let order=kids.map(n=>n.id);if(oh)order=[...oh.ids.filter(id=>order.includes(id)),...order.filter(id=>!oh.ids.includes(id))];
    const items=order.map(id=>{
      const n=visible.get(id);let w,h,titleLines,detailLines;
      if(n.type==='group'&&!n.collapsed){const sub=arrange(n.id,Math.max(184,budget-44));w=Math.max(220,sub.w+44,l.scope===n.id?l['min-width']:0);h=Math.max(110,sub.h+70);const own=layoutFor(m,n.id,v);w=Math.max(w,own['min-width']);h=Math.max(h,own['min-height']);titleLines=wrap(n.label,Math.floor((w-60)/7.4));if(titleLines.length>1)diags.push({level:'warning',code:'group-title',message:`Group ${id} title is long; the header displays its first line. Full text is in the outline.`});detailLines=[];}
      else {const size=hs.find(h=>h.type==='size'&&h.id===id);w=n.type==='group'?210:size?.width||184;titleLines=wrap(n.label,Math.max(5,Math.floor((w-32)/8.2)));detailLines=wrap(n.type==='group'?n.leafCount+' components':n.detail||n.kind,Math.max(6,Math.floor((w-32)/6.8)));h=Math.max(size?.height||0,32+titleLines.length*18+detailLines.length*14);}
      const box={...n,w:round(w),h:round(h),x:0,y:0,localX:0,localY:0,titleLines,detailLines};boxes.set(id,box);return box;
    });
    const pairs=p.edges.map(e=>[immediate(e.source,scope),immediate(e.target,scope)]).filter(([a,b])=>a&&b&&a!==b);
    const base=baseLayout(items,l,pairs,budget,v),pos=refine(items,base.positions,hs,scope,diags,base.axis);scopes[scope]={...l,axis:base.axis,children:order};
    items.forEach(n=>{const b=boxes.get(n.id),xy=pos.get(n.id),bp=base.positions.get(n.id);b.localX=xy.x;b.localY=xy.y;baseBy.set(n.id,bp);});
    return{w:items.length?Math.max(...items.map(n=>pos.get(n.id).x+n.w)):0,h:items.length?Math.max(...items.map(n=>pos.get(n.id).y+n.h)):0};
  }
  arrange('root',v.width-48);
  function absolute(scope,ox,oy,depth){for(const n of p.nodes.filter(n=>n.parent===scope)){const b=boxes.get(n.id);b.x=round(ox+b.localX);b.y=round(oy+b.localY);b.depth=depth;b.baseX=baseBy.get(n.id).x;b.baseY=baseBy.get(n.id).y;if(n.type==='group'&&!n.collapsed)absolute(n.id,b.x+22,b.y+48,depth+1);}}
  absolute('root',0,0,0);const nodes=p.nodes.map(n=>boxes.get(n.id)),edges=routeEdges(nodes,p.edges,diags),bounds=boundsOf(nodes,edges),fit=fitFor(bounds,v);
  return {title:m.title,engine:VERSION,view:{...v},nodes,edges,bounds,fit,scopes,diagnostics:diags,hidden:p.hidden,edgeStats:p.stats,collapsed:[...collapsed].filter(id=>visible.has(id)&&visible.get(id).collapsed),semanticNodeCount:m.nodes.filter(n=>n.type==='node').length,semanticEdgeCount:m.edges.length,focus:v.focus};
}
function layout(m,viewId,overrides={}){
  const original=m.views.find(v=>v.id===viewId)||m.views[0],v={...original,...overrides};
  if(!['interactive','static'].includes(v.mode)||!Number.isFinite(v.width)||!Number.isFinite(v.height)||v.width<240||v.height<200||v.width>4000||v.height>4000)throw new DslError('Invalid render context.');
  const hs=effectiveHints(m,v.id),by=new Map(m.nodes.map(n=>[n.id,n])),collapsed=new Set(v.collapse||[]),protectedGroups=new Set();
  if(v.focus){let n=by.get(v.focus);while(n){protectedGroups.add(n.id);collapsed.delete(n.id);n=by.get(n.parent);}}
  if(v.detail==='overview')m.nodes.filter(n=>n.type==='group'&&n.parent==='root'&&!protectedGroups.has(n.id)).forEach(n=>collapsed.add(n.id));
  let s=buildScene(m,v,collapsed,hs);const automatic=[];
  if(v.mode==='static'&&v.detail==='auto'){
    for(let iteration=0;iteration<16 && s.fit.scale*12<v['min-font']-.01;iteration++){
      const candidates=s.nodes.filter(n=>n.type==='group'&&!n.collapsed&&!protectedGroups.has(n.id)&&n.leafCount>0).sort((a,b)=>a.priority-b.priority||b.depth-a.depth||cmp(a.id,b.id)).slice(0,16);let best=null;
      for(const g of candidates){const next=new Set(collapsed);next.add(g.id);const trial=buildScene(m,v,next,hs),gain=trial.fit.scale-s.fit.scale,score=gain/(1+g.priority*.3);if(gain>.0001&&(!best||score>best.score+.00001))best={id:g.id,scene:trial,score};}
      if(!best)break;collapsed.add(best.id);automatic.push(best.id);s=best.scene;
    }
  }
  const input={engine:VERSION,title:m.title,version:m.version,nodes:withoutLines(m.nodes),edges:withoutLines(m.edges),layouts:withoutLines(m.layouts.filter(l=>l.view==='*'||l.view===v.id)),hints:withoutLines(hs),view:withoutLines(v)};
  s.inputKey=sha256(stable(input));s.automatic=automatic;s.checkpoint='none';
  const snapshot=m.snapshots.find(x=>x.view===v.id);
  if(snapshot){
    const boxes=m.boxes.filter(b=>b.view===v.id),matches=boxes.length===s.nodes.length&&s.nodes.every(n=>boxes.some(b=>b.id===n.id));
    if(snapshot.key===s.inputKey&&snapshot.engine===VERSION&&matches){const byBox=new Map(boxes.map(b=>[b.id,b]));s.nodes=s.nodes.map(n=>{const b=byBox.get(n.id);return{...n,x:b.x,y:b.y,w:b.w,h:b.h};});const nb=new Map(s.nodes.map(n=>[n.id,n]));s.nodes.forEach(n=>{const p=nb.get(n.parent);n.localX=round(n.x-(p?p.x+22:0));n.localY=round(n.y-(p?p.y+48:0));});s.diagnostics=s.diagnostics.filter(d=>d.code!=='edge-route');s.edges=routeEdges(s.nodes,s.edges,s.diagnostics);s.bounds=boundsOf(s.nodes,s.edges);s.fit=fitFor(s.bounds,v);s.checkpoint='replayed';}
    else{s.checkpoint='stale';s.diagnostics.push({level:'info',code:'stale-checkpoint',message:'Checkpoint no longer matches this model/view/intent. It was ignored; the live layout was rebuilt from hints.'});}
  }
  if(v.mode==='static'&&s.fit.scale*12<v['min-font']-.01)s.diagnostics.push({level:'warning',code:'viewport-overflow',message:`Primary text would be about ${(s.fit.scale*12).toFixed(1)} px (minimum ${v['min-font']} px). Use a larger viewport, an overview, or a focused view.`});
  s.geometryKey=hash(geometry(s));return s;
}
function geometry(s){return stable({engine:s.engine,view:{width:s.view.width,height:s.view.height,mode:s.view.mode},nodes:s.nodes.map(n=>({id:n.id,parent:n.parent,x:n.x,y:n.y,w:n.w,h:n.h,collapsed:n.collapsed})),edges:s.edges.map(e=>({id:e.id,path:e.path,labelX:e.labelX,labelY:e.labelY,members:e.members})),bounds:s.bounds,fit:s.fit});}
function compile(source,view,overrides){return layout(parse(source),view,overrides);}
function snapshotText(s){return '# Exact replay cache; automatically ignored after content, intent, or context changes.\n'+`snapshot ${s.view.id} key=${s.inputKey} engine=${VERSION}\n`+s.nodes.map(n=>`box ${s.view.id} ${n.id} x=${n.x} y=${n.y} width=${n.w} height=${n.h}`).join('\n');}
const api={VERSION,DslError,parse,tokenize,compile,layout,geometry,stable,hash,sha256,wrap,round,layoutFor,effectiveHints,snapshotText,routeEdges,boundsOf,fitFor,withoutLines};
if(typeof module!=='undefined'&&module.exports)module.exports=api;global.Meld=api;
})(typeof window!=='undefined'?window:globalThis);
