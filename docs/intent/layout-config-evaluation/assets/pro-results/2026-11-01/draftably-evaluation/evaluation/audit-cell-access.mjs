/**
 * Supplementary, UNSCORED audit of the router body of cell-access routes.
 * Frozen metrics, product code, policy choices, and raw artifacts are never modified.
 * No compiler, layout engine, router, label placement, or route renderer is executed.
 *
 * The shipped drawRoutes prepends/appends intentional cell-access extensions at
 * either endpoint. DrawnRoute.cross retains at most one extension, so trimming
 * that field is unsafe. The saved raw router route.points excludes BOTH extensions.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { measure, geometrySignature, VERSION } from './metrics.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fileHash=p=>fs.existsSync(p)?hash(fs.readFileSync(p)):null;
const samePoint=(a,b)=>a?.x===b?.x&&a?.y===b?.y;
const finitePoints=p=>Array.isArray(p)&&p.length>=2&&p.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y));
const savedRoutes=x=>Array.isArray(x)?x:x?.routes??[];

/** Native node geometry is exactly makeGeometry(doc). Collapsed group rectangles
 * are copied from the saved production routeInput groups, not guessed from title size.
 * Marker obstacle inflation in routeInput is deliberately NOT applied to native nodes.
 */
function nativeVisibleRects(artifact){
  const rects=new Map(Object.entries(artifact.doc.layout.nodes).map(([id,r])=>[id,{...r}]));
  const groups=new Set(artifact.doc.graph.groups.map(g=>g.id));
  for(const g of artifact.input?.groups??[])if(groups.has(g.id))rects.set(g.id,{x:g.x,y:g.y,w:g.w,h:g.h});
  return rects;
}

function extensionEvidence(drawn,raw){
  // The unchanged renderer adds exactly two points per cell-access endpoint.
  // Validate that the saved raw body survives verbatim inside the drawn path.
  const matches=[];
  for(const start of [0,2]){
    const suffix=drawn.points.length-start-raw.points.length;
    if(![0,2].includes(suffix)||start+suffix===0)continue;
    if(raw.points.every((p,i)=>samePoint(p,drawn.points[start+i])))matches.push({fromExtension:start===2,toExtension:suffix===2,rawStartIndex:start,rawPointCount:raw.points.length});
  }
  return matches.length===1?{...matches[0],verified:true}: {verified:false,reason:matches.length?'ambiguous raw-body subsequence':'raw body is not the expected verbatim drawn-path subsequence'};
}

