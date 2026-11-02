/**
 * Draftably evaluation metrics, frozen before candidate comparison.
 * No layout/router replacement. Native documents and actual RouteLab/production drawRoutes only.
 * Implements a transparent subset of baseline scripts/diagram-audit.mjs plus correctness gates.
 * See metrics-spec.json for definitions, caveats, weights, and equivalence bands.
 */
export const VERSION = 'draftably-eval-metrics-1.0.0';
const EPS = 0.5;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const segments = points => points.slice(1).map((b, i) => [points[i], b]);
const length = ([a, b]) => Math.hypot(b.x - a.x, b.y - a.y);
const rectValid = r => r && ['x', 'y', 'w', 'h'].every(k => finite(r[k])) && r.w >= 0 && r.h >= 0;
const grow = (r, d) => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > EPS;
const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const dir = ([a, b]) => Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x >= a.x ? 'R' : 'L') : b.y >= a.y ? 'D' : 'U';
const opposite = { R: 'L', L: 'R', U: 'D', D: 'U' };
const mean = a => a.reduce((s, n) => s + n, 0) / Math.max(1, a.length);
const median = a => { const s = [...a].sort((a, b) => a - b); return s.length ? (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2 : 0; };
const sum = a => a.reduce((s, n) => s + n, 0);
const round = n => finite(n) ? Math.round(n * 1e6) / 1e6 : null;

/** Exact segment/rectangle interior intersection; boundary contact is not penetration. */
export function segmentHitsRect([a, b], r, eps = EPS) {
  if (!rectValid(r) || r.w <= 2 * eps || r.h <= 2 * eps) return false;
  const x0 = r.x + eps, x1 = r.x + r.w - eps, y0 = r.y + eps, y1 = r.y + r.h - eps;
  const dx = b.x - a.x, dy = b.y - a.y;
  let lo = 0, hi = 1;
  for (const [v, d, low, high] of [[a.x, dx, x0, x1], [a.y, dy, y0, y1]]) {
    if (Math.abs(d) < 1e-9) { if (v <= low || v >= high) return false; continue; }
    const p = (low - v) / d, q = (high - v) / d;
    lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));
    if (hi <= lo + 1e-9) return false;
  }
  return hi > lo + 1e-9;
}

/** AABB penetration is refined for elliptical and diamond shapes, avoiding corner false alarms. */
function segmentHitsNode(seg, r) {
  if (!segmentHitsRect(seg, r)) return false;
  if (!['diamond', 'circle', 'icon'].includes(r.shape)) return true;
  const c = center(r), rx = Math.max(1, r.w / 2 - EPS), ry = Math.max(1, r.h / 2 - EPS), [a, b] = seg;
  const dx = b.x - a.x, dy = b.y - a.y;
  if (r.shape === 'diamond') {
    const ts = [0, 1];
    if (dx) ts.push(Math.max(0, Math.min(1, (c.x - a.x) / dx)));
    if (dy) ts.push(Math.max(0, Math.min(1, (c.y - a.y) / dy)));
    return ts.some(t => Math.abs(a.x + dx * t - c.x) / rx + Math.abs(a.y + dy * t - c.y) / ry < 1);
  }
  const ax = (a.x - c.x) / rx, ay = (a.y - c.y) / ry, ux = dx / rx, uy = dy / ry;
  const t = Math.max(0, Math.min(1, -(ax * ux + ay * uy) / (ux * ux + uy * uy || 1)));
  return (ax + ux * t) ** 2 + (ay + uy * t) ** 2 < 1;
}

