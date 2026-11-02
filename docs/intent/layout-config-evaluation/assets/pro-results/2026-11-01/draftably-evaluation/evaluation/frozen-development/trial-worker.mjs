import { parentPort } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { createAdapter, bundleRoot } from './adapter.mjs';
import { measure, geometrySignature } from './metrics.mjs';
import { sourceFor, localPinFailures, descendants } from './source-tools.mjs';
import { checkIntent } from './intent.mjs';

const adapter = await createAdapter();
const readArtifact = p => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(bundleRoot,p))));
let canonicalRows;
function canonicalRow(id) {
  if(!canonicalRows){
    canonicalRows=new Map();
    for(const name of fs.readdirSync(path.join(bundleRoot,'data')).filter(n=>n.endsWith('.jsonl'))){
      for(const line of fs.readFileSync(path.join(bundleRoot,'data',name),'utf8').split('\n').filter(Boolean)){
        const row=JSON.parse(line);if(row.id&&row.status&&!canonicalRows.has(row.id))canonicalRows.set(row.id,row);
      }
    }
  }
  return canonicalRows.get(id);
}
function readReference(p, allowPartial=false) {
  if(fs.existsSync(path.resolve(bundleRoot,p))){
    const artifact=readArtifact(p),row=canonicalRow(artifact.trialId);
    if(artifact.phase==='layout-complete-routing-pending')return {...artifact,referencePartial:true,routes:[]};
    if(!row||row.status==='ok')return artifact;
    if(!allowPartial)throw Error('Canonical reference did not complete: '+p);
  }
  const checkpoint=p.replace('data/geometry/','data/layout-checkpoints/');
  if(!allowPartial||!fs.existsSync(path.resolve(bundleRoot,checkpoint)))return readArtifact(p);
  return {...readArtifact(checkpoint),referencePartial:true,routes:[]};
}
const hash = value => crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