/** Exported for the analytical check. Returns issues only, never a replacement score. */
export function auditCellAccessArtifact(artifact){
  const drawn=savedRoutes(artifact.routes),cross=drawn.filter(r=>!!r.cross);
  const output={drawnRoutes:drawn.length,crossRoutes:cross.length,checkedCrossRoutes:0,bothEndpointAccessRoutes:0,fromOnlyAccessRoutes:0,toOnlyAccessRoutes:0,measureCalls:0,findings:[],otherCollapsedGroupFindings:[],gaps:[],routes:[]};
  if(!cross.length)return output;
  if(!artifact.doc?.graph?.nodes||!artifact.doc?.layout?.nodes){output.gaps.push({reason:'missing native document'});return output;}
  const rawList=savedRoutes(artifact.rawRouting),rawBy=new Map(rawList.map(r=>[r.id,r])),rawCounts=new Map(),eligible=[];
  for(const r of rawList)rawCounts.set(r.id,(rawCounts.get(r.id)??0)+1);
  for(const route of cross){
    const raw=rawBy.get(route.id);
    if((rawCounts.get(route.id)??0)>1){output.gaps.push({edgeId:route.id,reason:'duplicate saved raw router route IDs'});continue;}
    if(!raw||!finitePoints(raw.points)||!finitePoints(route.points)){output.gaps.push({edgeId:route.id,reason:!raw?'missing saved raw router route':'nonfinite/incomplete saved path'});continue;}
    const evidence=extensionEvidence(route,raw);
    if(!evidence.verified){output.gaps.push({edgeId:route.id,reason:evidence.reason});continue;}
    eligible.push({drawn:route,raw,evidence});
    output.checkedCrossRoutes++;
    if(evidence.fromExtension&&evidence.toExtension)output.bothEndpointAccessRoutes++;
    else if(evidence.fromExtension)output.fromOnlyAccessRoutes++;else output.toOnlyAccessRoutes++;
    output.routes.push({edgeId:route.id,...evidence,drawnPointCount:route.points.length,rawFrom:raw.from,rawTo:raw.to});
  }
  if(!eligible.length)return output;
  // Restrict measurement to these cross routes. All native visible obstacles remain
  // present; only unrelated route-to-route/label measurements (which are discarded)
  // differ. The raw result is the saved actual router result, not a reroute.
  const original=eligible.map(x=>x.drawn),bodyOnly=eligible.map(({drawn,raw})=>{
    const {cross:ignored,...withoutCross}=drawn;
    return {...withoutCross,points:raw.points.map(p=>({...p}))};
  });
  const options={input:artifact.input,rects:nativeVisibleRects(artifact),expectedEdges:eligible.map(x=>x.drawn.id)};
  const before=measure(artifact.doc,artifact.rawRouting,{...options,drawnRoutes:original});
  const after=measure(artifact.doc,artifact.rawRouting,{...options,drawnRoutes:bodyOnly});
  output.measureCalls=2;
  const existing=new Set(before.issues.filter(i=>i.kind==='edge-through-node').map(i=>i.detail));
  const nativeIds=new Set(artifact.doc.graph.nodes.map(n=>n.id)),groupIds=new Set(artifact.doc.graph.groups.map(g=>g.id));
  for(const issue of after.issues){
    if(issue.kind!=='edge-through-node'||existing.has(issue.detail))continue;
    const route=eligible.find(x=>issue.detail.startsWith(x.drawn.id+' through '));
    if(!route)continue;
    const obstacle=issue.detail.slice((route.drawn.id+' through ').length);
    const finding={edgeId:route.drawn.id,obstacleId:obstacle,detail:issue.detail,classification:'supplementary unscored raw-body obstacle intersection',fromExtension:route.evidence.fromExtension,toExtension:route.evidence.toExtension};
    if(nativeIds.has(obstacle))output.findings.push(finding);
    else if(groupIds.has(obstacle))output.otherCollapsedGroupFindings.push(finding);
    else output.gaps.push({edgeId:route.drawn.id,reason:'obstacle identity not found in native graph',detail:issue.detail});
  }
  return output;
}

function analyticalFixture(obstacle=true){
  const ns=[
    {id:'a',parentId:'ga',x:20,y:-10,w:20,h:20},
    {id:'b',parentId:'gb',x:340,y:-10,w:20,h:20},
    {id:'intentional_from_cell',parentId:'ga',x:50,y:-10,w:20,h:20},
    {id:'intentional_to_cell',parentId:'gb',x:310,y:-10,w:20,h:20},
    ...(obstacle?[{id:'unrelated_body_obstacle',x:170,y:-10,w:20,h:20}]:[]),
  ];
  const gs=[{id:'ga',x:0,y:-30,w:80,h:60},{id:'gb',x:300,y:-30,w:80,h:60}];
  const edge={id:'e',from:'a',to:'b',directed:true};
  const stubs=[{id:'e:from',x:94,y:-16,w:2,h:32,shape:'box'},{id:'e:to',x:284,y:-16,w:2,h:32,shape:'box'}];
  const raw={id:'e',from:'e:from',to:'e:to',fromSide:'right',toSide:'left',fromOffset:0,toOffset:0,blocked:false,points:[{x:96,y:0},{x:284,y:0}]};
  // Production stores just the destination extension in .cross when BOTH ends cross.
  const drawn={...raw,points:[{x:40,y:0},{x:94,y:0},...raw.points,{x:286,y:0},{x:340,y:0}],cross:[{x:286,y:0},{x:340,y:0}],label:null,path:'',halo:''};
  const doc={graph:{nodes:ns.map(({x,y,w,h,...n})=>({...n,title:n.id})),groups:gs.map(({x,y,w,h,...g})=>({...g,title:g.id})),edges:[edge]},layout:{nodes:Object.fromEntries([...ns,...gs].map(({id,x,y,w,h})=>[id,{x,y,w,h}])),edges:{e:{}},containers:{ga:{cellsBand:10},gb:{cellsBand:10}}},styles:Object.fromEntries(ns.map(n=>[n.id,{shape:'box'}])),collapsed:[],settings:{direction:'RIGHT',routing:{edgeGap:16}}};
  return {doc,input:{nodes:[...ns.map(n=>({...n,shape:'box'})),...stubs],groups:gs,edges:[{...edge,from:'e:from',to:'e:to',cfg:{fromSide:'right',toSide:'left'}}]},rawRouting:{routes:[raw]},routes:[drawn]};
}