export function properCross([a, b], [c, d]) {
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < -1e-9 && o(c, d, a) * o(c, d, b) < -1e-9;
}
function straight([a, b]) {
  if (Math.abs(a.x - b.x) < EPS) return { axis: 'v', at: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) };
  if (Math.abs(a.y - b.y) < EPS) return { axis: 'h', at: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) };
  return null;
}
const along = (a, b) => a.axis === b.axis ? Math.max(0, Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo)) : 0;
const sides = r => [
  { axis: 'v', at: r.x, lo: r.y, hi: r.y + r.h, out: -1 },
  { axis: 'v', at: r.x + r.w, lo: r.y, hi: r.y + r.h, out: 1 },
  { axis: 'h', at: r.y, lo: r.x, hi: r.x + r.w, out: -1 },
  { axis: 'h', at: r.y + r.h, lo: r.x, hi: r.x + r.w, out: 1 },
];
function rectSegmentDistance(r, [a, b]) {
  if (segmentHitsRect([a, b], r, 0)) return 0;
  if (Math.abs(a.x - b.x) < EPS) return Math.hypot(Math.max(r.x - a.x, a.x - r.x - r.w, 0), Math.max(r.y - Math.max(a.y,b.y), Math.min(a.y,b.y)-r.y-r.h, 0));
  if (Math.abs(a.y - b.y) < EPS) return Math.hypot(Math.max(r.y - a.y, a.y - r.y - r.h, 0), Math.max(r.x - Math.max(a.x,b.x), Math.min(a.x,b.x)-r.x-r.w, 0));
  const pointDist = p => {
    const dx = b.x-a.x, dy=b.y-a.y, t = Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
  };
  return Math.min(...[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x,y:r.y+r.h},{x:r.x+r.w,y:r.y+r.h}].map(pointDist));
}
function union(rects) {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
  return { x, y, w: Math.max(...rects.map(r => r.x+r.w))-x, h: Math.max(...rects.map(r => r.y+r.h))-y };
}
function endpointPoint(r, side, offset = 0) {
  let x = r.x+r.w/2, y=r.y+r.h/2;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  if (side==='left'||side==='right') {
    y += clamp(offset,-r.h/2+10,r.h/2-10);
    let inset=0;
    if (r.shape==='diamond') inset=Math.abs(y-r.y-r.h/2)/(r.h/2)*r.w/2;
    if (['circle','icon','pill'].includes(r.shape)) { const radius=r.shape==='pill'?Math.min(r.h/2,r.w/2):r.w/2; inset=radius*(1-Math.sqrt(Math.max(0,1-((y-r.y-r.h/2)/(r.h/2))**2))); }
    x = side==='left'?r.x+inset:r.x+r.w-inset;
  } else {
    x += clamp(offset,-r.w/2+10,r.w/2-10);
    let inset=0;
    if (r.shape==='diamond') inset=Math.abs(x-r.x-r.w/2)/(r.w/2)*r.h/2;
    if (r.shape==='circle'||r.shape==='icon') inset=r.h/2*(1-Math.sqrt(Math.max(0,1-((x-r.x-r.w/2)/(r.w/2))**2)));
    if(r.shape==='pill'){const radius=Math.min(r.h/2,r.w/2),beyond=Math.max(0,Math.abs(x-r.x-r.w/2)-(r.w/2-radius));inset=radius-Math.sqrt(Math.max(0,radius*radius-beyond*beyond));}
    y=side==='top'?r.y+inset:r.y+r.h-inset;
  }
  return {x,y};
}

export const WEIGHTS = Object.freeze({
  balanced: { 'node-overlap':10,'edge-through-node':8,'label-on-node':6,'label-overlap':6,'label-through-text':6,'label-on-edge':3,'label-detached':3,'label-on-group-title':3,'label-near-node':1,'labels-too-close':2,'hook':3,'arrives-below':2,'shared-segment':3,'edge-through-group':2,'edge-through-title-band':2,'edge-through-title-text':6,'many-bends':1,'edge-hugs-node':1,'edge-on-group-border':1,'edge-near-group-border':1,'edges-too-close':2,'jog':1,'sparse-group':1,'wide-aspect':2,'long-edge':1,'crossing':1,'back-edge':0.5,'uneven-padding':2,'off-axis-port':1 },
  traceable: { 'node-overlap':10,'edge-through-node':8,'label-on-node':8,'label-overlap':8,'label-through-text':10,'label-on-edge':4,'label-detached':4,'label-on-group-title':4,'label-near-node':2,'labels-too-close':3,'hook':4,'arrives-below':3,'shared-segment':5,'edge-through-group':2,'edge-through-title-band':2,'edge-through-title-text':8,'many-bends':1,'edge-hugs-node':2,'edge-on-group-border':2,'edge-near-group-border':1,'edges-too-close':4,'jog':1,'sparse-group':0.5,'wide-aspect':1,'long-edge':2,'crossing':3,'back-edge':0.5,'uneven-padding':1,'off-axis-port':1 },
  direct: { 'node-overlap':10,'edge-through-node':8,'label-on-node':6,'label-overlap':6,'label-through-text':6,'label-on-edge':3,'label-detached':3,'label-on-group-title':3,'label-near-node':1,'labels-too-close':2,'hook':6,'arrives-below':4,'shared-segment':2,'edge-through-group':1,'edge-through-title-band':1,'edge-through-title-text':6,'many-bends':2,'edge-hugs-node':1,'edge-on-group-border':1,'edge-near-group-border':1,'edges-too-close':2,'jog':2,'sparse-group':1,'wide-aspect':2,'long-edge':4,'crossing':0.5,'back-edge':2,'uneven-padding':2,'off-axis-port':2 },
});
export const EQUIVALENCE = Object.freeze({geometryPx:1,diPer10:1,areaRatio:1.1,routeLengthRatio:1.1,newHardDefects:0,newIntentFailures:0});

