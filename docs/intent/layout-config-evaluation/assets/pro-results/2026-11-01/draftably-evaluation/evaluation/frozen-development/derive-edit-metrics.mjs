#!/usr/bin/env node
/** Re-measure existing before/after artifacts. No product algorithm executes here. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { editMetrics, geometrySignature, geometryEquivalent } from './metrics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=new Map();
const read=p=>{
  if(!cache.has(p))cache.set(p,JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(root,p)))));
  return cache.get(p);
};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const centre=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const forwardAxis=(doc,direction)=>{
  if(!direction)return null;
  const axis=direction==='DOWN'?'y':'x',other=axis==='y'?'x':'y';
  const deltas=[];
  for(const edge of doc.graph.edges){
    if(edge.directed===false)continue;
    const a=doc.layout.nodes[edge.from],b=doc.layout.nodes[edge.to];
    if(!a||!b)continue;
    const ca=centre(a),cb=centre(b);
    deltas.push({progress:cb[axis]-ca[axis],cross:cb[other]-ca[other]});
  }
  return {direction,modelDirectedEdges:deltas.length,forward:deltas.filter(d=>d.progress>.5).length,
    backward:deltas.filter(d=>d.progress<-.5).length,tied:deltas.filter(d=>Math.abs(d.progress)<=.5).length,
    axisDominant:deltas.filter(d=>Math.abs(d.progress)>=Math.abs(d.cross)).length,
    meanProgress:avg(deltas.map(d=>d.progress)),
    note:'Diagnostic over model edge endpoint centers, including returns/cycles and hidden descendants; not a hard direction-compliance gate.'};
};
const pathSignature=a=>JSON.stringify([...a.routes].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>[r.id,r.path,r.halo]));
let text='';
for await(const chunk of process.stdin)text+=chunk;
const results=[];
for(const req of JSON.parse(text)){
  try{
    const before=read(req.before),after=read(req.after);
    const partial=!!req.referencePartial||before.phase==='layout-complete-routing-pending';
    const beforeRoutes=partial?[]:before.routes??[];
    const afterRoutes=after.routes??[];
    const edit=editMetrics(before.doc,after.doc,beforeRoutes,afterRoutes,{localIds:req.localIds??[],requestedGlobalReflow:!!req.requestedGlobalReflow});
    if(partial){
      edit.referenceRouteHistoryAvailable=false;
      for(const k of ['changedSides','changedSideRate','changedRoutes','changedRouteRate'])edit[k]=null;
    }
    const a=before.doc.layout.nodes,b=after.doc.layout.nodes;
    const ids=Object.keys(a).filter(id=>b[id]);
    const local=new Set(req.localIds??[]);
    const ls=[],ds=[];
    for(const id of ids){
      const x=centre(a[id]),y=centre(b[id]);
      const distance=Math.hypot(y.x-x.x-edit.shift.x,y.y-x.y-edit.shift.y);
      (local.has(id)?ls:ds).push(distance);
    }
    const nodeBefore=geometrySignature(before.doc,[]),nodeAfter=geometrySignature(after.doc,[]);
    const nodeExact=nodeBefore===nodeAfter;
    const nodeTolerance=geometryEquivalent({doc:before.doc,routes:[]},{doc:after.doc,routes:[]},1);
    const geometryExact=partial?null:geometrySignature(before.doc,beforeRoutes)===geometrySignature(after.doc,afterRoutes);
    const geometryTolerance=partial?null:geometryEquivalent({doc:before.doc,routes:beforeRoutes},{doc:after.doc,routes:afterRoutes},1);
    const oldSides=new Map(beforeRoutes.map(r=>[r.id,r]));
    const sidesExact=partial?null:beforeRoutes.length===afterRoutes.length&&afterRoutes.every(r=>oldSides.has(r.id)&&oldSides.get(r.id).fromSide===r.fromSide&&oldSides.get(r.id).toSide===r.toSide);
    results.push({id:req.id,edit,localSharedObjects:ls.length,distantSharedObjects:ds.length,
      translationAdjustedLocalMean:avg(ls),translationAdjustedDistantMean:avg(ds),
      nodeGeometryExact:nodeExact,nodeGeometryWithin1px:nodeTolerance,
      completeGeometryExact:geometryExact,completeGeometryWithin1px:geometryTolerance,
      selectedPortsExact:sidesExact,
      renderedPathsExact:partial?null:pathSignature({...before,routes:beforeRoutes})===pathSignature({...after,routes:afterRoutes}),
      beforeGeometryHash:partial?null:hash(geometrySignature(before.doc,beforeRoutes)),
      afterGeometryHash:hash(geometrySignature(after.doc,afterRoutes)),
      referenceRouteHistoryAvailable:!partial,
      beforeEffectiveDirection:before.doc.settings.direction,
      afterEffectiveDirection:after.doc.settings.direction,
      projectedDirectionCaution:'For source recipes without root.engine, projectScene leaves the layout-tool setting at its default; this field is not compiled reading-direction compliance.',
      requestedDirection:req.requestedDirection??null,
      requestedDirectionSettingRetained:req.requestedDirection?after.doc.settings.direction===req.requestedDirection:null,
      unchangedNodesDespiteDifferentRequestedDirection:req.requestedDirection?before.doc.settings.direction!==req.requestedDirection&&nodeExact:null,
      unchangedNodesOnDirectionRequest:req.requestedDirection?nodeExact:null,
      forwardAxisBefore:forwardAxis(before.doc,req.requestedDirection),
      forwardAxisAfter:forwardAxis(after.doc,req.requestedDirection),
      referencePartial:partial});
  }catch(error){results.push({id:req.id,error:String(error)});}
}
console.log(JSON.stringify(results));