function calibration(){
  const records=[];
  for(const present of [true,false]){
    const artifact=analyticalFixture(present),rects=nativeVisibleRects(artifact);
    const original=measure(artifact.doc,artifact.rawRouting,{input:artifact.input,rects,drawnRoutes:artifact.routes});
    const naive=measure(artifact.doc,artifact.rawRouting,{input:artifact.input,rects,drawnRoutes:artifact.routes.map(({cross,...r})=>r)});
    const supplementary=auditCellAccessArtifact(artifact);
    const originalHits=original.issues.filter(i=>i.kind==='edge-through-node');
    const naiveHits=naive.issues.filter(i=>i.kind==='edge-through-node');
    assert.equal(originalHits.length,0,'original blanket cross exemption');
    assert.equal(naiveHits.length,present?3:2,'naively clearing cross falsely includes intentional terminal cells');
    assert.deepEqual(supplementary.findings.map(x=>x.obstacleId),present?['unrelated_body_obstacle']:[]);
    assert.equal(supplementary.bothEndpointAccessRoutes,1);
    assert.equal(supplementary.gaps.length,0);
    records.push({id:present?'two-ended-access-with-unrelated-body-obstacle':'two-ended-access-only-intentional-terminal-crossings',kind:'analytical only; no product execution',originalUnscoredNodeIntersectionIssues:originalHits,naiveFlagRemovalIssues:naiveHits,supplementary,artifact});
  }
  const missing=analyticalFixture(true);missing.rawRouting.routes=[];
  const gap=auditCellAccessArtifact(missing);
  assert.equal(gap.checkedCrossRoutes,0);assert.equal(gap.findings.length,0);assert.equal(gap.gaps[0].reason,'missing saved raw router route');
  records.push({id:'missing-raw-body-is-a-coverage-gap',kind:'analytical only; no product execution',supplementary:gap});
  return {status:'pass',fixtures:records.length,analyticalChecks:13,actualCompilerCalls:0,actualLayoutCalls:0,actualRouterCalls:0,frozenMetricsModified:false,scoringOrPolicyChanges:false,records};
}

function inventory(split){
  const tasks=new Map(),taskFiles=[],canonical=new Map(),metadataGaps=[];
  const taskDir=path.join(root,'evaluation/tasks');
  for(const name of fs.readdirSync(taskDir).filter(n=>n.endsWith('.json')).sort()){
    const p=path.join(taskDir,name),list=JSON.parse(fs.readFileSync(p,'utf8'));if(!Array.isArray(list))continue;
    for(const t of list)if(t?.id)tasks.set(t.id,{...t,taskFile:'evaluation/tasks/'+name});
    if(!list.some(t=>t?.split===split))continue;
    taskFiles.push({path:'evaluation/tasks/'+name,sha256:fileHash(p)});
    // Avoid opening a result stream that could mix the opposite split's outcomes.
    if(list.some(t=>t?.split!==split)){metadataGaps.push({taskFile:name,reason:'mixed/unspecified split result stream not opened'});continue;}
    const rp=path.join(root,'data',name.replace(/\.json$/,'.jsonl'));if(!fs.existsSync(rp))continue;
    const lines=fs.readFileSync(rp,'utf8').split('\n');
    for(let i=0;i<lines.length;i++){
      if(!lines[i].trim())continue;let r;
      try{r=JSON.parse(lines[i]);}catch(err){metadataGaps.push({file:path.relative(root,rp),line:i+1,reason:'incomplete or invalid append record at audit snapshot'});continue;}
      if(!['ok','failed','timed_out'].includes(r.status)||canonical.has(r.id))continue;
      if(tasks.get(r.id)?.split===split)canonical.set(r.id,r);
    }
  }
  const paths=fs.readdirSync(path.join(root,'data/geometry')).filter(n=>n.endsWith('.json.gz')).sort();
  return {tasks,taskFiles,canonical,metadataGaps,paths};
}