/**
 * options: input is production routeInput or ExplorerLab.sceneInput. drawnRoutes are production
 * drawRoutes, not manufactured labels. referenceDoc/routes enable edit metrics. expectedPins
 * maps IDs to required x/y; fixedIds checks warm immobility; scopeIds means only those may move.
 */
export function measure(doc, routing, options = {}) {
  const nativeNodes = doc.graph?.nodes ?? [], nativeGroups = doc.graph?.groups ?? [], nativeEdges = doc.graph?.edges ?? [];
  const nativeBy = new Map([...nativeNodes,...nativeGroups].map(n=>[n.id,n]));
  const ancestorIds = id => { const ids=[]; const seen=new Set(); let p=nativeBy.get(id)?.parentId; while(p&&!seen.has(p)){ids.push(p);seen.add(p);p=nativeBy.get(p)?.parentId;} return ids; };
  const hidden = id => ancestorIds(id).some(a=>(doc.collapsed??[]).includes(a));
  const isCollapsed = id => (doc.collapsed??[]).includes(id);
  const visibleRect = id => options.rects instanceof Map ? options.rects.get(id) : options.rects?.[id];
  const visibleNodes = nativeNodes.filter(n=>!hidden(n.id)).map(n=>({...n,...doc.layout.nodes[n.id],...visibleRect(n.id),shape:doc.styles?.[n.id]?.shape??'box'}));
  const visibleGroups = nativeGroups.filter(n=>!hidden(n.id)).map(n=>({...n,...doc.layout.nodes[n.id],...(isCollapsed(n.id)?{w:Math.min(doc.layout.nodes[n.id]?.w??0,210),h:58}:{}),...visibleRect(n.id),collapsed:isCollapsed(n.id)}));
  const input = options.input ?? {nodes:visibleNodes,groups:visibleGroups.filter(g=>!g.frame),edges:nativeEdges.map(e=>({...e,cfg:doc.layout.edges[e.id]??{}}))};
  const rawRoutes = Array.isArray(routing)?routing:routing?.routes??[];
  const routeReport = Array.isArray(routing)?{}:routing?.report??{};
  const drawn = options.drawnRoutes;
  const routes = drawn ?? rawRoutes;
  const visibleObjects = [...visibleNodes,...visibleGroups].filter(rectValid);
  const byId = new Map(visibleObjects.map(n=>[n.id,n]));
  const visibleEndpoint = id => { if(byId.has(id))return id; for(const ancestor of ancestorIds(id))if(byId.has(ancestor))return ancestor; return id; };
  const inputBy = new Map([...(input.nodes??[]),...(input.groups??[])].map(n=>[n.id,n]));
  const edgeBy = new Map(nativeEdges.map(e=>[e.id,e]));
  const inputEdgeBy = new Map((input.edges??[]).map(e=>[e.id,e]));
  const issues=[], hard=[];
  const note=(kind,detail,hardKind)=>{issues.push({kind,detail});if(hardKind)hard.push({kind:hardKind,defect:kind,detail});};
  for(const n of [...nativeNodes,...nativeGroups]) if(!rectValid(doc.layout.nodes?.[n.id])) note('nonfinite-or-missing-geometry',n.id,'layout');
  const expectedObjects=options.requiredIds??[];
  for(const id of expectedObjects) if(!nativeBy.has(id)) note('missing-object',id,'layout');
  const expectedEdges=options.expectedEdges??(drawn?routes.map(r=>r.id):(input.edges??[]).map(e=>e.id));
  const routeIds=new Set(routes.map(r=>r.id));
  for(const id of expectedEdges) if(!routeIds.has(typeof id==='string'?id:id.id)) note('missing-route',typeof id==='string'?id:id.id,'routing');
  if(new Set(rawRoutes.map(r=>r.id)).size!==rawRoutes.length) note('duplicate-route','route IDs not unique','routing');
  for(const r of routes) if(!edgeBy.has(r.id)) note('unexpected-route',r.id,'routing');
  for(const r of rawRoutes){
    if(!Array.isArray(r.points)||r.points.length<2||r.points.some(p=>!finite(p.x)||!finite(p.y))) {note('nonfinite-or-missing-route',r.id,'routing');continue;}
    if(r.blocked) note('blocked-route',r.id,'routing');
    const e=inputEdgeBy.get(r.id);
    if(e&&(r.from!==e.from||r.to!==e.to)) note('wrong-endpoint-id',r.id,'routing');
    const cfg=e?.cfg??doc.layout.edges[r.id]??{};
    for(const end of ['from','to']){
      const side=cfg[end+'Side'];
      if(side&&side!=='auto'&&side!==r[end+'Side']) note('authored-side-violation',`${r.id}:${end} expected ${side}, got ${r[end+'Side']}`,'routing');
      const box=inputBy.get(r[end]);
      if(!box||!rectValid(box)||!r[end+'Side'])continue;
      const p=endpointPoint(box,r[end+'Side'],r[end+'Offset']??0),q=end==='from'?r.points[0]:r.points.at(-1);
      if(Math.hypot(p.x-q.x,p.y-q.y)>1) note('endpoint-disconnected',`${r.id}:${end} ${round(Math.hypot(p.x-q.x,p.y-q.y))}px`,'routing');
    }
  }
  for(let i=0;i<visibleObjects.length;i++)for(let j=i+1;j<visibleObjects.length;j++){
    const a=visibleObjects[i],b=visibleObjects[j];
    if(a.frame||b.frame||ancestorIds(a.id).includes(b.id)||ancestorIds(b.id).includes(a.id))continue;
    if(overlap(a,b))note('node-overlap',`${a.id} × ${b.id}`,'layout');
  }
  const geometries=doc.layout.nodes;
  const expectedPins={...options.expectedPins};
  if(options.referenceDoc){
    const ref=options.referenceDoc.layout.nodes;
    for(const id of options.fixedIds??[])if(ref[id])expectedPins[id]=ref[id];
    if(options.scopeIds){const allowed=new Set(options.scopeIds);for(const id of Object.keys(ref))if(!allowed.has(id)&&geometries[id])expectedPins[id]=ref[id];}
  }
  for(const [id,p]of Object.entries(expectedPins))if(geometries[id]&&(Math.abs(geometries[id].x-p.x)>EPS||Math.abs(geometries[id].y-p.y)>EPS))note('pin-or-scope-violation',id,'layout');

  const validRoutes=routes.filter(r=>Array.isArray(r.points)&&r.points.length>=2&&r.points.every(p=>finite(p.x)&&finite(p.y)));
  const nodes=[...visibleNodes,...visibleGroups.filter(g=>g.collapsed)].filter(rectValid);
  const groups=visibleGroups.filter(g=>!g.collapsed&&!g.frame&&rectValid(g));
  const flow=(options.direction??doc.settings?.direction??'RIGHT').toLowerCase(),arrow=flow==='down'?'D':'R';
  const routeDetail=[];
  const allSegs=[];
  const labels=(drawn??[]).filter(r=>r.label).map(r=>({edgeId:r.id,x:r.label.x-r.label.w/2,y:r.label.y-r.label.h/2,w:r.label.w,h:r.label.h,ink:options.labelInk?.[r.id]??null}));
  const bounds=union([...visibleObjects,...labels,...validRoutes.flatMap(r=>r.points.map(p=>({...p,w:0,h:0})))]);
  let totalLength=0,bends=0,maxBends=0,backEdges=0,hooks=0,overlapAreaSum=0;
  for(let i=0;i<visibleObjects.length;i++)for(let j=i+1;j<visibleObjects.length;j++)if(!visibleObjects[i].frame&&!visibleObjects[j].frame&&!ancestorIds(visibleObjects[i].id).includes(visibleObjects[j].id)&&!ancestorIds(visibleObjects[j].id).includes(visibleObjects[i].id))overlapAreaSum+=overlapArea(visibleObjects[i],visibleObjects[j]);
  for(const r of validRoutes){
    const e=edgeBy.get(r.id)??r,from=visibleEndpoint(e.from),to=visibleEndpoint(e.to);
    const s=byId.get(from),t=byId.get(to),segs=segments(r.points),runs=segs.map(straight).filter(Boolean),len=sum(segs.map(length));
    const b=Math.max(0,segs.length-1); totalLength+=len;bends+=b;maxBends=Math.max(maxBends,b);
    if(b>=4)note('many-bends',r.id);
    if(segs.some((sg,k)=>k>0&&k<segs.length-1&&length(sg)<12))note('jog',r.id);
    for(const sg of segs)allSegs.push({r,sg,run:straight(sg)});
    for(const n of nodes){
      if(n.id===from||n.id===to||r.cross)continue;
      if(segs.some(sg=>segmentHitsNode(sg,n)))note('edge-through-node',`${r.id} through ${n.id}`,'routing');
    }
    for(const n of nodes)if(runs.some(run=>sides(n).some(side=>{const d=(run.at-side.at)*side.out;return d>=-EPS&&d<15&&along(run,side)>16;})))note('edge-hugs-node',`${r.id} near ${n.id}`);
    for(const g of groups){
      const holds=id=>id===g.id||ancestorIds(id).includes(g.id);
      if(!holds(from)&&!holds(to)&&segs.some(sg=>segmentHitsRect(sg,grow(g,-4))))note('edge-through-group',`${r.id} through ${g.id}`);
      const ig=inputBy.get(g.id)??g,band={x:g.x+2,y:g.y+2,w:g.w-4,h:(ig.titleHeight??28)-2};
      const title=finite(ig.titleWidth)?{x:g.x+2,y:g.y+2,w:Math.max(0,Math.min(g.w-4,ig.titleWidth-2)),h:(ig.titleHeight??28)-2}:null;
      if(title&&segs.some(sg=>segmentHitsRect(sg,title)))note('edge-through-title-text',`${r.id} through ${g.id}`);
      if(segs.some((sg,k)=>{const vertical=Math.abs(sg[0].x-sg[1].x)<EPS;const terminal=(k===0||k===segs.length-1)&&vertical;const across=vertical&&(holds(from)||holds(to))&&Math.min(sg[0].y,sg[1].y)<=g.y+EPS&&Math.max(sg[0].y,sg[1].y)>=band.y+band.h-EPS&&title&&!segmentHitsRect(sg,title);return !terminal&&!across&&segmentHitsRect(sg,band);}))note('edge-through-title-band',`${r.id} through ${g.id}`);
      const ds=runs.flatMap(run=>sides(g).filter(side=>along(run,side)>16).map(side=>Math.abs(run.at-side.at)));
      if(ds.some(d=>d<8))note('edge-on-group-border',`${r.id} near ${g.id}`);else if(ds.some(d=>d<15))note('edge-near-group-border',`${r.id} near ${g.id}`);
    }
    let detour=null,wrap=false,back=false;
    if(s&&t){
      const delta=flow==='down'?center(t).y-center(s).y:center(t).x-center(s).x;
      const wraps=flow==='down'?t.x>=s.x+s.w-EPS:t.y>=s.y+s.h-EPS;
      wrap=delta<-20&&wraps;back=delta<-20&&!wraps;
      if(back&&e.directed!==false){backEdges++;note('back-edge',r.id);}
      const first=dir(segs[0]),last=dir(segs.at(-1));
      const far={U:s.y+s.h<=t.y,D:t.y+t.h<=s.y,L:s.x+s.w<=t.x,R:t.x+t.w<=s.x}[last];
      const axis='RL'.includes(first)?'x':'y',size=axis==='x'?'w':'h';
      const meet=Math.min(s[axis]+s[size],t[axis]+t[size])-Math.max(s[axis],t[axis])>-16;
      if((far||(segs.length>=3&&first===opposite[last]&&!meet))&&!((wrap||back)&&last===arrow)){hooks++;note('hook',r.id);}
      if(last==='U'&&center(s).y<t.y+t.h)note('arrives-below',r.id);
      if(delta>20&&e.directed!==false&&(last!==arrow||first===opposite[arrow]))note('off-axis-port',r.id);
      const direct=Math.abs(r.points[0].x-r.points.at(-1).x)+Math.abs(r.points[0].y-r.points.at(-1).y);
      detour=direct>EPS?len/direct:(len>EPS?null:1);
      if(len>400&&((!wrap&&!back&&detour>2)||len>Math.hypot(bounds.w,bounds.h)*(wrap||back?1:0.6)))note('long-edge',r.id);
    }
    routeDetail.push({id:r.id,length:round(len),bends:b,detourRatio:round(detour),wrap,back});
  }
  let crossings=0,sharedLength=0,sharedPairs=0,lanePairs=0,laneDeficit=0,minLaneGap=null;
  for(let i=0;i<validRoutes.length;i++)for(let j=i+1;j<validRoutes.length;j++){
    const a=validRoutes[i],b=validRoutes[j],ae=edgeBy.get(a.id)??a,be=edgeBy.get(b.id)??b;
    const related=[ae.from,ae.to].some(id=>id===be.from||id===be.to);
    let shared=0,near=false;
    for(const sa of segments(a.points))for(const sb of segments(b.points)){
      if(properCross(sa,sb)){crossings++;note('crossing',`${a.id} × ${b.id}`);}
      const ra=straight(sa),rb=straight(sb);if(!ra||!rb)continue;
      const amount=along(ra,rb),gap=Math.abs(ra.at-rb.at);if(amount<=EPS)continue;
      if(gap<EPS)shared+=amount;
      if(gap>=EPS&&gap<(doc.settings?.routing?.edgeGap??16)) {lanePairs++;laneDeficit+=amount*((doc.settings?.routing?.edgeGap??16)-gap);minLaneGap=minLaneGap===null?gap:Math.min(minLaneGap,gap);}
      if(gap>=2&&gap<10&&amount>16)near=true;
    }
    sharedLength+=shared;
    if(shared>EPS&&!related){sharedPairs++;note('shared-segment',`${a.id} × ${b.id} (${round(shared)}px)`);}
    if(near)note('edges-too-close',`${a.id} × ${b.id}`);
  }
  for(let i=0;i<labels.length;i++){
    const l=labels[i],r=validRoutes.find(r=>r.id===l.edgeId);
    for(const n of nodes)if(overlap(l,n))note('label-on-node',`${l.edgeId} on ${n.id}`);else if(overlap(l,grow(n,6)))note('label-near-node',`${l.edgeId} near ${n.id}`);
    for(const g of groups)if(overlap(l,{x:g.x,y:g.y,w:g.w,h:inputBy.get(g.id)?.titleHeight??32}))note('label-on-group-title',`${l.edgeId} on ${g.id}`);
    for(const k of labels.slice(i+1))if(overlap(l,k))note('label-overlap',`${l.edgeId} × ${k.edgeId}`);else if(Math.max(k.x-l.x-l.w,l.x-k.x-k.w,k.y-l.y-l.h,l.y-k.y-k.h)<Math.min(l.h,k.h))note('labels-too-close',`${l.edgeId} × ${k.edgeId}`);
    if(r&&Math.min(...segments(r.points).map(sg=>rectSegmentDistance(l,sg)))>l.h/2)note('label-detached',l.edgeId);
    for(const other of validRoutes){
      if(other.id===l.edgeId)continue;
      if(r&&Math.hypot(other.points[0].x-r.points[0].x,other.points[0].y-r.points[0].y)<1)continue;
      if(l.ink&&segments(other.points).some(sg=>segmentHitsRect(sg,grow(l.ink,-1))))note('label-through-text',`${other.id} through ${l.edgeId}`);
      else if(segments(other.points).some(sg=>segmentHitsRect(sg,grow(l,-1))))note('label-on-edge',`${other.id} through ${l.edgeId}`);
    }
  }
  const groupFill={},groupPadding={};
  for(const g of groups){
    const kids=visibleObjects.filter(n=>n.parentId===g.id);if(!kids.length)continue;
    const span=union(kids),fill=sum(kids.map(k=>k.w*k.h))/Math.max(1,span.w*span.h);groupFill[g.id]=round(fill);
    if(kids.length>1&&fill<0.35)note('sparse-group',g.id);
    const pads={left:span.x-g.x,right:g.x+g.w-span.x-span.w,top:span.y-g.y,bottom:g.y+g.h-span.y-span.h};groupPadding[g.id]=pads;
    if(Math.max(pads.left,pads.right,pads.bottom)-Math.min(pads.left,pads.right,pads.bottom)>12)note('uneven-padding',g.id);
  }
  const aspect=bounds.h>0?bounds.w/bounds.h:1,area=bounds.w*bounds.h;
  if(aspect>5||aspect<0.2)note('wide-aspect',String(round(aspect)));
  const counts={};for(const issue of issues)counts[issue.kind]=(counts[issue.kind]??0)+1;
  const edgeCount=validRoutes.length,raw={};for(const [name,weights]of Object.entries(WEIGHTS))raw[name]=sum(Object.entries(counts).map(([kind,n])=>n*(weights[kind]??0)));
  const per10=value=>edgeCount?10*value/edgeCount:value;
  const aligned=nodes.filter(n=>nodes.some(m=>m.id!==n.id&&[0,0.5,1].some(k=>Math.abs(n.x+n.w*k-m.x-m.w*k)<4||Math.abs(n.y+n.h*k-m.y-m.h*k)<4))).length;
  const requiredIntentFailures=(options.intentFailures??[]).length;
  const out={
    metricsVersion:VERSION,nodes:nativeNodes.length,groups:nativeGroups.length,visibleNodes:nodes.length,edges:edgeCount,
    hardDefects:hard.length,layoutHardDefects:hard.filter(h=>h.kind==='layout').length,routingHardDefects:hard.filter(h=>h.kind==='routing').length,hardValid:hard.length===0&&requiredIntentFailures===0,requiredIntentFailures,
    blockedRoutes:counts['blocked-route']??0,overlaps:counts['node-overlap']??0,overlapArea:round(overlapAreaSum),throughNodes:counts['edge-through-node']??0,authoredSideViolations:counts['authored-side-violation']??0,pinScopeViolations:counts['pin-or-scope-violation']??0,
    width:round(bounds.w),height:round(bounds.h),area:round(area),aspect:round(aspect),aspectError:round(Math.abs(Math.log(Math.max(1e-9,aspect)/(options.targetAspect??1.6)))),density:round(sum(nodes.map(n=>n.w*n.h))/Math.max(1,area)),deadSpaceRatio:round(Math.max(0,1-sum(nodes.map(n=>n.w*n.h))/Math.max(1,area))),alignment:round(aligned/Math.max(1,nodes.length)),
    crossings,sharedPairs,sharedLength:round(sharedLength),lanePairs,laneDeficit:round(laneDeficit),minLaneGap:round(minLaneGap),bends,maxBends,bendsPerEdge:round(bends/Math.max(1,edgeCount)),tinyJogs:counts.jog??0,hooks,backEdges,
    routeLength:round(totalLength),routeLengthPerEdge:round(totalLength/Math.max(1,edgeCount)),detourMean:round(mean(routeDetail.map(r=>r.detourRatio).filter(v=>v!==null))),detourMax:round(Math.max(1,...routeDetail.map(r=>r.detourRatio).filter(v=>v!==null))),
    labelCount:labels.length,labelDefects:sum(Object.entries(counts).filter(([k])=>k.startsWith('label')).map(([,n])=>n)),titleTextHits:counts['edge-through-title-text']??0,titleBandHits:counts['edge-through-title-band']??0,
    defectRaw:round(raw.balanced),defectIndex:round(raw.balanced/Math.max(1,edgeCount/10)),diPer10:round(per10(raw.balanced)),weightingScores:Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,round(per10(v))])),
    counts,issues,hard,groupFill,groupPadding,routeDetail,
    routerReported:{crossings:routeReport.crossings??null,shared:routeReport.shared??null,blocked:routeReport.blocked??null,lanePairs:routeReport.lanePairs??null,laneDeficit:routeReport.laneDeficit??null,passes:routeReport.passes??null},
    measurementCoverage:{geometry:'measured',paths:'measured',productionEdgeLabels:drawn?'measured':'unavailable',labelInk:options.labelInk?'production ink rectangles':'unavailable; label box crossings only',groupTitleInk:(input.groups??[]).some(g=>finite(g.titleWidth))?'production titleWidth/header envelope':'unavailable; title bands only',clipping:options.exportBounds?'measured against supplied exportBounds':'unavailable; no exported bounds',roundedAppearance:'not path-scored; visual inspection',colors:'not scored',emptyRectangle:'not measured; density/deadSpace are aggregate proxies',groupStaircase:'not implemented',unevenChannel:'not implemented',raggedBends:'not implemented',midWordWrap:'not implemented'},
  };
  if(options.referenceDoc)out.edit=editMetrics(options.referenceDoc,doc,options.referenceRoutes??[],routes,options);
  if(options.exportBounds){const eb=options.exportBounds;out.clipped=validRoutes.filter(r=>r.points.some(p=>p.x<eb.x-EPS||p.y<eb.y-EPS||p.x>eb.x+eb.w+EPS||p.y>eb.y+eb.h+EPS)).length+labels.filter(l=>l.x<eb.x-EPS||l.y<eb.y-EPS||l.x+l.w>eb.x+eb.w+EPS||l.y+l.h>eb.y+eb.h+EPS).length;}
  return out;
}

