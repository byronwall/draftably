

/* Diagram Studio 7 — bounded, warm-start graph layout with checkpoint recording.
 * Original implementations; see book/references for algorithmic antecedents.
 * No engine downloads, no random initialisation during improvement passes.
 * Browser + Worker + Node compatible. The document is always cloned.
 */
(function (root) {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const magnitude = (x, y) => Math.hypot(x, y);
  const wait = () => new Promise(r => setTimeout(r, 0));
  const ALGORITHMS = [
    {id:'compound-flow',name:'Compound flow',family:'Cross-hierarchy layered',short:'Order nested blocks by all their connections; bring inputs and outputs toward the relevant boundary.',controls:['rankGap','groupGap','boundaryPull','hierarchySweeps','ordering','fold'],detail:'Bottom-up projected sibling graphs plus global terminal ranks and exact-endpoint boundary forces. Alternating hierarchy sweeps let inner and outer levels inform each other. An original heuristic, not ELK.'},
    {id:'boundary-align',name:'Boundary alignment',family:'Cross-hierarchy local repair',short:'Line up connected endpoints across containers without rebuilding the whole structure.',controls:['boundaryPull','hierarchySweeps','alignment','groupGap'],detail:'Warm-start transverse endpoint alignment and mild link-length relaxation, applied to leaves and translated subtrees. No hard rank assignment during improvement passes. Scope, pins and total displacement caps remain in force.'},
    {id:'compound-spring',name:'Compound spring',family:'Hierarchical force-directed',short:'Relax nested systems using the actual connected children, rather than container centres.',controls:['edgeLength','boundaryPull','hierarchySweeps','groupGap','compactness'],detail:'Size-aware springs at actual leaf endpoints transfer force to their direct sibling owners. External neighbours act as temporary boundary anchors. Rectangular separation and alternating hierarchy sweeps constrain the result. Not CoSE or fCoSE.'},
    {id:'tidy', name:'Local tidy', family:'Local optimisation', short:'Shorten stretched links and align nearby neighbours. Keep the overall arrangement.', controls:['edgeLength','alignment','compactness'], detail:'A warm-start spring / alignment hybrid with a displacement anchor and rectangular separation. Designed for small repairs, not global crossing optimisation.'},
    {id:'stress', name:'Stress descent', family:'Distance optimisation', short:'Balance the whole network using graph distances, without restarting it.', controls:['edgeLength','compactness'], detail:'Weighted all-pairs shortest-path stress, solved with diagonal-preconditioned gradient steps. Anchored and projected; not an implementation of the full stress-majorisation algorithm.'},
    {id:'force', name:'Spring network', family:'Force-directed', short:'Let connected clusters find an organic, compact arrangement.', controls:['edgeLength','repulsion','compactness'], detail:'Fruchterman–Reingold-style attraction and repulsion with cooling and rectangular collision projection. Quadratic pair evaluation, not Barnes–Hut.'},
    {id:'flow', name:'Directional flow', family:'Constraint relaxation', short:'Encourage a reading direction without forcing rows or columns.', controls:['edgeLength','flowStrength','alignment'], detail:'Soft directed separation constraints on a cycle-broken graph, plus edge springs and neighbour alignment. Feedback edges remain rendered; they do not impose contradictory directional constraints.'},
    {id:'layered', name:'Layered + fold', family:'Hierarchical', short:'Ranks and crossing sweeps, with optional aspect-aware folding.', controls:['rankGap','ordering','fold'], detail:'A local Sugiyama-style pipeline: deterministic feedback-edge handling, longest-path ranks, barycentric sweeps, dimension-aware coordinates and optional row folding. Not ELK or Graphviz.'},
    {id:'tree', name:'Subtree tree', family:'Tree drawing', short:'Centre parents above their children and give each subtree its own space.', controls:['rankGap','rootId'], detail:'Builds a deterministic breadth-first spanning forest, reserves subtree spans, and centres parents over their children. Non-tree edges are kept. This is a span-based implementation, not Buchheim’s linear-time tidy-tree algorithm.'},
    
    {id:'grid', name:'Soft grid', family:'Assignment + relaxation', short:'Attract boxes toward nearby free cells, without a permanently rigid grid.', controls:['gridStrength','compactness'], detail:'Stable greedy nearest-free-cell assignment around the current centre, followed by soft attraction and rectangular separation. Manual movement remains unrestricted. Not globally optimal matching.'},
    {id:'separate', name:'Separate overlaps', family:'Geometric repair', short:'Move only colliding neighbours. Leave clean regions alone.', controls:[], detail:'Pairwise minimum-axis translations of padded rectangles, with hard pins, boundary constraints and a per-action movement limit. Does not optimise connectivity or promise a globally minimum displacement.'}
  ];
  const defaults = {algorithm:'tidy',direction:'RIGHT',mode:'pass',maxMove:48,stability:65,iterations:32,nodeGap:24,rankGap:52,edgeLength:88,repulsion:45,flowStrength:65,alignment:55,compactness:35,gridStrength:45,aspect:'1.6',fold:'never',respectDirection:true,ordering:'stable',rootId:'',respectManual:false,growContainers:false,boundaryPull:65,hierarchySweeps:2,groupGap:48};
  function settings(values = {}) {
    const s = {...defaults, ...values};
    if (s.algorithm === 'radial') s.algorithm = 'tree';
    if (s.algorithm === 'compact') s.algorithm = 'layered';
    if (!ALGORITHMS.some(a => a.id === s.algorithm)) throw Error('Unknown layout algorithm: '+s.algorithm);
    if (!['RIGHT','DOWN'].includes(s.direction)) throw Error('Direction must be RIGHT or DOWN.');
    if (!['pass','rebuild'].includes(s.mode)) throw Error('Mode must be pass or rebuild.');
    if (!['auto','never'].includes(s.fold)) throw Error('Fold must be auto or never.');
    if (!['stable','crossings'].includes(s.ordering)) throw Error('Ordering must be stable or crossings.');
    const ranges = {maxMove:[4,300],stability:[0,100],iterations:[4,160],nodeGap:[4,160],rankGap:[12,220],edgeLength:[20,260],repulsion:[0,100],flowStrength:[0,100],alignment:[0,100],compactness:[0,100],gridStrength:[0,100],boundaryPull:[0,100],hierarchySweeps:[1,4],groupGap:[12,180]};
    for (const [k, [lo,hi]] of Object.entries(ranges)) {
      if (typeof s[k] !== 'number' || !Number.isFinite(s[k])) throw Error(k+' must be a finite number.');
      s[k] = clamp(s[k],lo,hi);
    }
    s.iterations = Math.round(s.iterations);s.hierarchySweeps=Math.round(s.hierarchySweeps);
    if (!['canvas','1','1.333','1.6','2','0.75'].includes(String(s.aspect))) throw Error('Unknown target aspect ratio.');
    for(const key of ['respectManual','growContainers','respectDirection'])if(typeof s[key]!=='boolean')throw Error(key+' must be a boolean.');
    if(typeof s.rootId !== 'string') throw Error('Root must be an object ID.');
    return s;
  }
  function bounds(items) {
    if (!items.length) return {x:0,y:0,w:1,h:1};
    const x=Math.min(...items.map(p=>p.x)),y=Math.min(...items.map(p=>p.y));
    return {x,y,w:Math.max(1,Math.max(...items.map(p=>p.x+p.w))-x),h:Math.max(1,Math.max(...items.map(p=>p.y+p.h))-y)};
  }
  const midpoint = r => ({x:r.x+r.w/2,y:r.y+r.h/2});
  function penetration(a,b,gap=0) {
    const ca=midpoint(a),cb=midpoint(b),x=(a.w+b.w)/2+gap-Math.abs(cb.x-ca.x),y=(a.h+b.h)/2+gap-Math.abs(cb.y-ca.y);
    return x>0.01 && y>0.01 ? {x,y,dx:cb.x-ca.x,dy:cb.y-ca.y,area:x*y} : null;
  }
  function hash(id) {let n=2166136261;for(const ch of id)n=Math.imul(n^ch.charCodeAt(0),16777619);return(n>>>0)/4294967296;}
  function topology(items, edges, intent = {}) {
    const ids=items.map(n=>n.id).sort(cmp),index=new Map(ids.map((id,i)=>[id,i]));
    const out=new Map(ids.map(id=>[id,[]])),inc=new Map(ids.map(id=>[id,[]])),adj=new Map(ids.map(id=>[id,[]]));
    const es=edges.filter(e=>e.from!==e.to&&index.has(e.from)&&index.has(e.to)).sort((a,b)=>cmp(a.from+'\0'+a.to,b.from+'\0'+b.to));
    for(const e of es){if(e.directed!==false){out.get(e.from).push(e.to);inc.get(e.to).push(e.from);}adj.get(e.from).push(e.to);adj.get(e.to).push(e.from);}
    for(const m of [out,inc,adj])for(const [id,list] of m)m.set(id,[...new Set(list)].sort(cmp));
    const color=new Map(),feedback=new Set();
    // Authored start/end decide which directions are feedback; edges are not
    // deleted, reversed, or rewritten in the document.
    for(const e of es)if(e.directed!==false && (e.to===intent.start?.id || e.from===intent.end?.id))feedback.add(e.from+'\0'+e.to);
    function visit(id){color.set(id,1);for(const to of out.get(id)){if(feedback.has(id+'\0'+to))continue;if(color.get(to)===1)feedback.add(id+'\0'+to);else if(!color.has(to))visit(to);}color.set(id,2);}
    [...(index.has(intent.start?.id)?[intent.start.id]:[]),...ids.filter(id=>!inc.get(id).length),...ids.filter(id=>id!==intent.end?.id),...ids].forEach(id=>{if(!color.has(id))visit(id);});
    const rank=new Map();function rankOf(id){if(rank.has(id))return rank.get(id);let r=0;for(const from of inc.get(id))if(!feedback.has(from+'\0'+id))r=Math.max(r,rankOf(from)+1);rank.set(id,r);return r;}ids.forEach(rankOf);if(index.has(intent.end?.id))rank.set(intent.end.id,Math.max(...rank.values()));
    const components=[],seen=new Set();for(const id of ids){if(seen.has(id))continue;const part=[],q=[id];seen.add(id);for(let i=0;i<q.length;i++){const a=q[i];part.push(a);for(const b of adj.get(a))if(!seen.has(b)){seen.add(b);q.push(b);}}components.push(part);}
    return {intent,ids,index,out,inc,adj,rank,feedback,edges:es,forward:es.filter(e=>e.directed!==false&&!feedback.has(e.from+'\0'+e.to)),components};
  }
  function shortestPaths(t) {
    const distances=new Map();for(const id of t.ids){const d=new Map([[id,0]]),q=[id];for(let i=0;i<q.length;i++)for(const v of t.adj.get(q[i]))if(!d.has(v)){d.set(v,d.get(q[i])+1);q.push(v);}distances.set(id,d);}return distances;
  }
  function seedGrid(items, s, aspect) {
    const aw=items.reduce((n,p)=>n+p.w,0)/Math.max(1,items.length),ah=items.reduce((n,p)=>n+p.h,0)/Math.max(1,items.length);
    const cols=Math.max(1,Math.round(Math.sqrt(items.length*aspect*(ah+s.nodeGap)/(aw+s.nodeGap))));
    const mw=Math.max(...items.map(p=>p.w)),mh=Math.max(...items.map(p=>p.h));
    return new Map(items.map((p,i)=>[p.id,{x:(i%cols)*(mw+s.nodeGap)+p.w/2,y:Math.floor(i/cols)*(mh+s.nodeGap)+p.h/2}]));
  }
  function layeredTarget(items,t,s,aspect) {
    const byId=new Map(items.map(i=>[i.id,i])),vertical=s.direction==='DOWN';
    const major=p=>vertical?p.h:p.w,minor=p=>vertical?p.w:p.h;
    const layers=[];for(const id of t.ids)(layers[t.rank.get(id)]||=[]).push(id);
    for(const l of layers)l.sort((a,b)=>s.mode==='pass'&&s.ordering==='stable'?((vertical?byId.get(a).x:byId.get(a).y)-(vertical?byId.get(b).x:byId.get(b).y)||cmp(a,b)):cmp(a,b));
    const ord=new Map(),refresh=()=>layers.forEach(l=>l.forEach((id,i)=>ord.set(id,i)));refresh();
    if(s.mode==='rebuild'||s.ordering==='crossings')for(let sweep=0;sweep<10;sweep++){
      const forward=sweep%2===0,seq=forward?[...layers.keys()]:[...layers.keys()].reverse();
      for(const i of seq){const near=forward?t.inc:t.out;const bary=id=>{const ns=near.get(id).filter(n=>forward?t.rank.get(n)<i:t.rank.get(n)>i);return ns.length?ns.reduce((a,n)=>a+ord.get(n),0)/ns.length:ord.get(id);};layers[i].sort((a,b)=>bary(a)-bary(b)||ord.get(a)-ord.get(b)||cmp(a,b));refresh();}
    }
    const widths=layers.map(l=>Math.max(...l.map(id=>major(byId.get(id))))),heights=layers.map(l=>l.reduce((n,id)=>n+minor(byId.get(id)),0)+(l.length-1)*s.nodeGap);
    function build(count){
      const map=new Map();let cross=0;
      for(let start=0;start<layers.length;start+=count){const stop=Math.min(layers.length,start+count),band=Math.max(...heights.slice(start,stop));let along=0;
        for(let j=start;j<stop;j++){let y=cross+(band-heights[j])/2;for(const id of layers[j]){const p=byId.get(id),a=along+widths[j]/2,b=y+minor(p)/2;map.set(id,vertical?{x:b,y:a}:{x:a,y:b});y+=minor(p)+s.nodeGap;}along+=widths[j]+s.rankGap;}
        cross+=band+Math.max(s.rankGap+40,84);
      }
      const b=bounds(items.map(p=>{const a=map.get(p.id);return {...p,x:a.x-p.w/2,y:a.y-p.h/2};}));
      // Penalise aspect mismatch in log space, not by merely scaling to fit a thin row.
      const score=Math.abs(Math.log((b.w/b.h)/aspect))*1.8+Math.log(b.w*b.h)*.17+(Math.ceil(layers.length/count)-1)*.16;
      return{map,score};
    }
    let best=build(layers.length);
    if(s.fold==='auto')for(let count=2;count<layers.length;count++){const c=build(count);if(c.score<best.score)best=c;}
    return best.map;
  }
  function forest(items,t,s) {
    const roots=[],parent=new Map(),kids=new Map(t.ids.map(id=>[id,[]])),depth=new Map(),seen=new Set();
    const starts=[...(t.index.has(s.rootId)?[s.rootId]:[]),...t.ids.filter(id=>!t.inc.get(id).length),...t.ids];
    for(const root of starts){if(seen.has(root))continue;roots.push(root);seen.add(root);depth.set(root,0);const q=[root];
      for(let i=0;i<q.length;i++)for(const id of (s.algorithm==='radial'?t.adj:t.out).get(q[i]))if(!t.feedback.has(q[i]+'\0'+id)&&!seen.has(id)){seen.add(id);parent.set(id,q[i]);kids.get(q[i]).push(id);depth.set(id,depth.get(q[i])+1);q.push(id);}
    }
    return{roots,parent,kids,depth};
  }
  function treeTarget(items,t,s,aspect) {
    const f=forest(items,t,s),byId=new Map(items.map(n=>[n.id,n])),vertical=s.direction==='DOWN',span=new Map();
    const minor=id=>vertical?byId.get(id).w:byId.get(id).h;
    function width(id){const cs=f.kids.get(id),w=Math.max(minor(id),cs.reduce((a,c)=>a+width(c),0)+Math.max(0,cs.length-1)*s.nodeGap);span.set(id,w);return w;}f.roots.forEach(width);
    const maxes=[];for(const p of items){const d=f.depth.get(p.id);maxes[d]=Math.max(maxes[d]||0,vertical?p.h:p.w);}
    const levels=[];maxes.forEach((w,i)=>levels[i]=(i?levels[i-1]+maxes[i-1]/2+s.rankGap:0)+w/2);
    const map=new Map();function place(id,lo){const cross=lo+span.get(id)/2,along=levels[f.depth.get(id)];map.set(id,vertical?{x:cross,y:along}:{x:along,y:cross});const cs=f.kids.get(id),total=cs.reduce((a,c)=>a+span.get(c),0)+Math.max(0,cs.length-1)*s.nodeGap;let x=lo+(span.get(id)-total)/2;for(const c of cs){place(c,x);x+=span.get(c)+s.nodeGap;}}
    let x=0;for(const id of f.roots){place(id,x);x+=span.get(id)+s.rankGap;}return map;
  }
  function radialTarget(items,t,s,aspect) {
    const f=forest(items,t,{...s,algorithm:'radial'}),byId=new Map(items.map(n=>[n.id,n])),mass=new Map();
    function weight(id){const n=Math.max(1,f.kids.get(id).reduce((a,c)=>a+weight(c),0));mass.set(id,n);return n;}f.roots.forEach(weight);
    const maxDepth=Math.max(...f.depth.values(),0),radii=[0],rings=Array.from({length:maxDepth+1},()=>[]);for(const p of items)rings[f.depth.get(p.id)].push(p);
    for(let d=1;d<rings.length;d++){const prev=Math.max(...rings[d-1].map(p=>Math.hypot(p.w,p.h)),0),curr=Math.max(...rings[d].map(p=>Math.hypot(p.w,p.h)),0);radii[d]=Math.max(radii[d-1]+(prev+curr)/2+s.edgeLength/2,rings[d].reduce((sum,p)=>sum+Math.hypot(p.w,p.h)+s.nodeGap,0)/(2*Math.PI));}
    const map=new Map();let componentX=0;
    for(const root of f.roots){const ox=componentX;function place(id,start,end){const angle=(start+end)/2+(s.direction==='RIGHT'?0:Math.PI/2),radius=radii[f.depth.get(id)];map.set(id,{x:ox+Math.cos(angle)*radius,y:Math.sin(angle)*radius});const cs=f.kids.get(id);let a=start;for(const c of cs){const b=a+(end-start)*mass.get(c)/mass.get(id);place(c,a,b);a=b;}}place(root,-Math.PI,Math.PI);componentX+=2*(radii.at(-1)||100)+s.rankGap;}return map;
  }
  function gridTarget(items,s,aspect) {
    const seed=seedGrid(items,s,aspect);if(s.mode==='rebuild')return seed;
    const b=bounds(items),c=midpoint(b),sb=bounds(items.map(p=>{const a=seed.get(p.id);return{...p,x:a.x-p.w/2,y:a.y-p.h/2};})),sc=midpoint(sb);
    const cells=[...seed.values()].map((p,i)=>({...p,x:p.x+c.x-sc.x,y:p.y+c.y-sc.y,i})),map=new Map(),used=new Set();
    // Assign easy / close matches first. A node moved by hand is matched near its new location.
    const order=items.map(p=>({p,c:midpoint(p),nearest:Math.min(...cells.map(q=>magnitude(midpoint(p).x-q.x,midpoint(p).y-q.y)))})).sort((a,b)=>a.nearest-b.nearest||cmp(a.p.id,b.p.id));
    for(const {p,c} of order){let best;for(const cell of cells){if(used.has(cell.i))continue;const d=(cell.x-c.x)**2+(cell.y-c.y)**2;if(!best||d<best.d)best={cell,d};}used.add(best.cell.i);map.set(p.id,{x:best.cell.x,y:best.cell.y});}return map;
  }
  function alignTarget(map,items,container,s,canonical=false) {
    const source=bounds(items),target=bounds(items.map(p=>{const at=map.get(p.id);return{...p,x:at.x-p.w/2,y:at.y-p.h/2};}));
    const locked=items.filter(p=>p.fixed),sc=midpoint(source),tc=midpoint(target);let dx=sc.x-tc.x,dy=sc.y-tc.y;
    if(canonical){dx=64-target.x;dy=64-target.y;}
    if(container){dx=container.x-target.x;dy=container.y-target.y;}
    else if(locked.length){dx=locked.reduce((sum,p)=>sum+midpoint(p).x-map.get(p.id).x,0)/locked.length;dy=locked.reduce((sum,p)=>sum+midpoint(p).y-map.get(p.id).y,0)/locked.length;}
    for(const p of map.values()){p.x+=dx;p.y+=dy;}return map;
  }

  const placements = {
    'top-left':[0,0], 'left-center':[0,.5], center:[.5,.5], 'top-center':[.5,0],
    'top-right':[1,0], 'right-center':[1,.5], 'bottom-left':[0,1], 'bottom-center':[.5,1], 'bottom-right':[1,1]
  };
  function normalizeIntent(raw={}, validIds=null) {
    if(!raw || typeof raw!=='object' || Array.isArray(raw))throw Error('Layout intent must be an object.');
    const result={};
    for(const role of ['start','end']) {
      const hint=raw[role];if(hint==null)continue;
      if(!hint || typeof hint.id!=='string' || !hint.id || validIds && !validIds.has(hint.id))throw Error('Layout '+role+' must reference an existing shape.');
      const placement=hint.placement || (role==='start'?'top-left':'bottom-right');
      if(!Object.hasOwn(placements,placement))throw Error('Invalid '+role+' placement.');
      result[role]={id:hint.id,placement};
    }
    if(result.start && result.start.id===result.end?.id)throw Error('Start and end must be different shapes.');
    return result;
  }
  function hintTargets(items,intent) {
    const b=bounds(items),by=new Map(items.map(p=>[p.id,p])),result=new Map();
    for(const hint of Object.values(intent)) {
      const p=by.get(hint.id),xy=placements[hint.placement];if(!p||!xy)continue;
      result.set(p.id,{x:b.x+p.w/2+xy[0]*Math.max(0,b.w-p.w),y:b.y+p.h/2+xy[1]*Math.max(0,b.h-p.h)});
    }
    return result;
  }
  // A dimension-aware two-sided tree. This is NOT the removed radial-shell
  // algorithm: there is no circumference or global radius inflation.
  function bilateralTarget(items,t,s) {
    const start=t.intent.start?.id;if(!t.index.has(start))return null;
    const f=forest(items,t,{...s,rootId:start}),by=new Map(items.map(p=>[p.id,p])),vertical=s.direction==='DOWN';
    const minor=id=>vertical?by.get(id).w:by.get(id).h,major=id=>vertical?by.get(id).h:by.get(id).w;
    const spans=new Map();function span(id){const cs=f.kids.get(id);const w=Math.max(minor(id),cs.reduce((n,c)=>n+span(c),0)+Math.max(0,cs.length-1)*s.nodeGap);spans.set(id,w);return w;}f.roots.forEach(span);
    const sides=new Map([[start,0]]),branches={1:[],'-1':[]},mass={1:0,'-1':0};
    function assign(id,sign){sides.set(id,sign);for(const c of f.kids.get(id))assign(c,sign);}
    for(const id of f.kids.get(start)){const sign=mass[1]<=mass[-1]?1:-1;branches[sign].push(id);mass[sign]+=spans.get(id)+s.nodeGap;assign(id,sign);}
    const map=new Map([[start,{x:0,y:0}]]),maxes=[];
    for(const id of sides.keys()){const d=f.depth.get(id);maxes[d]=Math.max(maxes[d]||0,major(id));}
    const levels=[0];for(let d=1;d<maxes.length;d++)levels[d]=levels[d-1]+maxes[d-1]/2+s.rankGap+maxes[d]/2;
    function place(id,lo,sign){const a=sign*levels[f.depth.get(id)],b=lo+spans.get(id)/2;map.set(id,vertical?{x:b,y:a}:{x:a,y:b});
      const cs=f.kids.get(id),total=cs.reduce((n,c)=>n+spans.get(c),0)+Math.max(0,cs.length-1)*s.nodeGap;let next=lo+(spans.get(id)-total)/2;for(const c of cs){place(c,next,sign);next+=spans.get(c)+s.nodeGap;}}
    for(const sign of [1,-1]){let lo=-(mass[sign]-s.nodeGap)/2;for(const id of branches[sign]){place(id,lo,sign);lo+=spans.get(id)+s.nodeGap;}}
    const extra=items.filter(p=>!map.has(p.id));if(extra.length){const fallback=treeTarget(extra,topology(extra,t.edges),{...s,rootId:''},1.6),b=bounds(items.filter(p=>map.has(p.id)).map(p=>({...p,x:map.get(p.id).x-p.w/2,y:map.get(p.id).y-p.h/2})));
      for(const p of extra){const q=fallback.get(p.id);map.set(p.id,{x:q.x,y:q.y+b.y+b.h+s.rankGap});}}
    t.branchSides=sides;return map;
  }
  function forwardSign(t,e) {
    if(!t.branchSides)return 1;
    const a=t.branchSides.get(e.from)||0,b=t.branchSides.get(e.to)||0;
    return a&&b&&a!==b?0:(b||a||1);
  }

  function objective(items,t,s,distances,target,origin) {
    const byId=new Map(items.map(p=>[p.id,p])),L=s.edgeLength;
    let energy=0;
    if(s.algorithm!=='separate')for(const [id,q] of hintTargets(items,t.intent||{})){const p=midpoint(byId.get(id));energy+=((q.x-p.x)**2+(q.y-p.y)**2)*1.5;}
    if(s._compoundEnergy)energy+=s._compoundEnergy();
    if(target)for(const p of items){const c=midpoint(p),q=target.get(p.id);energy+=((c.x-q.x)**2+(c.y-q.y)**2)*.01;}
    else if(s._compoundEnergy){}
    else if(s.algorithm==='stress')for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j],h=distances.get(a.id).get(b.id);if(!h)continue;const ca=midpoint(a),cb=midpoint(b),ideal=h*(L+(a.w+b.w+a.h+b.h)/8),d=magnitude(ca.x-cb.x,ca.y-cb.y);energy+=((d-ideal)/ideal)**2*100;}
    else if(s.algorithm==='force'){
      // Potential consistent with the explicit attractive / repulsive forces.
      for(const e of t.edges){const a=byId.get(e.from),b=byId.get(e.to),ca=midpoint(a),cb=midpoint(b),d=magnitude(cb.x-ca.x,cb.y-ca.y),ideal=L+(Math.hypot(a.w,a.h)+Math.hypot(b.w,b.h))/4;energy+=.022*d*d*d/(3*ideal);}
      for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=midpoint(items[i]),b=midpoint(items[j]);energy-=(L+80)**2*s.repulsion/100*.015*Math.log(Math.max(18,magnitude(a.x-b.x,a.y-b.y)));}
    }
    else for(const e of t.edges){const a=byId.get(e.from),b=byId.get(e.to),ca=midpoint(a),cb=midpoint(b),ideal=L+(Math.hypot(a.w,a.h)+Math.hypot(b.w,b.h))/4,d=magnitude(cb.x-ca.x,cb.y-ca.y);energy+=(d-ideal)**2*.006;}
    if(s.algorithm==='separate')energy=0;
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const p=penetration(items[i],items[j],s.nodeGap);if(p)energy+=p.area*2;}
    if(s.respectDirection&&s.algorithm!=='separate')for(const e of t.forward){const a=byId.get(e.from),b=byId.get(e.to),v=s.direction==='DOWN',gap=(v?a.h:a.w)/2+(v?b.h:b.w)/2+s.rankGap,d=(v?midpoint(b).y-midpoint(a).y:midpoint(b).x-midpoint(a).x);energy+=forwardSign(t,e)?Math.max(0,gap-d*forwardSign(t,e))**2*.45*(s.flowStrength/100):0;}
    return energy;
  }
  async function compute(input, opts={}) {
    const started=Date.now(),doc=copy(input),original=copy(input.layout.nodes),s=settings({...input.settings,...opts});
    doc.layout.intent=normalizeIntent(doc.layout.intent||{},new Set(doc.graph.nodes.map(n=>n.id)));
    const intent=doc.layout.intent,authoredRootId=s.rootId;if(intent.start)s.rootId=intent.start.id;
    const groups=new Map(doc.graph.groups.map(g=>[g.id,g])),entities=new Map([...doc.graph.nodes,...doc.graph.groups].map(n=>[n.id,n])),pos=doc.layout.nodes;
    const child=id=>[...entities.values()].filter(n=>(n.parentId||null)===(id||null)).sort((a,b)=>cmp(a.id,b.id));
    const parent=id=>entities.get(id)?.parentId;
    const inheritedDirection=(id)=>{for(let p=id;p;p=parent(p)){const d=doc.layout.containers[p]?.direction;if(d&&d!=='inherit')return d;}return s.direction;};
    const descend=id=>child(id).flatMap(n=>[n.id,...(groups.has(n.id)?descend(n.id):[])]);
    const extraFixed=new Set(opts.fixedIds||[]);
    const direct=id=>extraFixed.has(id)||!!pos[id]?.pinned||(s.respectManual&&!!pos[id]?.manual);
    const branch=id=>{for(let p=id;p;p=parent(p))if(direct(p))return true;return false;};
    const fixed=id=>branch(id)||(groups.has(id)&&descend(id).some(direct));
    const visible=id=>{for(let p=parent(id);p;p=parent(p))if(doc.collapsed.includes(p))return false;return true;};
    const padded=(id)=>{const p=pos[id];if(doc.collapsed.includes(id))return {...p,w:Math.min(p.w,210),h:58};return p;};
    const warnings=new Set();let batchCount=0,totalIterations=0;const stops=[];
    const aspect=s.aspect==='canvas'?clamp((opts.viewport?.w||1200)/(opts.viewport?.h||760),.5,3):Number(s.aspect);
    const scope=opts.scope||'all',selected=(opts.selected||[]).filter(id=>entities.has(id));
    if(!['all','selection','container','neighbourhood'].includes(scope))throw Error('Invalid layout scope.');
    // Move whole subtrees. In pass mode every descendant stays inside the same
    // global displacement disc: parent + child moves cannot multiply the budget.
    function move(id,dx,dy){
      if(fixed(id)||!Number.isFinite(dx)||!Number.isFinite(dy))return;
      const ids=[id,...(groups.has(id)?descend(id):[])];let f=1;
      if(s.mode==='pass'){
        const a=dx*dx+dy*dy;if(a<1e-16)return;
        for(const k of ids){const p=pos[k],o=original[k],rx=p.x-o.x,ry=p.y-o.y,b=2*(rx*dx+ry*dy),c=rx*rx+ry*ry-s.maxMove*s.maxMove,disc=b*b-4*a*c;
          f=Math.min(f,clamp((-b+Math.sqrt(Math.max(0,disc)))/(2*a),0,1));}
      }
      for(const k of ids){pos[k].x+=dx*f;pos[k].y+=dy*f;}
    }
    function resizeAuto(id){
      if(!s.growContainers||fixed(id)||!child(id).length)return;
      const b=bounds(child(id).map(n=>pos[n.id])),r=pos[id],p=doc.layout.containers[id]?.padding||24;
      const right=Math.max(r.x+r.w,b.x+b.w+p),bottom=Math.max(r.y+r.h,b.y+b.h+p);
      // Growth is deliberately right/down only. It cannot relocate children.
      r.w=right-r.x;r.h=bottom-r.y;
    }
    function metrics(){
      let overlaps=0,overlapArea=0;const roots=child(null).filter(n=>visible(n.id));
      for(const pid of [null,...groups.keys()]){if(pid&&(!visible(pid)||doc.collapsed.includes(pid)))continue;const cs=child(pid).filter(n=>visible(n.id));for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const hit=penetration(padded(cs[i].id),padded(cs[j].id));if(hit){overlaps++;overlapArea+=hit.area;}}}
      const b=bounds(roots.map(n=>padded(n.id)));let length=0;
      for(const e of doc.graph.edges){const a=pos[e.from],b=pos[e.to];if(a&&b){const ca=midpoint(a),cb=midpoint(b);length+=magnitude(ca.x-cb.x,ca.y-cb.y);}}
      return{overlaps,overlapArea:Math.round(overlapArea),width:Math.round(b.w),height:Math.round(b.h),aspect:+(b.w/b.h).toFixed(2),area:Math.round(b.w*b.h),linkLength:Math.round(length)};
    }
    const before=metrics();
    // Optional recorded solver path. Rendering can scrub real checkpoints;
    // this does not interpolate untested straight lines between two layouts.
    const trace=[];let traceStride=8,lastTraceTick=-8;
    function captureTrace(phase,force=false){
      if(!opts.trace)return;
      if(!force&&totalIterations-lastTraceTick<traceStride)return;
      const m=metrics();
      if(!force&&m.overlaps>before.overlaps)return;
      // Do not surface transient invalid container states as scrub stops.
      if(!force)for(const n of entities.values())if(parent(n.id)&&visible(n.id)){
        const p=pos[n.id],f=pos[parent(n.id)],pad=doc.layout.containers[parent(n.id)]?.padding||24;
        const o=original[n.id],of=original[parent(n.id)];
        const spill=(p,f)=>Math.max(0,f.x+pad-p.x)+Math.max(0,f.y+pad+28-p.y)+Math.max(0,p.x+p.w-(f.x+f.w-pad))+Math.max(0,p.y+p.h-(f.y+f.h-pad));
        if(spill(p,f)>spill(o,of)+.01)return;
      }
      const previous=trace.at(-1);
      const travel=previous?Math.max(...Object.keys(pos).map(id=>Math.hypot(pos[id].x-previous.nodes[id].x,pos[id].y-previous.nodes[id].y,pos[id].w-previous.nodes[id].w,pos[id].h-previous.nodes[id].h)),0):Infinity;
      if(previous&&travel<.02&&!force)return;
      if(trace.length>=94){const keep=trace.filter((_,i)=>i===0||i%2===0);trace.splice(0,trace.length,...keep);traceStride*=2;}
      trace.push({nodes:copy(pos),iteration:totalIterations,phase,metrics:m});lastTraceTick=totalIterations;
    }
    captureTrace('Your arrangement',true);
    const compound=['compound-flow','boundary-align','compound-spring'].includes(s.algorithm);
    const globalTopology=topology(doc.graph.nodes,doc.graph.edges,intent);
    if(intent.start?.placement==='center')bilateralTarget(doc.graph.nodes.map(n=>({...n,...pos[n.id]})),globalTopology,s);
    if(globalTopology.feedback.size)warnings.add(globalTopology.feedback.size+' feedback edge(s) remain visible; cyclic edges cannot all follow one direction.');
    let hierarchyPhase=0;
    const seeded=new Set();
    // Initialise the entire active hierarchy before cross-boundary forces run.
    // Otherwise the first inner solve would depend on old positions in an
    // as-yet-unsolved neighbouring container, even in a canonical rebuild.
    function seedHierarchy(pid,direction){
      if(pid&&branch(pid))return;
      const choice=doc.layout.containers[pid]?.direction,dir=choice&&choice!=='inherit'?choice:direction;
      const items=child(pid).filter(n=>visible(n.id)).map(n=>({id:n.id,...padded(n.id),fixed:fixed(n.id)}));
      if(!items.length)return;
      const frame=pid?pos[pid]:null,pad=doc.layout.containers[pid]?.padding||24;
      const box=frame?{x:frame.x+pad,y:frame.y+pad+28,w:frame.w-2*pad,h:frame.h-2*pad-28}:null;
      const local={...s,direction:dir,fold:s.respectDirection?'never':s.fold},ratio=box?Math.max(.3,box.w/Math.max(1,box.h)):aspect;
      const seed=alignTarget(seedGrid(items,local,ratio),items,box,local,true);
      for(const p of items){if(p.fixed)continue;const q=seed.get(p.id);let x=q.x-p.w/2,y=q.y-p.h/2;
        if(box&&!s.growContainers){if(p.w<=box.w)x=clamp(x,box.x,box.x+box.w-p.w);if(p.h<=box.h)y=clamp(y,box.y,box.y+box.h-p.h);}
        move(p.id,x-pos[p.id].x,y-pos[p.id].y);
      }
      for(const p of items)if(groups.has(p.id)&&!doc.collapsed.includes(p.id))seedHierarchy(p.id,dir);
    }
    if(compound&&s.mode==='rebuild'&&!opts.warmStart){
      if(scope==='all')seedHierarchy(null,s.direction);
      else if(scope==='container'){const id=opts.containerId||selected.find(id=>groups.has(id));if(groups.has(id))seedHierarchy(id,inheritedDirection(parent(id)));}
    }

    async function arrange(activeIds,parentId,direction){
      if(!activeIds.length)return;batchCount++;
      const all=child(parentId).filter(n=>visible(n.id)),active=new Set(activeIds),idSet=new Set(all.map(n=>n.id));
      const owner=id=>{for(let p=id;p;p=parent(p))if(idSet.has(p))return p;return null;};
      const items=all.map(n=>({id:n.id,...padded(n.id),fixed:!active.has(n.id)||fixed(n.id)}));
      if(items.every(p=>p.fixed))return;
      const localIntent={};for(const [role,hint] of Object.entries(intent)){const id=owner(hint.id);if(id)localIntent[role]={...hint,id};}if(localIntent.start?.id===localIntent.end?.id)delete localIntent.end;
      const local={...s,direction,rootId:localIntent.start?.id||owner(s.rootId)||'',fold:s.respectDirection?'never':s.fold};const edges=doc.graph.edges.map(e=>({from:owner(e.from),to:owner(e.to),directed:e.directed!==false})).filter(e=>e.from&&e.to&&e.from!==e.to),t=topology(items,edges,localIntent);
      const boundaryLinks=compound?doc.graph.edges.map(e=>({...e,a:owner(e.from),b:owner(e.to)})).filter(e=>(e.a||e.b)&&e.a!==e.b):[];
      const globalRank=id=>{const ids=groups.has(id)?descend(id).filter(k=>!groups.has(k)):[id];return ids.length?Math.min(...ids.map(k=>globalTopology.rank.get(k)||0)):0;};
      if(s.algorithm==='compound-flow'){
        // Global leaf ranks are temporary ordering hints, never new graph edges.
        const ranks=[...new Set(items.map(p=>globalRank(p.id)))].sort((a,b)=>a-b);
        for(const p of items)t.rank.set(p.id,Math.max(t.rank.get(p.id)||0,ranks.indexOf(globalRank(p.id))));
        const occupiedRanks=[...new Set(t.rank.values())].sort((a,b)=>a-b);for(const [id,r] of t.rank)t.rank.set(id,occupiedRanks.indexOf(r));
        local.rankGap=Math.max(s.rankGap,items.some(p=>groups.has(p.id))?s.groupGap:0);
      }
      const pairGap=(a,b)=>compound&&(groups.has(a.id)||groups.has(b.id))?s.groupGap:s.nodeGap;
      if(compound)local._compoundEnergy=()=>{
        let energy=0;const v=direction==='DOWN';
        for(const e of boundaryLinks){const a=pos[e.from],b=pos[e.to];if(!a||!b)continue;
          const ca=midpoint(a),cb=midpoint(b),dx=cb.x-ca.x,dy=cb.y-ca.y,cross=v?dx:dy,d=magnitude(dx,dy);
          const isBoundary=parent(e.from)!==parent(e.to)||!e.a||!e.b;
          const k=isBoundary?s.boundaryPull/100:0.35;
          const ideal=s.edgeLength+(Math.hypot(a.w,a.h)+Math.hypot(b.w,b.h))/4;
          if(s.algorithm==='boundary-align')energy+=cross*cross*(.025+s.alignment/100*.06)*k+(d-ideal)**2*.001*k;
          else energy+=(d-ideal)**2*.008*k;
          if(s.algorithm==='compound-flow')energy+=cross*cross*.01*k;
        }return energy;
      };
      const frame=parentId?pos[parentId]:null,pad=doc.layout.containers[parentId]?.padding||24;
      const container=frame?{x:frame.x+pad,y:frame.y+pad+28,w:frame.w-pad*2,h:frame.h-pad*2-28}:null;
      const availableAspect=container?Math.max(.3,container.w/Math.max(1,container.h)):aspect;
      let target=null;
      if(s.algorithm==='layered'||s.algorithm==='compound-flow')target=layeredTarget(items,t,local,availableAspect);
      if(s.algorithm==='tree')target=treeTarget(items,t,local,availableAspect);
      if(s.algorithm==='radial')target=radialTarget(items,t,local,availableAspect);
      if(s.algorithm==='grid')target=gridTarget(items,local,availableAspect);
      const bilateral=localIntent.start?.placement==='center'&&s.algorithm!=='separate'?bilateralTarget(items,t,local):null;
      if(bilateral&&['tree','layered','compound-flow'].includes(s.algorithm))target=bilateral;
      if(target&&!(s.algorithm==='grid'&&s.mode==='pass'))alignTarget(target,items,container,s,s.mode==='rebuild'&&!opts.warmStart);
      // Canonical rebuild initialisation is ID-sorted and geometry-aware.
      // Separate overlaps is a repair operation: even rebuild retains its input.
      if(s.mode==='rebuild'&&!opts.warmStart&&s.algorithm!=='separate'&&(!compound||!seeded.has(parentId))){seeded.add(parentId);
        const seed=target||(bilateral?alignTarget(bilateral,items,container,s,true):null)||alignTarget(s.respectDirection&&t.forward.length?layeredTarget(items,t,{...local,fold:'never'},availableAspect):seedGrid(items,s,availableAspect),items,container,s,true);
        for(const p of items)if(!p.fixed){const q=seed.get(p.id);let x=q.x-p.w/2,y=q.y-p.h/2;
          if(container&&!s.growContainers){if(p.w<=container.w)x=clamp(x,container.x,container.x+container.w-p.w);if(p.h<=container.h)y=clamp(y,container.y,container.y+container.h-p.h);}
          move(p.id,x-pos[p.id].x,y-pos[p.id].y);
        }
      }
      const sync=()=>items.forEach(p=>{p.x=pos[p.id].x;p.y=pos[p.id].y;});sync();
      const origin=new Map(items.map(p=>[p.id,midpoint(p)])),byId=new Map(items.map(p=>[p.id,p])),velocity=new Map(items.map(p=>[p.id,{x:0,y:0}]));
      const distances=s.algorithm==='stress'?shortestPaths(t):null;
      const baseB=bounds(items),baseCenter=midpoint(baseB),anchor=s.mode==='pass'?(s.stability/100)**2*.18:0;
      const steps=opts.settle?clamp(Math.round(opts.maxIterations||640),80,1200):(s.mode==='rebuild'?Math.max(80,s.iterations*3):s.iterations);
      let quiet=0,plateau=0,stop='iteration limit',ran=0;
      const constrainedMove=(p,dx,dy)=>{
        if(p.fixed)return;
        if(container&&!s.growContainers){
          if(p.w<=container.w){dx=clamp(p.x+dx,container.x,container.x+container.w-p.w)-p.x;}
          else{warnings.add('A child is wider than its container. Resize the frame or allow growth.');dx=0;}
          if(p.h<=container.h){dy=clamp(p.y+dy,container.y,container.y+container.h-p.h)-p.y;}
          else{warnings.add('A child is taller than its container. Resize the frame or allow growth.');dy=0;}
        }
        move(p.id,dx,dy);p.x=pos[p.id].x;p.y=pos[p.id].y;
      };
      function axisCapacity(p,axis,sign){
        if(p.fixed)return 0;
        let capacity=Infinity;
        if(container&&!s.growContainers){
          const length=axis==='x'?'w':'h';
          capacity=Math.max(0,sign>0?container[axis]+container[length]-p[axis]-p[length]:p[axis]-container[axis]);
        }
        if(s.mode==='pass')for(const id of [p.id,...(groups.has(p.id)?descend(p.id):[])]){
          const current=pos[id],old=original[id],along=(current[axis]-old[axis])*sign,other=axis==='x'?current.y-old.y:current.x-old.x;
          capacity=Math.min(capacity,Math.max(0,Math.sqrt(Math.max(0,s.maxMove*s.maxMove-other*other))-along));
        }
        return capacity;
      }
      function separate(rounds=3){
        for(let pass=0;pass<rounds;pass++){
          for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
            const a=items[i],b=items[j],gap=pairGap(a,b),p=penetration(a,b,gap);if(!p||a.fixed&&b.fixed)continue;
            // Try all four separating directions. The shortest axis may be
            // blocked by a pin or a frame wall; do not repeatedly push into it.
            const candidates=[];
            for(const axis of ['x','y'])for(const sign of [1,-1]){
              const half=axis==='x'?(a.w+b.w)/2:(a.h+b.h)/2,delta=axis==='x'?p.dx:p.dy;
              const need=half+gap-sign*delta+.15,ca=axisCapacity(a,axis,-sign),cb=axisCapacity(b,axis,sign),available=ca+cb;
              const feasible=available>=need-.001,coverage=Math.min(1,available/need);
              candidates.push({axis,sign,need,ca,cb,available,feasible,coverage});
            }
            candidates.sort((a,b)=>Number(b.feasible)-Number(a.feasible)||(a.feasible?a.need-b.need:b.coverage-a.coverage)||a.need-b.need);
            const best=candidates[0];if(best.available<.001)continue;
            const amount=Math.min(best.need,best.available),aa=Math.min(best.ca,amount/2),bb=Math.min(best.cb,amount-aa),extra=Math.min(best.ca-aa,amount-aa-bb),da=(aa+extra)*best.sign,db=bb*best.sign;
            constrainedMove(a,best.axis==='x'?-da:0,best.axis==='y'?-da:0);
            constrainedMove(b,best.axis==='x'?db:0,best.axis==='y'?db:0);
          }
        }
      }
      const collisions=()=>{let n=0,a=0;for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const p=penetration(items[i],items[j]);if(p){n++;a+=p.area;}}return{n,a};};
      let best={coords:new Map(items.map(p=>[p.id,{x:p.x,y:p.y}])),collisions:collisions(),energy:objective(items,t,local,distances,target,origin)};
      for(let tick=0;tick<steps;tick++){
        totalIterations++;ran++;const tickStart=items.map(p=>({x:p.x,y:p.y}));
        const forces=new Map(items.map(p=>[p.id,{x:0,y:0,degree:0}]));
        const add=(id,x,y,w=1)=>{const f=forces.get(id);f.x+=x;f.y+=y;f.degree+=w;};
        if(s.algorithm==='stress'){
          for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
            const a=items[i],b=items[j],hop=distances.get(a.id).get(b.id);if(!hop)continue;
            const ca=midpoint(a),cb=midpoint(b);let dx=cb.x-ca.x,dy=cb.y-ca.y,d=magnitude(dx,dy);
            if(d<.01){const angle=hash(a.id+'|'+b.id)*Math.PI*2;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
            const ideal=hop*(s.edgeLength+(a.w+b.w+a.h+b.h)/8),w=1/(hop*hop),f=(d-ideal)/d*w*.16;
            add(a.id,dx*f,dy*f,w);add(b.id,-dx*f,-dy*f,w);
          }
        }else if(['tidy','flow','force'].includes(s.algorithm)){
          for(const e of t.edges){const a=byId.get(e.from),b=byId.get(e.to),ca=midpoint(a),cb=midpoint(b);let dx=cb.x-ca.x,dy=cb.y-ca.y,d=magnitude(dx,dy);if(d<.01){dx=1;dy=.1;d=1.005;}
            const extent=(Math.hypot(a.w,a.h)+Math.hypot(b.w,b.h))/4,L=extent+s.edgeLength;
            const f=s.algorithm==='force'?(d*d/L)*.022:(d-L)*.09;
            add(a.id,dx/d*f,dy/d*f);add(b.id,-dx/d*f,-dy/d*f);
            if(s.algorithm==='tidy'){
              const vertical=Math.abs(dx)<Math.abs(dy),err=vertical?dx:dy,limit=Math.max(s.nodeGap*2,24);
              if(Math.abs(err)<limit){const q=err*s.alignment/100*.14;add(a.id,vertical?q:0,vertical?0:q,0);add(b.id,vertical?-q:0,vertical?0:-q,0);}
            }
            if(s.algorithm==='flow'&&e.directed!==false&&!t.feedback.has(e.from+'\0'+e.to)){
              const sign=forwardSign(t,e),down=direction==='DOWN',gap=(down?(a.h+b.h):(a.w+b.w))/2+s.rankGap,error=gap-(down?dy:dx)*sign,push=sign*Math.max(0,error)*s.flowStrength/100*.32,cross=(down?dx:dy)*s.alignment/100*.035;
              add(a.id,down?cross:-push,down?-push:cross,0);add(b.id,down?-cross:push,down?push:-cross,0);
            }
          }
          if(s.algorithm==='force')for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
            const a=items[i],b=items[j],ca=midpoint(a),cb=midpoint(b);let dx=cb.x-ca.x,dy=cb.y-ca.y,d=magnitude(dx,dy);if(d<.1){const ang=hash(a.id+b.id)*Math.PI*2;dx=Math.cos(ang);dy=Math.sin(ang);d=1;}
            const L=s.edgeLength+80,f=L*L/Math.max(d,18)*s.repulsion/100*.015;add(a.id,-dx/d*f,-dy/d*f,0);add(b.id,dx/d*f,dy/d*f,0);
          }
        }
        if(compound)for(const e of boundaryLinks){
          const a=pos[e.from],b=pos[e.to];if(!a||!b)continue;
          const ca=midpoint(a),cb=midpoint(b);let dx=cb.x-ca.x,dy=cb.y-ca.y,d=magnitude(dx,dy);
          if(d<.01){dx=1;dy=.1;d=1;}
          const crossBoundary=parent(e.from)!==parent(e.to)||!e.a||!e.b;
          const strength=crossBoundary?s.boundaryPull/100:.35,v=direction==='DOWN';
          const ideal=s.edgeLength+(Math.hypot(a.w,a.h)+Math.hypot(b.w,b.h))/4;
          let fx=0,fy=0;
          if(s.algorithm==='boundary-align'){
            const cross=(v?dx:dy)*(.04+s.alignment/100*.16)*strength;
            fx=(v?cross:dx/d*(d-ideal)*.008*strength);fy=(v?dy/d*(d-ideal)*.008*strength:cross);
          }else{
            const pull=(d-ideal)*.10*strength;fx=dx/d*pull;fy=dy/d*pull;
            if(s.algorithm==='compound-flow'){const cross=(v?dx:dy)*.055*strength;fx+=v?cross:0;fy+=v?0:cross;}
          }
          if(e.a)add(e.a,fx,fy);if(e.b)add(e.b,-fx,-fy);
        }
        // All connective approaches share a direction objective. Undirected links
        // retain attraction but never become ordering constraints. Feedback links
        // are excluded deterministically rather than silently reversing arrows.
        if(s.respectDirection&&s.algorithm!=='separate')for(const e of t.forward){
          const a=byId.get(e.from),b=byId.get(e.to),v=direction==='DOWN',ca=midpoint(a),cb=midpoint(b);
          const gap=(v?a.h+b.h:a.w+b.w)/2+s.rankGap,error=gap-(v?cb.y-ca.y:cb.x-ca.x);
          if(error<=0)continue;const force=error*(.12+s.flowStrength/100*.65);
          add(a.id,v?0:-force,v?-force:0,0);add(b.id,v?0:force,v?force:0,0);
        }
        if(target)for(const p of items){const c=midpoint(p),q=target.get(p.id),strength=s.algorithm==='grid'?.018+s.gridStrength/100*.16:.18;add(p.id,(q.x-c.x)*strength,(q.y-c.y)*strength);}
        if(s.algorithm!=='separate'){
          const b=bounds(items),c=midpoint(b),ratio=b.w/b.h,aspectError=clamp(Math.log(ratio/availableAspect),-2,2);
          for(const p of items){const pc=midpoint(p),a=origin.get(p.id),f=forces.get(p.id),norm=Math.max(1,Math.sqrt(f.degree));f.x/=norm;f.y/=norm;
            f.x+=(a.x-pc.x)*anchor;f.y+=(a.y-pc.y)*anchor;
            if(!['flow','tree','radial','layered','compound-flow','boundary-align'].includes(s.algorithm)){
              const k=s.compactness/100*.016;
              f.x+=(baseCenter.x-pc.x)*k-(pc.x-c.x)*aspectError*k;
              f.y+=(baseCenter.y-pc.y)*k+(pc.y-c.y)*aspectError*k;
              // Break an exactly collinear network only in the organic engines.
              if(['stress','force'].includes(s.algorithm)&&Math.abs(pc.y-c.y)<.01&&aspectError>.8)f.y+=(hash(p.id)-.5)*s.nodeGap*.025;
            }
          }
        }
        if(s.algorithm!=='separate')for(const [id,q] of hintTargets(items,localIntent)){const p=midpoint(byId.get(id));add(id,(q.x-p.x)*.20,(q.y-p.y)*.20,0);}
        for(const p of items){if(p.fixed)continue;const f=forces.get(p.id),v=velocity.get(p.id),limit=s.mode==='pass'?Math.max(1,s.maxMove*.13):Math.max(2,32*(1-tick/steps));
          v.x=v.x*.28+f.x*.72;v.y=v.y*.28+f.y*.72;const n=magnitude(v.x,v.y),k=n>limit?limit/n:1;
          constrainedMove(p,v.x*k,v.y*k);
        }
        separate(s.algorithm==='separate'?6:3);
        // Project feasible forward inequalities, using the same boundary/pin/
        // per-action budget guards as every other movement. A second collision
        // projection keeps directional improvement subordinate to feasibility.
        if(s.respectDirection&&s.algorithm!=='separate')for(let sweep=0;sweep<2;sweep++){
          const seq=sweep?t.forward.slice().reverse():t.forward;
          for(const e of seq){const a=byId.get(e.from),b=byId.get(e.to),v=direction==='DOWN',axis=v?'y':'x';
            const gap=(v?a.h+b.h:a.w+b.w)/2+s.rankGap;
            const sign=forwardSign(t,e);if(!sign)continue;
            const error=gap-(midpoint(b)[axis]-midpoint(a)[axis])*sign;if(error<=.01)continue;
            const ac=axisCapacity(a,axis,-sign),bc=axisCapacity(b,axis,sign),need=error*(s.mode==='pass'?.4:.95);
            const da=Math.min(ac,bc<need/2?need-bc:need/2),db=Math.min(bc,need-da);
            constrainedMove(a,v?0:-da*sign,v?-da*sign:0);constrainedMove(b,v?0:db*sign,v?db*sign:0);
          }
        }
        separate(2);
        const c=collisions(),energy=objective(items,t,local,distances,target,origin);
        // Feasibility is lexicographic. A prettier target never justifies a new collision.
        if(c.n<best.collisions.n||c.n===best.collisions.n&&(c.a<best.collisions.a-.1||Math.abs(c.a-best.collisions.a)<.1&&(energy<best.energy-.001||s.algorithm==='separate'))){best={coords:new Map(items.map(p=>[p.id,{x:p.x,y:p.y}])),collisions:c,energy};plateau=0;}else plateau++;
        const travel=Math.max(...items.map((p,i)=>magnitude(p.x-tickStart[i].x,p.y-tickStart[i].y)),0);
        quiet=travel<(opts.tolerance||.08)?quiet+1:0;
        if(opts.settle&&tick>=40&&(quiet>=12||plateau>=80)){
          stop=quiet>=12?'settled':'objective plateau';break;
        }
        if(tick%4===3)captureTrace('Refining '+(parentId?(groups.get(parentId)?.title||'container'):'diagram'));
        if(tick%12===11)await wait();
      }
      stops.push({parentId,iterations:ran,reason:stop});
      for(const p of items){const bestPos=best.coords.get(p.id);move(p.id,bestPos.x-pos[p.id].x,bestPos.y-pos[p.id].y);}sync();
      // Prefer the requested region after optimization, but never spend more
      // displacement, violate a fixed frame/pin, or introduce an overlap.
      if(s.algorithm!=='separate')for(let pass=0;pass<4;pass++)for(const [id,q] of hintTargets(items,localIntent)){
        const p=byId.get(id);if(!p||p.fixed)continue;const saved=new Map(items.map(p=>[p.id,{x:p.x,y:p.y}])),beforeCollision=collisions(),c=midpoint(p);
        constrainedMove(p,(q.x-c.x)*.65,(q.y-c.y)*.65);
        const now=collisions();if(now.n>beforeCollision.n||now.a>beforeCollision.a+.01){for(const [key,old] of saved)move(key,old.x-pos[key].x,old.y-pos[key].y);sync();}
      }
      // A structural target can be wider/taller than a fixed frame. In rebuild
      // mode only, try deterministic edge-candidate packing before accepting
      // colliding rectangles. This never grows a frame or moves a hard pin.
      if(best.collisions.n && s.mode==='rebuild' && container && !s.growContainers && items.length<=24){
        const movable=items.filter(p=>!p.fixed),locked=items.filter(p=>p.fixed);
        const orders=[
          [...movable].sort((a,b)=>b.w*b.h-a.w*a.h||cmp(a.id,b.id)),
          [...movable].sort((a,b)=>cmp(a.id,b.id)),
          [...movable].sort((a,b)=>b.h-a.h||b.w-a.w||cmp(a.id,b.id)),
          [...movable].sort((a,b)=>cmp(b.id,a.id))
        ];
        let packed=null;
        for(const order of orders){
          const placed=locked.map(p=>({...p})),candidate=new Map();let failed=false;
          for(const p of order){
            if(p.w>container.w || p.h>container.h){failed=true;break;}
            const q=target?.get(p.id)||midpoint(p);
            const xs=new Set([container.x,container.x+container.w-p.w,clamp(q.x-p.w/2,container.x,container.x+container.w-p.w)]);
            const ys=new Set([container.y,container.y+container.h-p.h,clamp(q.y-p.h/2,container.y,container.y+container.h-p.h)]);
            for(const box of placed){xs.add(box.x+box.w+s.nodeGap+.2);xs.add(box.x-p.w-s.nodeGap-.2);ys.add(box.y+box.h+s.nodeGap+.2);ys.add(box.y-p.h-s.nodeGap-.2);}
            let choice=null;
            for(const y of [...ys].sort((a,b)=>a-b))for(const x of [...xs].sort((a,b)=>a-b)){
              if(x<container.x-.001||y<container.y-.001||x+p.w>container.x+container.w+.001||y+p.h>container.y+container.h+.001)continue;
              const box={...p,x,y};if(placed.some(other=>penetration(box,other,s.nodeGap)))continue;
              const cost=(x+p.w/2-q.x)**2+(y+p.h/2-q.y)**2;
              if(!choice||cost<choice.cost-.001)choice={box,cost};
            }
            if(!choice){failed=true;break;}placed.push(choice.box);candidate.set(p.id,choice.box);
          }
          if(!failed){packed=candidate;break;}
        }
        if(packed){
          for(const [id,p] of packed)move(id,p.x-pos[id].x,p.y-pos[id].y);sync();
          warnings.add('Used local packing inside "'+(groups.get(parentId)?.title||parentId)+'" because the requested arrangement did not fit its fixed frame.');
        }
      }
      if(collisions().n)warnings.add('Some overlaps remain. Pins, fixed frames or the movement limit may prevent this pass from clearing them.');
      if(parentId)resizeAuto(parentId);
      captureTrace('Finished '+(parentId?(groups.get(parentId)?.title||'container'):'diagram'),true);
    }
    async function walk(pid,direction){
      if(pid&&branch(pid))return;
      const dir=doc.layout.containers[pid]?.direction;
      const inherited=dir&&dir!=='inherit'?dir:direction;
      if(compound&&hierarchyPhase%2)await arrange(child(pid).map(n=>n.id),pid,inherited);
      for(const n of child(pid))if(groups.has(n.id)&&!doc.collapsed.includes(n.id)&&!branch(n.id))await walk(n.id,inherited);
      if(!compound||hierarchyPhase%2===0)await arrange(child(pid).map(n=>n.id),pid,inherited);
    }
    if(scope==='all'){for(hierarchyPhase=0;hierarchyPhase<(compound?s.hierarchySweeps:1);hierarchyPhase++)await walk(null,s.direction);}
    else if(scope==='container'){
      const id=opts.containerId||selected.find(id=>groups.has(id));if(!groups.has(id))throw Error('Select a container first.');for(hierarchyPhase=0;hierarchyPhase<(compound?s.hierarchySweeps:1);hierarchyPhase++)await walk(id,inheritedDirection(parent(id)));
    }else{
      let ids=selected.filter(id=>!selected.some(a=>a!==id&&groups.has(a)&&descend(a).includes(id)));
      if(scope==='neighbourhood'){
        const ns=new Set(ids);for(const e of doc.graph.edges){if(ns.has(e.from))ids.push(e.to);if(ns.has(e.to))ids.push(e.from);}ids=[...new Set(ids)];
      }
      if(!ids.length)throw Error('Select at least one object.');
      const p=parent(ids[0])||null;if(ids.some(id=>(parent(id)||null)!==p))throw Error('Select objects in one container, or use Whole diagram.');
      await arrange(ids,p,inheritedDirection(p));
    }
    // Round only after enforcing the movement disc, with an inward margin.
    let moved=0,maxDisplacement=0,sum2=0;
    for(const [id,p] of Object.entries(pos)){
      const o=original[id];if(!o)continue;
      if(fixed(id)||p.x===o.x&&p.y===o.y){p.x=o.x;p.y=o.y;continue;}
      let dx=p.x-o.x,dy=p.y-o.y,n=magnitude(dx,dy);
      if(s.mode==='pass'&&n>s.maxMove-0.002&&n>0){const k=Math.max(0,s.maxMove-0.002)/n;p.x=o.x+dx*k;p.y=o.y+dy*k;}
      p.x=Math.round(p.x*1000)/1000;p.y=Math.round(p.y*1000)/1000;
      n=magnitude(p.x-o.x,p.y-o.y);if(n>.01){moved++;sum2+=n*n;maxDisplacement=Math.max(maxDisplacement,n);}
    }
    for(const n of entities.values())if(parent(n.id)&&visible(n.id)){
      const p=pos[n.id],frame=pos[parent(n.id)],pad=doc.layout.containers[parent(n.id)]?.padding||24;
      if(p.x<frame.x+pad-.01||p.y<frame.y+pad+28-.01||p.x+p.w>frame.x+frame.w-pad+.01||p.y+p.h>frame.y+frame.h-pad+.01)warnings.add('Some children extend beyond a frame. Enlarge that container or relax its constraints.');
    }
    const after=metrics();
    if(after.overlaps>before.overlaps&&s.mode==='pass'){
      // Last-resort cross-level guard: sibling scopes can interact through frames.
      for(const id of Object.keys(pos))pos[id]=copy(original[id]);warnings.add('This pass was rejected because it introduced overlaps. Try a smaller scope or a different approach.');moved=0;maxDisplacement=0;sum2=0;
    }
    for(const key of Object.keys(defaults))if(!['mode'].includes(key))doc.settings[key]=s[key];
    doc.settings.rootId=authoredRootId;
    let backwardEdges=0,directedEdges=0;
    for(const e of globalTopology.forward){const a=pos[e.from],b=pos[e.to];if(!a||!b)continue;directedEdges++;
      const targetAncestors=new Set();for(let p=parent(e.to);p;p=parent(p))targetAncestors.add(p);let common=null;for(let p=parent(e.from);p;p=parent(p))if(targetAncestors.has(p)){common=p;break;}
      // Cross-boundary arrows use the lowest common container's direction,
      // not an inner direction that only governs one endpoint's siblings.
      const axis=inheritedDirection(common)==='DOWN'?'y':'x';const sign=forwardSign(globalTopology,e);if(sign&&(midpoint(b)[axis]-midpoint(a)[axis])*sign<=.01)backwardEdges++;
    }
    if(s.respectDirection&&backwardEdges)warnings.add(backwardEdges+' forward-order conflict(s) remain; pins, frames, hierarchy directions or the movement budget can constrain placement.');
    const intentReport=Object.entries(intent).map(([role,hint])=>{const items=child(parent(hint.id)).map(n=>({id:n.id,...pos[n.id]})),q=hintTargets(items,{[role]:hint}).get(hint.id),p=midpoint(pos[hint.id]),error=q?magnitude(p.x-q.x,p.y-q.y):0;return{role,...hint,error:+error.toFixed(1),satisfied:error<=Math.max(12,s.nodeGap),pinned:fixed(hint.id)};});
    if(intentReport.some(h=>!h.satisfied))warnings.add('Some placement preferences remain approximate. They never override pins, fixed frames, collision safety, scope, or a pass movement limit.');
    const report={intent:intentReport,backwardEdges,directedEdges,feedbackEdges:globalTopology.feedback.size,algorithm:s.algorithm,name:ALGORITHMS.find(a=>a.id===s.algorithm).name,mode:s.mode,scope,moved,maxDisplacement:+maxDisplacement.toFixed(2),rmsDisplacement:+Math.sqrt(sum2/Math.max(1,moved)).toFixed(2),movementLimit:s.mode==='pass'?s.maxMove:null,iterations:totalIterations,batches:batchCount,before,after:metrics(),warnings:[...warnings],milliseconds:Date.now()-started,deterministic:s.mode==='rebuild'&&!opts.warmStart&&s.algorithm!=='separate',termination:opts.settle?(stops.some(p=>p.reason==='iteration limit')?'iteration limit':stops.some(p=>p.reason==='objective plateau')?'objective plateau':'settled'):'bounded pass',solverStops:stops};
    captureTrace('Computed finish',true);
    return {document:doc,report,...(opts.trace?{trace}: {})};
  }
  const api={algorithms:ALGORITHMS,defaults,settings,compute,normalizeIntent,placements,topology};root.LayoutLab=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);