async function main(){
  const split=process.argv.includes('--heldout')?'heldout':'development';
  if(split==='heldout'){
    const freeze=path.join(root,'data/policy-freeze.json');
    if(!fs.existsSync(freeze)||JSON.parse(fs.readFileSync(freeze,'utf8')).frozen!==true)throw new Error('Heldout audit blocked until policy freeze');
  }
  const metricsPath=path.join(root,'evaluation/metrics.mjs'),metricsBefore=fileHash(metricsPath);
  const started=new Date().toISOString();const cal=calibration();
  const calibrationRelative=split==='heldout'?'data/calibration/cell-access-audit-calibration-heldout-replay.json':'data/calibration/cell-access-audit-calibration.json';
  const calPath=path.join(root,calibrationRelative);
  fs.writeFileSync(calPath,JSON.stringify({...cal,createdAt:started,metricSha256:metricsBefore,auditCodeSha256:fileHash(fileURLToPath(import.meta.url)),...(split==='heldout'?{preFreezeCalibration:'data/calibration/cell-access-audit-calibration.json',preFreezeCalibrationSha256:fileHash(path.join(root,'data/calibration/cell-access-audit-calibration.json'))}:{})},null,2)+'\n');
  const inv=inventory(split),rows=[],crossArtifacts=[],findings=[],gaps=[...inv.metadataGaps],unknown=[],excluded=[];
  const byStage={};let artifacts=0,routes=0,cross=0,checked=0,both=0,fromOnly=0,toOnly=0,measureCalls=0,canonicalHashMismatches=0;
  const snapshotPaths=inv.paths;
  for(const name of snapshotPaths){
    const id=name.slice(0,-8),task=inv.tasks.get(id);
    if(!task){unknown.push(name);continue;}
    if(task.split!==split){excluded.push(name);continue;}
    const p=path.join(root,'data/geometry',name);let artifact;
    try{artifact=JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));}catch(err){gaps.push({trialId:id,reason:'cannot decode saved artifact',error:String(err)});continue;}
    const audit=auditCellAccessArtifact(artifact),record=inv.canonical.get(id);
    const actualHash=hash(geometrySignature(artifact.doc,artifact.routes));
    const matches=record?.status==='ok'&&record.geometryHash?actualHash===record.geometryHash:null;
    if(matches===false){canonicalHashMismatches++;gaps.push({trialId:id,reason:'saved artifact differs from canonical first-success geometry hash'});}
    artifacts++;routes+=audit.drawnRoutes;cross+=audit.crossRoutes;checked+=audit.checkedCrossRoutes;both+=audit.bothEndpointAccessRoutes;fromOnly+=audit.fromOnlyAccessRoutes;toOnly+=audit.toOnlyAccessRoutes;measureCalls+=audit.measureCalls;
    const stage=task.stage??'unspecified';byStage[stage]??={artifacts:0,drawnRoutes:0,crossRoutes:0,checkedCrossRoutes:0,nativeNodeFindings:0};
    byStage[stage].artifacts++;byStage[stage].drawnRoutes+=audit.drawnRoutes;byStage[stage].crossRoutes+=audit.crossRoutes;byStage[stage].checkedCrossRoutes+=audit.checkedCrossRoutes;byStage[stage].nativeNodeFindings+=audit.findings.length;
    const row={trialId:id,artifact:'data/geometry/'+name,stage,caseId:task.caseId??null,split,canonicalStatus:record?.status??'not present in result stream at snapshot',canonicalHardValid:record?.metrics?.hardValid??null,artifactMatchesCanonicalHash:matches,drawnRoutes:audit.drawnRoutes,crossRoutes:audit.crossRoutes,checkedCrossRoutes:audit.checkedCrossRoutes,nativeNodeFindings:audit.findings.length};
    rows.push(row);
    if(audit.crossRoutes)crossArtifacts.push({...row,audit});
    findings.push(...audit.findings.map(f=>({trialId:id,artifact:row.artifact,caseId:row.caseId,canonicalStatus:row.canonicalStatus,canonicalHardValid:row.canonicalHardValid,...f})));
    gaps.push(...audit.gaps.map(g=>({trialId:id,...g})));
  }
  const metricsAfter=fileHash(metricsPath);assert.equal(metricsAfter,metricsBefore,'frozen metric implementation must remain unchanged');
  const report={audit:'supplementary-cell-access-obstacle-audit-1',auditCodeSha256:fileHash(fileURLToPath(import.meta.url)),split,snapshotStarted:started,finishedAt:new Date().toISOString(),status:gaps.length||unknown.length?'complete with recorded coverage gaps':'complete',unscored:true,actualCompilerCalls:0,actualLayoutCalls:0,actualRouterCalls:0,frozenMeasureCallsOnSavedArtifacts:measureCalls,frozenMetricVersion:VERSION,frozenMetricSha256:metricsBefore,frozenMetricsModified:false,policyProposalModified:false,method:'For every saved drawn route with a truthy cross flag, verify the saved raw router points appear verbatim inside its drawn path with two added points per access endpoint; remove the cross flag and substitute only those raw points; reuse frozen measure and retain only new edge-through-node issues. No scores, labels, geometry, routes, trial status, or policy results are rewritten.',scope:'Snapshot census of every saved data/geometry artifact assigned to the requested split by task definitions, including hard-invalid outputs and noncanonical artifacts. No opposite-split artifact is opened. Layout checkpoints and route caches lack complete drawn-route evidence and are outside this census.',geometryScope:'Native visible node rectangles equal doc.layout.nodes via production makeGeometry/visibleRects. Collapsed group frames use saved production routeInput groups; any new collapsed-group intersections are kept separately from the requested native-node findings.',sourceEvidence:[{path:'baseline/src/model/routes.ts',sha256:fileHash(path.resolve(root,'../baseline/src/model/routes.ts')),functions:['cellEnds','routeInput','drawRoutes'],fact:'drawRoutes extends both endpoints but cross stores destination extension preferentially; raw router points omit both intentional extensions.'},{path:'baseline/src/dsl/project.ts',sha256:fileHash(path.resolve(root,'../baseline/src/dsl/project.ts')),functions:['visibleRects']},{path:'baseline/src/model/graph.ts',sha256:fileHash(path.resolve(root,'../baseline/src/model/graph.ts')),functions:['makeGeometry','frameRect','visibleGraph']}],totals:{artifacts,drawnRoutes:routes,crossRoutes:cross,checkedCrossRoutes:checked,bothEndpointAccessRoutes:both,fromOnlyAccessRoutes:fromOnly,toOnlyAccessRoutes:toOnly,newUnscoredNativeNodeFindings:findings.length,canonicalGeometryHashMismatches:canonicalHashMismatches,unregisteredArtifactsNotOpened:unknown.length,oppositeOrUnspecifiedSplitArtifactsNotOpened:excluded.length,coverageGaps:gaps.length},byStage,findings,crossArtifacts,coverageGaps:gaps,unregisteredArtifacts:unknown,taskDefinitionSnapshots:inv.taskFiles,artifactCensus:rows,calibration:{path:calibrationRelative,fixtures:cal.fixtures,analyticalChecks:cal.analyticalChecks,status:cal.status},limitations:['These are supplementary unscored findings, not a revised frozen metric or reranked result table.','If crossRoutes is zero, observed corpus coverage of this path is absent; analytical checks demonstrate the mechanism but do not substitute for product examples.','The census is a timestamped filesystem snapshot; rerun after later development or heldout artifacts finish.','Full intentional access extensions are excluded, not accepted as arbitrary body paths through other cells.','Group-title, label, detour, side-selection, and rounded appearance differences are deliberately not rescored.']};
  const dest=path.join(root,`data/analysis/cell-access-audit-${split}.json`);fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({split,...report.totals,calibration:cal.status,output:path.relative(root,dest),actualCompilerCalls:0,actualLayoutCalls:0,actualRouterCalls:0,unscored:true}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