export function editMetrics(before, after, beforeRoutes=[], afterRoutes=[], options={}) {
  const a=before.layout.nodes,b=after.layout.nodes,shared=Object.keys(a).filter(id=>b[id]&&rectValid(a[id])&&rectValid(b[id]));
  const deltas=shared.map(id=>({id,dx:center(b[id]).x-center(a[id]).x,dy:center(b[id]).y-center(a[id]).y}));
  const sx=median(deltas.map(d=>d.dx)),sy=median(deltas.map(d=>d.dy));
  const moves=deltas.map(d=>Math.hypot(d.dx,d.dy)),adjusted=deltas.map(d=>Math.hypot(d.dx-sx,d.dy-sy));
  let flips=0,pairs=0;for(let i=0;i<shared.length;i++)for(let j=i+1;j<shared.length;j++){pairs++;const p=center(a[shared[i]]),q=center(a[shared[j]]),r=center(b[shared[i]]),s=center(b[shared[j]]);if(['x','y'].some(k=>Math.abs(q[k]-p[k])>20&&Math.abs(s[k]-r[k])>20&&Math.sign(q[k]-p[k])!==Math.sign(s[k]-r[k])))flips++;}
  const routesA=new Map((Array.isArray(beforeRoutes)?beforeRoutes:beforeRoutes.routes??[]).map(r=>[r.id,r]));
  const routesB=Array.isArray(afterRoutes)?afterRoutes:afterRoutes.routes??[];
  let changedSides=0,changedRoutes=0,comparedRoutes=0;
  for(const r of routesB){const prev=routesA.get(r.id);if(!prev)continue;comparedRoutes++;if(prev.fromSide!==r.fromSide||prev.toSide!==r.toSide)changedSides++;if(prev.points.length!==r.points.length||r.points.some((p,i)=>Math.hypot(p.x-prev.points[i].x-sx,p.y-prev.points[i].y-sy)>1))changedRoutes++;}
  const local=new Set(options.localIds??[]),localMoves=deltas.filter(d=>local.has(d.id)).map(d=>Math.hypot(d.dx,d.dy)),distantMoves=deltas.filter(d=>!local.has(d.id)).map(d=>Math.hypot(d.dx,d.dy));
  return {sharedObjects:shared.length,meanDisplacement:round(mean(moves)),maxDisplacement:round(Math.max(0,...moves)),translationAdjustedMean:round(mean(adjusted)),translationAdjustedMax:round(Math.max(0,...adjusted)),movedOver24:moves.filter(n=>n>24).length,adjustedMovedOver24:adjusted.filter(n=>n>24).length,orderFlips:flips,orderPairs:pairs,orderFlipRate:round(flips/Math.max(1,pairs)),changedSides,changedRoutes,comparedRoutes,changedSideRate:round(changedSides/Math.max(1,comparedRoutes)),changedRouteRate:round(changedRoutes/Math.max(1,comparedRoutes)),localMean:local.size?round(mean(localMoves)):null,distantMean:local.size?round(mean(distantMoves)):null,shift:{x:round(sx),y:round(sy)},requestedGlobalReflow:!!options.requestedGlobalReflow};
}

