/* Diagram Studio 5 — joint port selection and obstacle-aware routing.
 * Original local implementation, not libavoid. Pure input/output, Browser + Node.
 * Node positions are never changed. Explicit sides and waypoints are constraints.
 */

 
 const SIDES=['right','bottom','left','top'],EPS=.0001;
 const round=n=>Math.round(n*100)/100,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const clone=v=>JSON.parse(JSON.stringify(v)),cmp=(a,b)=>a<b?-1:a>b?1:0;
 const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
 const same=(a,b)=>Math.abs(a.x-b.x)<EPS&&Math.abs(a.y-b.y)<EPS;
 const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
 const vector={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
 const defaults={clearance:10,portGap:16,edgeGap:16,bendPenalty:32,crossingPenalty:360,sharedPenalty:8,parallelPenalty:18,portStability:20,fanoutPenalty:50,passes:3,cornerRadius:6};
 function settings(raw={}){
  const s={...defaults,...raw},ranges={clearance:[4,30],portGap:[6,28],bendPenalty:[0,100],crossingPenalty:[0,1200],sharedPenalty:[0,20],portStability:[0,150],fanoutPenalty:[0,160],passes:[1,5],edgeGap:[4,48],parallelPenalty:[0,60],cornerRadius:[0,16]};
  for(const [k,[lo,hi]] of Object.entries(ranges)){if(typeof s[k]!=='number'||!Number.isFinite(s[k]))throw Error('Routing '+k+' must be a finite number.');s[k]=clamp(s[k],lo,hi);}s.passes=Math.round(s.passes);return s;
 }
 function inflate(r,p){return{...r,x:round(r.x-p),y:round(r.y-p),w:round(r.w+2*p),h:round(r.h+2*p)};}
 function contains(p,r){return p.x>r.x+EPS&&p.x<r.x+r.w-EPS&&p.y>r.y+EPS&&p.y<r.y+r.h-EPS;}
 function blocked(a,b,obs){
  if(same(a,b))return obs.some(r=>contains(a,r));
  if(Math.abs(a.x-b.x)<EPS)return obs.some(r=>a.x>r.x+EPS&&a.x<r.x+r.w-EPS&&Math.max(a.y,b.y)>r.y+EPS&&Math.min(a.y,b.y)<r.y+r.h-EPS);
  if(Math.abs(a.y-b.y)<EPS)return obs.some(r=>a.y>r.y+EPS&&a.y<r.y+r.h-EPS&&Math.max(a.x,b.x)>r.x+EPS&&Math.min(a.x,b.x)<r.x+r.w-EPS);
  return true;
 }
 function compress(ps){
  const out=[];for(const raw of ps){const p={x:round(raw.x),y:round(raw.y)};if(out.length&&same(out.at(-1),p))continue;
   while(out.length>=2){const a=out.at(-2),b=out.at(-1);const collinear=Math.abs(a.x-b.x)<EPS&&Math.abs(b.x-p.x)<EPS||Math.abs(a.y-b.y)<EPS&&Math.abs(b.y-p.y)<EPS;
    // Never erase a reversal: it would hide a backtracking stub.
    if(collinear&&(b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y)>=0)out.pop();else break;}
   out.push(p);
  }return out;
 }
 function segments(ps){return ps.slice(1).map((b,i)=>[ps[i],b]);}
 function intersection(a,b,c,d){
  const h=Math.abs(a.y-b.y)<EPS,k=Math.abs(c.y-d.y)<EPS;
  if(h===k){const axis=h?'x':'y',line=h?'y':'x';if(Math.abs(a[line]-c[line])>EPS)return null;
   const amount=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));return amount>EPS?{shared:amount}:null;}
  const [u,v,w,z]=h?[a,b,c,d]:[c,d,a,b];const p={x:w.x,y:u.y};
  if(p.x<Math.min(u.x,v.x)-EPS||p.x>Math.max(u.x,v.x)+EPS||p.y<Math.min(w.y,z.y)-EPS||p.y>Math.max(w.y,z.y)+EPS)return null;
  return p;
 }
 // Lane spacing is separate from port spacing and node clearance. Measure the
 // length of overlapping parallel runs, not merely exact shared coordinates.
 function parallelNear(a,b,c,d,gap){
  const h=Math.abs(a.y-b.y)<EPS,k=Math.abs(c.y-d.y)<EPS;if(h!==k)return null;
  const axis=h?'x':'y',line=h?'y':'x';
  const overlap=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]))-Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]));
  const separation=Math.abs(a[line]-c[line]);
  return overlap>1&&separation<gap-.05?{overlap,separation,deficit:overlap*(gap-separation)/gap}:null;
 }
 function parallelConflicts(points,used,gap){
  let deficit=0,pairs=0,minGap=Infinity;
  for(const r of used)for(const [a,b] of segments(points))for(const [c,d] of segments(r.points)){
   const p=parallelNear(a,b,c,d,gap);if(!p)continue;
   // Duplicate terminals need a short common fan-out; do not count the single
   // endpoint itself, but a shared run with positive length still counts.
   pairs++;deficit+=p.deficit;minGap=Math.min(minGap,p.separation);
  }
  return{lanePairs:pairs,laneDeficit:round(deficit),minGap:Number.isFinite(minGap)?round(minGap):null};
 }
 function conflicts(points,used){
  const hits=new Set();let shared=0;
  for(const r of used){for(const [a,b] of segments(points))for(const [c,d] of segments(r.points)){
   const p=intersection(a,b,c,d);if(!p)continue;if(p.shared){shared+=p.shared;continue;}
   // A shared shape terminal is connectivity, not an edge crossing.
   if((same(p,points[0])||same(p,points.at(-1)))&&(same(p,r.points[0])||same(p,r.points.at(-1))))continue;
   hits.add(r.id+':'+round(p.x)+','+round(p.y));
  }}return{crossings:hits.size,shared};
 }
 function cost(ps,used,s){const c=conflicts(ps,used);return segments(ps).reduce((n,[a,b])=>n+distance(a,b),0)+Math.max(0,ps.length-2)*s.bendPenalty+c.crossings*s.crossingPenalty+c.shared*s.sharedPenalty+parallelConflicts(ps,used,s.edgeGap).laneDeficit*s.parallelPenalty+segments(ps).slice(1,-1).reduce((sum,[a,b])=>sum+Math.max(0,8-distance(a,b))*4,0);}
 class Heap{constructor(){this.q=[];}push(v){let i=this.q.length;this.q.push(v);while(i){const p=(i-1)>>1;if(this.q[p].f<=v.f)break;this.q[i]=this.q[p];i=p;}this.q[i]=v;}pop(){const r=this.q[0],v=this.q.pop();if(this.q.length){let i=0;while(i*2+1<this.q.length){let j=i*2+1;if(j+1<this.q.length&&this.q[j+1].f<this.q[j].f)j++;if(this.q[j].f>=v.f)break;this.q[i]=this.q[j];i=j;}this.q[i]=v;}return r;}get length(){return this.q.length;}}
 function search(start,end,obs,used,s,limit=16000){
  const xs=[start.x,end.x],ys=[start.y,end.y];
  for(const r of obs){xs.push(r.x,r.x+r.w);ys.push(r.y,r.y+r.h);}
  for(const p of [start,end]){xs.push(p.x-s.edgeGap,p.x+s.edgeGap);ys.push(p.y-s.edgeGap,p.y+s.edgeGap);}
  // Extra lanes beside existing paths allow rerouting without bundling them.
  for(const r of used)for(const p of r.points){xs.push(p.x-s.edgeGap,p.x+s.edgeGap);ys.push(p.y-s.edgeGap,p.y+s.edgeGap);}
  xs.push(Math.min(...xs)-32,Math.max(...xs)+32);ys.push(Math.min(...ys)-32,Math.max(...ys)+32);
  const X=[...new Set(xs.map(round))].sort((a,b)=>a-b),Y=[...new Set(ys.map(round))].sort((a,b)=>a-b),nx=X.length,ny=Y.length;
  const startCell=Y.indexOf(round(start.y))*nx+X.indexOf(round(start.x)),endCell=Y.indexOf(round(end.y))*nx+X.indexOf(round(end.x));
  const heap=new Heap(),scores=new Map(),prev=new Map(),cache=new Map();
  // Compile route geometry once per search; avoid allocating paths and segment
  // arrays for every grid edge visited by A*. Touching terminals are excluded.
  const existing=used.flatMap(r=>segments(r.points).map(([a,b])=>({a,b,id:r.id,first:r.points[0],last:r.points.at(-1)})));
  function segmentCost(a,b){let shared=0;const hits=new Set();for(const t of existing){const p=intersection(a,b,t.a,t.b);if(!p)continue;if(p.shared){shared+=p.shared;continue;}if((same(p,start)||same(p,end))&&(same(p,t.first)||same(p,t.last)))continue;hits.add(t.id+':'+p.x+','+p.y);}let near=0;for(const t of existing){const q=parallelNear(a,b,t.a,t.b,s.edgeGap);if(q)near+=q.deficit;}return distance(a,b)+hits.size*s.crossingPenalty+shared*s.sharedPenalty+near*s.parallelPenalty;}

  for(const dir of [0,1]){const key=startCell*2+dir;scores.set(key,0);heap.push({key,g:0,f:distance(start,end)});}
  let result=null,visits=0;
  while(heap.length&&visits++<limit){const c=heap.pop();if(c.g!==scores.get(c.key))continue;const cell=Math.floor(c.key/2),dir=c.key%2;if(cell===endCell){result=c.key;break;}
   const x=cell%nx,y=Math.floor(cell/nx),a={x:X[x],y:Y[y]};
   for(const [dx,dy,nd] of [[1,0,0],[0,1,1],[-1,0,0],[0,-1,1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=nx||yy>=ny)continue;
    const nc=yy*nx+xx,key=nc*2+nd,b={x:X[xx],y:Y[yy]},ck=Math.min(cell,nc)+':'+Math.max(cell,nc);let k=cache.get(ck);
    if(k===undefined){k=blocked(a,b,obs)?Infinity:segmentCost(a,b);cache.set(ck,k);}if(!Number.isFinite(k))continue;
    const g=c.g+k+(dir!==nd?s.bendPenalty:0);if(g>=(scores.get(key)??Infinity)-.001)continue;scores.set(key,g);prev.set(key,c.key);heap.push({key,g,f:g+distance(b,end)});
   }
  }
  if(result===null)return null;const ps=[];for(let k=result;k!==undefined;k=prev.get(k)){const cell=Math.floor(k/2);ps.push({x:X[cell%nx],y:Y[Math.floor(cell/nx)]});}return compress(ps.reverse());
 }
 function doglegs(a,b,obs,s,used=[]){
  const choices=[[a,b],[a,{x:b.x,y:a.y},b],[a,{x:a.x,y:b.y},b]],xs=new Set([(a.x+b.x)/2]),ys=new Set([(a.y+b.y)/2]);
  for(const r of obs){if(r.x<Math.max(a.x,b.x)+80&&r.x+r.w>Math.min(a.x,b.x)-80){ys.add(r.y);ys.add(r.y+r.h);}if(r.y<Math.max(a.y,b.y)+80&&r.y+r.h>Math.min(a.y,b.y)-80){xs.add(r.x);xs.add(r.x+r.w);}}
  for(const r of used)for(const [u,v] of segments(r.points)){if(Math.abs(u.x-v.x)<EPS){xs.add(u.x-s.edgeGap);xs.add(u.x+s.edgeGap);}else{ys.add(u.y-s.edgeGap);ys.add(u.y+s.edgeGap);}}
  xs.add(Math.min(a.x,b.x)-s.portGap);xs.add(Math.max(a.x,b.x)+s.portGap);ys.add(Math.min(a.y,b.y)-s.portGap);ys.add(Math.max(a.y,b.y)+s.portGap);
  for(const x of xs)choices.push([a,{x,y:a.y},{x,y:b.y},b]);for(const y of ys)choices.push([a,{x:a.x,y},{x:b.x,y},b]);
  return choices.map(compress).filter(ps=>!segments(ps).some(([c,d])=>blocked(c,d,obs)));
 }
 function port(rect,side,offset=0){
  const r=rect,shape=r.shape||'box';let x=r.x+r.w/2,y=r.y+r.h/2;
  if(side==='left'||side==='right'){y+=clamp(offset,-r.h/2+10,r.h/2-10);let inset=0;if(['circle','icon','pill'].includes(shape)){const radius=shape==='pill'?Math.min(r.h/2,r.w/2):r.w/2;inset=radius*(1-Math.sqrt(Math.max(0,1-((y-r.y-r.h/2)/(r.h/2))**2)));}if(shape==='diamond')inset=Math.abs(y-r.y-r.h/2)*r.w/r.h;x=side==='left'?r.x+inset:r.x+r.w-inset;}
  else{x+=clamp(offset,-r.w/2+10,r.w/2-10);let inset=0;if(['circle','icon'].includes(shape))inset=r.h/2*(1-Math.sqrt(Math.max(0,1-((x-r.x-r.w/2)/(r.w/2))**2)));if(shape==='pill'){const radius=Math.min(r.h/2,r.w/2),beyond=Math.max(0,Math.abs(x-r.x-r.w/2)-(r.w/2-radius));inset=radius-Math.sqrt(Math.max(0,radius*radius-beyond*beyond));}if(shape==='diamond')inset=Math.abs(x-r.x-r.w/2)*r.h/r.w;y=side==='top'?r.y+inset:r.y+r.h-inset;}return{x:round(x),y:round(y)};
 }
 function slot(id,side,r,used,s,other){
  const vertical=side==='left'||side==='right',span=(vertical?r.h:r.w)-24,cross=vertical?'y':'x',desired=center(other)[cross]-center(r)[cross];
  const separation=Math.max(s.portGap,s.edgeGap);const occupied=[];for(const q of used){if(q.from===id&&q.fromSide===side)occupied.push(q.fromOffset);if(q.to===id&&q.toSide===side)occupied.push(q.toOffset);}
  const options=[0];for(let i=1;i<=8;i++)for(const sign of [1,-1])if(i*separation<=span/2+EPS)options.push(sign*i*separation);
  options.sort((a,b)=>Math.abs(a)-Math.abs(b)||(desired<0?a-b:b-a));
  for(const n of options)if(occupied.every(v=>Math.abs(n-v)>=separation-.01))return n;
  // Crowded small sides degrade to evenly-spaced choices. Overlap is reported.
  let best=0,score=-1;for(let n=-span/2;n<=span/2;n+=2){const d=Math.min(...occupied.map(v=>Math.abs(n-v)));if(d>score){score=d;best=n;}}return round(best);
 }
 function compute(input,rawOptions={}){
  const began=Date.now(),s=settings(rawOptions),rects=new Map(input.nodes.map(n=>[n.id,{...n}])),groups=new Map((input.groups||[]).map(g=>[g.id,{...g}]));
  for(const [id,g] of groups)if(g.collapsed)rects.set(id,{...g,shape:'box'});
  const all=new Map([...groups,...rects]);
  function ancestors(id){const list=[];for(let p=all.get(id)?.parentId;p;p=all.get(p)?.parentId){if(list.includes(p))break;list.push(p);}return list;}
  const previous=new Map((rawOptions.previous||[]).map(r=>[r.id,r]));
  const edges=input.edges.filter(e=>rects.has(e.from)&&rects.has(e.to)).map(e=>({...e,cfg:e.cfg||{}}));
  edges.sort((a,b)=>{const locks=e=>(e.cfg.waypoints?.length?4:0)+(e.cfg.fromSide&&e.cfg.fromSide!=='auto'?1:0)+(e.cfg.toSide&&e.cfg.toSide!=='auto'?1:0);return locks(b)-locks(a)||distance(center(rects.get(a.from)),center(rects.get(a.to)))-distance(center(rects.get(b.from)),center(rects.get(b.to)))||cmp(a.id,b.id);});
  const obsFor=e=>{const allowed=new Set([...ancestors(e.from),...ancestors(e.to)]),obstacles=[...rects.values()].map(r=>inflate(r,s.clearance));
   for(const [id,g] of groups){if(g.collapsed)continue;if(!allowed.has(id))obstacles.push(inflate(g,s.clearance));else obstacles.push({id:id+':header',x:g.x+3,y:g.y+2,w:Math.max(1,g.w-6),h:28+s.clearance});}
   const common=ancestors(e.from).find(id=>ancestors(e.to).includes(id));const g=groups.get(common);
   if(g){const wall=2000000;obstacles.push({id:'wall-l',x:g.x-wall,y:g.y-wall,w:wall,h:2*wall},{id:'wall-r',x:g.x+g.w,y:g.y-wall,w:wall,h:2*wall},{id:'wall-t',x:g.x,y:g.y-wall,w:g.w,h:wall},{id:'wall-b',x:g.x,y:g.y+g.h,w:g.w,h:wall});}
   return obstacles;
  };
  function validPath(points,e,fs,ts,obs){
   if(points.length<2)return false;
   const start=points[0],next=points[1],end=points.at(-1),prev=points.at(-2),v=vector[fs],w=vector[ts];
   if(v.x*(next.x-start.x)+v.y*(next.y-start.y)<=EPS||w.x*(prev.x-end.x)+w.y*(prev.y-end.y)<=EPS)return false;
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];if(Math.abs(a.x-b.x)>EPS&&Math.abs(a.y-b.y)>EPS)return false;
    const obstacles=obs.filter(r=>!(i===1&&r.id===e.from)&&!(i===points.length-1&&r.id===e.to));
    if(blocked(a,b,obstacles))return false;
    if(i>=2){const c=points[i-2];if((b.x-a.x)*(a.x-c.x)+(b.y-a.y)*(a.y-c.y)<-EPS)return false;}
   }
   return true;
  }
  function simplify(points,e,fs,ts,obs,used){
   if(e.cfg.waypoints?.length)return points;
   let result=compress(points),bestCost=cost(result,used,s);
   // Replacing a subpath removes staircase artefacts only if the complete path
   // remains obstacle-safe, respects terminal normals, and does not add a lane
   // conflict or crossing. This is geometric simplification, not SVG cosmetics.
   for(let sweep=0;sweep<4;sweep++){
    let improved=false;const before=conflicts(result,used),beforeLane=parallelConflicts(result,used,s.edgeGap);
    outer:for(let span=result.length-1;span>=2;span--)for(let i=0;i+span<result.length;i++){
     const j=i+span,a=result[i],b=result[j];
     for(const mid of [[{x:a.x,y:b.y}],[{x:b.x,y:a.y}],[]]){
      const p=compress([...result.slice(0,i+1),...mid,...result.slice(j)]);
      if(p.length>=result.length||!validPath(p,e,fs,ts,obs))continue;
      const c=conflicts(p,used),lane=parallelConflicts(p,used,s.edgeGap),score=cost(p,used,s);
      if(c.crossings>before.crossings||lane.laneDeficit>beforeLane.laneDeficit+.1||score>=bestCost-.01)continue;
      result=p;bestCost=score;improved=true;break outer;
     }
    }
    if(!improved)break;
   }
   return result;
  }
  function find(e,used,old){
   const a=rects.get(e.from),b=rects.get(e.to),cfg=e.cfg,obs=obsFor(e),ca=center(a),cb=center(b);
   const from=cfg.fromSide&&cfg.fromSide!=='auto'?[cfg.fromSide]:(rawOptions.quick&&old?[old.fromSide]:SIDES),to=cfg.toSide&&cfg.toSide!=='auto'?[cfg.toSide]:(rawOptions.quick&&old?[old.toSide]:SIDES);
   const candidates=[];let best=null;
   function score(points,c){
    const v=vector[c.fs],w=vector[c.ts],delta={x:cb.x-ca.x,y:cb.y-ca.y};
    const backwards=(v.x*delta.x+v.y*delta.y<-.01?18:0)+(w.x*-delta.x+w.y*-delta.y<-.01?18:0);
    const stability=old?((c.fs!==old.fromSide?s.portStability:0)+(c.ts!==old.toSide?s.portStability:0)):0;
    const fanout=used.reduce((n,r)=>n+(r.from===e.from&&r.fromSide===c.fs?1:0)+(r.to===e.to&&r.toSide===c.ts?1:0),0)*s.fanoutPenalty;
    return cost(points,used,s)+backwards+stability+fanout;
   }
   const remember=(points,c)=>{if(!points)return;const full=compress([c.start,...points,c.end]);
    for(let i=2;i<full.length;i++){const a=full[i-2],b=full[i-1],d=full[i];if(((Math.abs(a.x-b.x)<EPS&&Math.abs(b.x-d.x)<EPS)||(Math.abs(a.y-b.y)<EPS&&Math.abs(b.y-d.y)<EPS))&&((b.x-a.x)*(d.x-b.x)+(b.y-a.y)*(d.y-b.y))<-.001)return;}

    // No doubled-back first/last segments after attaching shape stubs.
    if(full.length<2||segments(full).some(([u,v],i)=>i>0&&i<full.length-2&&blocked(u,v,obs)))return;
    const scoreValue=score(full,c);if(!best||scoreValue<best.score-.01)best={...c,points:full,score:scoreValue};
   };
   for(const fs of from)for(const ts of to){if(e.from===e.to&&fs===ts)continue;
    let fo=slot(e.from,fs,a,used,s,b),toff=slot(e.to,ts,b,used,s,a);
    const sameAxis=(fs==='left'||fs==='right')===(ts==='left'||ts==='right');
    if(sameAxis&&e.from!==e.to){
      const vertical=fs==='left'||fs==='right',axis=vertical?'y':'x',limit=(vertical?b.h:b.w)/2-12;
      const desired=port(a,fs,fo)[axis]-center(b)[axis];
      const taken=used.flatMap(q=>[...(q.from===e.to&&q.fromSide===ts?[q.fromOffset]:[]),...(q.to===e.to&&q.toSide===ts?[q.toOffset]:[])]);
      if(Math.abs(desired)<=limit&&taken.every(v=>Math.abs(desired-v)>=Math.max(s.portGap,s.edgeGap)-.01))toff=desired;
    }
    const start=port(a,fs,fo),end=port(b,ts,toff),stub=s.clearance+3;
    const as={x:round(fs==='left'?a.x-stub:fs==='right'?a.x+a.w+stub:start.x),y:round(fs==='top'?a.y-stub:fs==='bottom'?a.y+a.h+stub:start.y)},bs={x:round(ts==='left'?b.x-stub:ts==='right'?b.x+b.w+stub:end.x),y:round(ts==='top'?b.y-stub:ts==='bottom'?b.y+b.h+stub:end.y)};
    if(blocked(start,as,obs.filter(r=>r.id!==e.from))||blocked(end,bs,obs.filter(r=>r.id!==e.to)))continue;
    const c={fs,ts,fo,toff,start,end,as,bs};c.lower=distance(start,end)+(old&&fs!==old.fromSide?s.portStability:0)+(old&&ts!==old.toSide?s.portStability:0);candidates.push(c);
    if(cfg.waypoints?.length)continue;
    // Preserve genuinely straight facing connections even when two 13px
    // stubs would overlap inside a narrow but valid inter-node gap.
    const v=vector[fs],w=vector[ts],dx=end.x-start.x,dy=end.y-start.y;
    if((start.x===end.x||start.y===end.y)&&v.x*dx+v.y*dy>0&&w.x*-dx+w.y*-dy>0&&!blocked(start,end,obs.filter(r=>r.id!==e.from&&r.id!==e.to)))remember([start,end],c);
    for(const path of doglegs(as,bs,obs,s,used))remember(path,c);
   }
   candidates.sort((a,b)=>a.lower-b.lower||cmp(a.fs+':'+a.ts,b.fs+':'+b.ts));
   // Search is reserved for candidates whose lower bound can beat the best.
   // Dragging keeps this bounded; settled diagrams receive refinement passes.
   let searches=0;for(const c of candidates){if(best&&c.lower>best.score)continue;if(searches++>=(rawOptions.quick?1:3))break;
    if(best&&!conflicts(best.points,used).crossings&&!parallelConflicts(best.points,used,s.edgeGap).lanePairs&&!cfg.waypoints?.length&&best.points.length<=6)break;
    const points=[c.as,...(cfg.waypoints||[]),c.bs],path=[];let ok=true;
    for(let i=1;i<points.length;i++){const part=search(points[i-1],points[i],obs,used,s);if(!part){ok=false;break;}path.push(...part);}
    if(ok)remember(path,c);
   }
   if(!best&&rawOptions.quick&&old)return find(e,used,null);
   if(!best){const fs=from[0],ts=to[0],start=port(a,fs),end=port(b,ts);return{id:e.id,from:e.from,to:e.to,fromSide:fs,toSide:ts,fromOffset:0,toOffset:0,points:compress([start,{x:end.x,y:start.y},end]),blocked:true,reason:'No clear route within the search budget and current side / waypoint constraints.'};}
   best.points=simplify(best.points,e,best.fs,best.ts,obs,used);
   return{id:e.id,from:e.from,to:e.to,fromSide:best.fs,toSide:best.ts,fromOffset:best.fo,toOffset:best.toff,points:best.points,blocked:false};
  }
  let routes=[];for(const e of edges)routes.push(find(e,routes,previous.get(e.id)));
  const metrics=rs=>{let crossings=0,shared=0,lanePairs=0,laneDeficit=0,minGap=Infinity;
   for(let i=0;i<rs.length;i++){const used=rs.slice(0,i),c=conflicts(rs[i].points,used),p=parallelConflicts(rs[i].points,used,s.edgeGap);crossings+=c.crossings;shared+=c.shared;lanePairs+=p.lanePairs;laneDeficit+=p.laneDeficit;if(p.minGap!==null)minGap=Math.min(minGap,p.minGap);}
   return{crossings,shared:round(shared),lanePairs,laneDeficit:round(laneDeficit),minimumConflictingGap:Number.isFinite(minGap)?round(minGap):null,requestedEdgeGap:s.edgeGap,blocked:rs.filter(r=>r.blocked).length,bends:rs.reduce((n,r)=>n+Math.max(0,r.points.length-2),0),length:round(rs.reduce((n,r)=>n+segments(r.points).reduce((v,[a,b])=>v+distance(a,b),0),0))};
  };
  const total=rs=>{const m=metrics(rs);return m.blocked*1e8+m.length+m.bends*s.bendPenalty+m.crossings*s.crossingPenalty+m.shared*s.sharedPenalty+m.laneDeficit*s.parallelPenalty;};
  const before=metrics(routes);let accepted=0;
  if(!rawOptions.quick)for(let pass=1;pass<s.passes;pass++){
   const currentMetrics=metrics(routes);if(!currentMetrics.crossings&&!currentMetrics.shared&&!currentMetrics.blocked&&!currentMetrics.lanePairs)break;
   const order=[...edges].sort((a,b)=>{const ra=routes.find(r=>r.id===a.id),rb=routes.find(r=>r.id===b.id);return Number(rb.blocked)-Number(ra.blocked)||conflicts(rb.points,routes.filter(r=>r!==rb)).crossings-conflicts(ra.points,routes.filter(r=>r!==ra)).crossings||cmp(a.id,b.id);});
   for(const e of order){const i=routes.findIndex(r=>r.id===e.id),used=routes.filter((_,j)=>j!==i),c=conflicts(routes[i].points,used);if(!routes[i].blocked&&!c.crossings&&!c.shared&&!parallelConflicts(routes[i].points,used,s.edgeGap).lanePairs)continue;const next=find(e,used,routes[i]),candidate=[...routes];candidate[i]=next;if(total(candidate)<total(routes)-.1){routes=candidate;accepted++;}}
  }
  // Slide complete internal orthogonal segments into nearby free channels.
  // Endpoints, sides, node coordinates and authored waypoint routes stay fixed.
  let nudged=0;
  if(!rawOptions.quick)for(let pass=0;pass<3;pass++){
   let changed=false;
   for(let ri=0;ri<routes.length;ri++){
    const route=routes[ri],e=edges.find(e=>e.id===route.id);
    if(route.blocked||e.cfg.waypoints?.length)continue;
    const used=routes.filter((_,j)=>j!==ri),obs=obsFor(e);
    if(!parallelConflicts(route.points,used,s.edgeGap).lanePairs)continue;
    let best=route.points,bestValue=cost(best,used,s),before=conflicts(best,used);
    for(let i=1;i<route.points.length-2;i++){
     const a=route.points[i],b=route.points[i+1],h=Math.abs(a.y-b.y)<EPS,axis=h?'y':'x';
     const choices=new Set();
     for(const other of used)for(const [c,d] of segments(other.points)){
      if((Math.abs(c.y-d.y)<EPS)!==h)continue;
      if(parallelNear(a,b,c,d,s.edgeGap*2)){choices.add(round(c[axis]+s.edgeGap));choices.add(round(c[axis]-s.edgeGap));}
     }
     for(const value of choices){const p=clone(route.points);p[i][axis]=value;p[i+1][axis]=value;const clean=compress(p);
      if(!validPath(clean,e,route.fromSide,route.toSide,obs)||conflicts(clean,used).crossings>before.crossings)continue;
      const score=cost(clean,used,s);if(score<bestValue-.1){best=clean;bestValue=score;}
     }
    }
    if(best!==route.points){routes[ri]={...route,points:simplify(best,e,route.fromSide,route.toSide,obs,used)};changed=true;nudged++;}
   }
   if(!changed)break;
  }
  routes.sort((a,b)=>cmp(a.id,b.id));const report={...metrics(routes),initial:before,accepted,nudged,edges:routes.length,milliseconds:Date.now()-began,passes:rawOptions.quick?1:s.passes};
  return{routes,report};
 }
 const api={compute,settings,defaults,port,blocked,conflicts,parallelConflicts,metrics:routes=>{let crossings=0,shared=0;routes.forEach((r,i)=>{const c=conflicts(r.points,routes.slice(0,i));crossings+=c.crossings;shared+=c.shared;});return{crossings,shared};}};

export const RouteLab = api;