async function run(task) {
  const started = performance.now();
  const checkpoint = data => {
    const p=path.join(bundleRoot,'data/layout-checkpoints',task.id+'.json.gz');fs.mkdirSync(path.dirname(p),{recursive:true});
    const {scene,...rest}=data;
    fs.writeFileSync(p,zlib.gzipSync(JSON.stringify({...rest,trialId:task.id,stage:task.stage,phase:'layout-complete-routing-pending',sceneObjects:scene?.objects??null,diagnostics:scene?.diagnostics??[]})));
  };
  let output, reference, inputDoc, intentModel, intentReferenceDoc, requiredIds=[], expectedEdges=[], expectedConnections=[];
  if (task.kind === 'source') {
    const source = sourceFor(task,adapter);
    const parsed=adapter.syntax.parseModel(source);
    intentModel=parsed;
    requiredIds=parsed.objects.map(o=>o.id);
    expectedEdges=parsed.edges.map(e=>e.id);
    expectedConnections=parsed.edges.map(e=>({id:e.id,from:e.source,to:e.target}));
    output = await adapter.source(source, { routing: task.routing ?? adapter.router.defaults, view:task.view,onLayout:checkpoint,useCache:!task.bypassCache });
  } else {
    reference = readReference(task.reference,task.allowPartialReference);
    inputDoc = structuredClone(reference.doc);
    if((task.kind!=='route'||task.inheritSourceIntent)&&reference.source){intentModel=adapter.syntax.parseModel(reference.source);intentReferenceDoc=reference.doc;}
    if (task.kind === 'warm-edit') {
      const edited = readReference(task.editedReference,task.allowPartialReference);
      inputDoc = structuredClone(edited.doc);
      if(edited.source){intentModel=adapter.syntax.parseModel(edited.source);intentReferenceDoc=edited.doc;}
      // Current topology/sizes, actual prior positions: a warm engine input, not a cold proxy.
      for (const [id,g] of Object.entries(inputDoc.layout.nodes)) {
        const old=reference.doc.layout.nodes[id];
        if (old && task.action!=='compile-recipe') { g.x=old.x;g.y=old.y; }
      }
    }
    if (task.patchDoc) {
      const p=task.patchDoc;
      for (const [id,delta] of Object.entries(p.move??{})) {
        const g=inputDoc.layout.nodes[id];if(g){g.x+=delta.dx??0;g.y+=delta.dy??0;}
      }
      for(const id of p.manual??[])if(inputDoc.layout.nodes[id])inputDoc.layout.nodes[id].manual=true;
      for(const id of p.pinned??[])if(inputDoc.layout.nodes[id])inputDoc.layout.nodes[id].pinned=true;
      for(const [id,size]of Object.entries(p.resize??{}))if(inputDoc.layout.nodes[id])Object.assign(inputDoc.layout.nodes[id],size);
      if(p.collapsed)inputDoc.collapsed=p.collapsed;
      if(p.releaseSides)for(const c of Object.values(inputDoc.layout.edges)){delete c.fromSide;delete c.toSide;}
      for(const [id,cfg] of Object.entries(p.edges??{}))inputDoc.layout.edges[id]={...inputDoc.layout.edges[id],...cfg};
      if(p.settings)Object.assign(inputDoc.settings,p.settings);
    }
    requiredIds=task.inheritSourceIntent&&intentModel?intentModel.objects.map(n=>n.id):[...inputDoc.graph.nodes,...inputDoc.graph.groups].map(n=>n.id);
    expectedEdges=task.inheritSourceIntent&&intentModel?intentModel.edges.map(e=>e.id):adapter.projection.visibleRects(inputDoc).vg.edges.map(e=>e.id);
    expectedConnections=task.inheritSourceIntent&&intentModel?intentModel.edges.map(e=>({id:e.id,from:e.source,to:e.target})):inputDoc.graph.edges.map(e=>({id:e.id,from:e.from,to:e.to}));
    const previous = task.history ? (reference.routes??[]).map(r=>({id:r.id,fromSide:r.fromSide,toSide:r.toSide})) : [];
    if(task.kind==='route'||['retain','compile-recipe'].includes(task.action)) {
      inputDoc.settings.routing=adapter.router.settings({...adapter.router.defaults,...task.routing});
      checkpoint({doc:inputDoc,reports:[],engineCalls:0,compileMs:0});
      output={doc:inputDoc,...adapter.route(inputDoc,previous,task.routeOptions??{},!task.bypassCache),reports:[],engineCalls:0,compileMs:0};
      output.totalMs=performance.now()-started;
    } else if(['warm','warm-edit'].includes(task.kind)) {
      output=await adapter.warm(inputDoc,{...task.options,previous,routing:task.routing??adapter.router.defaults,onLayout:checkpoint,useCache:!task.bypassCache});
    } else throw Error(`Unknown trial kind ${task.kind}`);
  }
  if(task.compareReference)reference=readReference(task.compareReference,task.allowPartialReference);
  const opts={
    input:output.input,drawnRoutes:output.drawnRoutes,rects:output.rects,
    requiredIds,expectedEdges,intentFailures:[...localPinFailures(output.scene),...expectedConnections.flatMap(e=>{
      const now=output.doc.graph.edges.find(n=>n.id===e.id);
      return !now||now.from!==e.from||now.to!==e.to?[`changed-or-lost semantic edge ${e.id}`]:[];
    })],
    targetAspect:task.targetAspect??1.6,
    ...(reference?{referenceDoc:reference.doc,referenceRoutes:reference.routes,localIds:task.localIds??[],requestedGlobalReflow:task.requestedGlobalReflow??false}:{}),
  };
  if(inputDoc&&task.kind.startsWith('warm')) {
    const fixed=[...new Set([...Object.keys(inputDoc.layout.nodes).filter(id=>inputDoc.layout.nodes[id].pinned || (task.options?.respectManual&&inputDoc.layout.nodes[id].manual)),...(task.options?.fixedIds??[])].flatMap(id=>descendants(inputDoc,id)))];
    opts.expectedPins=Object.fromEntries(fixed.map(id=>[id,inputDoc.layout.nodes[id]]));
    if(['selection','neighbourhood','container'].includes(task.options?.scope)) {
      let selected=task.options.scope==='container'?[task.options.containerId]:[...(task.options.selected??[])];
      if(task.options.scope==='neighbourhood'){
        const picked=new Set(selected);
        for(const e of inputDoc.graph.edges){if(picked.has(e.from))selected.push(e.to);if(picked.has(e.to))selected.push(e.from);}
      }
      const allowed=new Set(selected.flatMap(id=>descendants(inputDoc,id)));
      for(const [id,g]of Object.entries(inputDoc.layout.nodes))if(!allowed.has(id))opts.expectedPins[id]=g;
    }
  }
  const intent=intentModel?checkIntent(intentModel,output.doc,{scene:output.scene,referenceDoc:intentReferenceDoc}):{failures:[],checked:{},skipped:[{kind:'route-only',reason:'Positions/port constraints are the explicitly mutated experiment input.'}]};
  opts.intentFailures.push(...intent.failures);
  if(task.inheritSourceIntent&&reference?.metrics){
    const inheritedExtra=Math.max(0,(reference.metrics.requiredIntentFailures??0)-(reference.intent?.failures?.length??0));
    for(let i=0;i<inheritedExtra;i++)opts.intentFailures.push('Inherited source pin/refinement failure from the unchanged layout reference.');
  }
  const metrics=measure(output.doc,output.result,opts);
  if(reference?.referencePartial&&metrics.edit){
    metrics.edit.referenceRouteHistoryAvailable=false;
    for(const k of ['changedSides','changedSideRate','changedRoutes','changedRouteRate'])if(k in metrics.edit)metrics.edit[k]=null;
  }
  const rawSignature=geometrySignature(output.doc,output.drawnRoutes);
  const artifact={trialId:task.id,source:output.source??null,doc:output.doc,input:output.input,routes:output.drawnRoutes,rawRouting:output.result,
    reports:output.reports,diagnostics:output.scene?.diagnostics??[],metrics,intent,
    sceneObjects:output.scene?.objects.map(o=>({id:o.id,parent:o.parent,x:o.x,y:o.y,w:o.w,h:o.h,localX:o.localX,localY:o.localY,baseX:o.baseX,baseY:o.baseY}))??null};
  const relative=`data/geometry/${task.id}.json.gz`;
  const target=path.resolve(bundleRoot,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,zlib.gzipSync(JSON.stringify(artifact),{level:6}));
  if(task.render){const dest=path.resolve(bundleRoot,task.render);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,adapter.render(output));}
  const {issues,hard,routeDetail,groupFill,groupPadding,...flat}=metrics;
  return {id:task.id,stage:task.stage,caseId:task.caseId,family:task.family,split:task.split,kind:task.kind,
    status:'ok',settings:task.layout??task.options??task.routing??{},routingSettings:output.doc.settings.routing,
    tag:task.tag??null,control:task.control??null,level:task.level??null,
    policy:task.policy??null,editId:task.editId??null,editOperation:task.editOperation??null,
    action:task.action??null,reference:task.reference??task.compareReference??null,
    referencePartial:reference?.referencePartial??false,requestedGlobalReflow:task.requestedGlobalReflow??false,
    metrics:flat,issueCounts:metrics.counts,hard,geometry:relative,geometryHash:hash(rawSignature),
    geometryBin1pxHash:hash(geometrySignature(output.doc,output.drawnRoutes,1)),
    inputHash:hash({source:output.source,doc:inputDoc??null,layout:task.layout,routing:task.routing,options:task.options,history:task.history}),
    engineCalls:output.engineCalls,reports:output.reports,routingCacheHit:output.routingCacheHit??false,actualRouterCalls:output.actualRouterCalls??1,
    timing:{compileMs:output.compileMs,routingMs:output.routingMs,routingCachedOriginalMs:output.routingCachedOriginalMs,labelMs:output.labelMs,totalMs:output.totalMs,workerMs:performance.now()-started},
    intent,diagnostics:output.scene?.diagnostics??[]};
}

parentPort.postMessage({ready:true});
parentPort.on('message',async task=>{
  const start=performance.now();
  try { parentPort.postMessage({row:await run(task)}); }
  catch(error){parentPort.postMessage({row:{id:task.id,stage:task.stage,caseId:task.caseId,family:task.family,split:task.split,kind:task.kind,status:'failed',settings:task.layout??task.options??task.routing,control:task.control,level:task.level,error:String(error.stack??error),diagnostics:error.diagnostics??[],timing:{workerMs:performance.now()-start}}});}
});