/** Deterministic object/path serialization excluding clocks. Translation remains meaningful. */
export function geometrySignature(doc,routing,tolerance=0) {
  const quantize=n=>tolerance?Math.round(n/tolerance)*tolerance:n;
  const routes=Array.isArray(routing)?routing:routing.routes??[];
  return JSON.stringify({nodes:Object.entries(doc.layout.nodes).sort(([a],[b])=>a.localeCompare(b)).map(([id,r])=>[id,...['x','y','w','h'].map(k=>quantize(r[k]))]),routes:[...routes].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>[r.id,r.fromSide,r.toSide,r.points.map(p=>[quantize(p.x),quantize(p.y)])])});
}
/** Elementwise tolerance comparison (rounding bins alone are not an equivalence proof). */
export function geometryEquivalent(a,b,tolerance=1) {
  const an=a.doc.layout.nodes,bn=b.doc.layout.nodes,ar=a.routes.routes??a.routes,br=b.routes.routes??b.routes;
  if(Object.keys(an).length!==Object.keys(bn).length||ar.length!==br.length)return false;
  if(Object.entries(an).some(([id,r])=>!bn[id]||['x','y','w','h'].some(k=>Math.abs(r[k]-bn[id][k])>tolerance)))return false;
  const bm=new Map(br.map(r=>[r.id,r]));return ar.every(r=>{const s=bm.get(r.id);return s&&r.fromSide===s.fromSide&&r.toSide===s.toSide&&r.points.length===s.points.length&&r.points.every((p,i)=>Math.hypot(p.x-s.points[i].x,p.y-s.points[i].y)<=tolerance);});
}
