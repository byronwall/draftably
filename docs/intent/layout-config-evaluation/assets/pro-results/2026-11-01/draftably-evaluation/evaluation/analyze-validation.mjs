/** Read-only determinism, identity, equivalence and isolated timing analysis. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createAdapter,bundleRoot} from './adapter.mjs';
import {geometryEquivalent,geometrySignature} from './metrics.mjs';
const directory=path.join(bundleRoot,'data/analysis/validation');fs.mkdirSync(directory,{recursive:true});
const read=name=>{
 const file=path.join(bundleRoot,'data',name+'.jsonl');const out=new Map();
 if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split('\n').filter(Boolean)){const r=JSON.parse(line);if(!out.has(r.id))out.set(r.id,r);}
 return out;
};
const complete=name=>{
 const file=path.join(bundleRoot,'evaluation/tasks',name+'.json');
 if(!fs.existsSync(file))return false;
 const ids=JSON.parse(fs.readFileSync(file)).map(t=>t.id),data=read(name);
 return ids.every(id=>data.has(id));
};
const artifacts=new Map();
const artifact=r=>{
 if(!r?.geometry||r.status!=='ok')return null;
 if(!artifacts.has(r.id))artifacts.set(r.id,JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(bundleRoot,r.geometry)))));
 return artifacts.get(r.id);
};
const write=(name,value)=>fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
const quantile=(xs,p)=>{const v=xs.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;const i=(v.length-1)*p;return v[Math.floor(i)]+(v[Math.ceil(i)]-v[Math.floor(i)])*(i-Math.floor(i));};
const describe=xs=>({n:xs.filter(Number.isFinite).length,median:quantile(xs,.5),p95:quantile(xs,.95),max:quantile(xs,1)});
const manifest=JSON.parse(fs.readFileSync(path.join(bundleRoot,'corpus/manifest.json')));
const cases=new Map(manifest.cases.map(c=>[c.id,c]));
const screen=read('screen-development');
const engines=['compound-flow','boundary-align','compound-spring','tidy','stress','force','flow','layered','tree','grid'];

if(complete('screen-development')){
 const rows=[];let exactPairs=0,tolerancePairs=0,comparedPairs=0;
 for(const c of manifest.cases.filter(c=>c.split==='development')){
  const all=[...screen.values()].filter(r=>r.caseId===c.id),successful=all.filter(r=>r.status==='ok');
  const exact=new Map();for(const r of successful){const key=geometrySignature(artifact(r).doc,artifact(r).routes);if(!exact.has(key))exact.set(key,[]);exact.get(key).push(r.id);}
  const clusters=[];
  for(const r of [...successful].sort((a,b)=>a.id.localeCompare(b.id))){
   const cluster=clusters.find(group=>group.every(s=>geometryEquivalent(artifact(r),artifact(s),1)));
   if(cluster)cluster.push(r);else clusters.push([r]);
  }
  let ep=0,tp=0,np=0;
  for(let i=0;i<successful.length;i++)for(let j=i+1;j<successful.length;j++){
   np++;if(successful[i].geometryHash===successful[j].geometryHash)ep++;
   if(geometryEquivalent(artifact(successful[i]),artifact(successful[j]),1))tp++;
  }
  exactPairs+=ep;tolerancePairs+=tp;comparedPairs+=np;
  rows.push({caseId:c.id,family:c.family,planned:all.length,completed:successful.length,failed:all.length-successful.length,
   exactClasses:[...exact.values()],onePixelCompleteLinkClusters:clusters.map(a=>a.map(r=>r.id)),pairs:np,exactPairs:ep,onePixelPairs:tp});
 }
 write('equivalence',{method:'Exact node/group boxes plus selected ports and route polylines. One-pixel comparisons are elementwise; complete-link clusters require every pair within tolerance. Failed full pipelines are not geometry-equivalent successes.',comparedPairs,exactPairs,tolerancePairs,exactRate:exactPairs/comparedPairs,onePixelRate:tolerancePairs/comparedPairs,cases:rows});
}

if(complete('identity-development')){
 const adapter=await createAdapter();const data=read('identity-development'),rows=[];
 for(const r of data.values()){
  const engine=r.settings.engine,baseline=screen.get(`C-development-${r.caseId}-${engine}-RIGHT`);
  const row={trialId:r.id,caseId:r.caseId,family:r.family,engine,change:r.tag,status:r.status,baselineStatus:baseline?.status??'unavailable'};
  if(r.status==='ok'&&baseline?.status==='ok'){
   const a=structuredClone(artifact(r)),b=artifact(baseline);
   if(r.tag==='rename'){
    const source=fs.readFileSync(path.join(bundleRoot,cases.get(r.caseId).path),'utf8');
    const objects=adapter.syntax.readSource(source).lines.filter(s=>s.kind==='statement'&&['node','group'].includes(s.command));
    const inverse=new Map(objects.map((s,i)=>[`zz${String(objects.length-i).padStart(4,'0')}`,s.args[0].value]));
    a.doc.layout.nodes=Object.fromEntries(Object.entries(a.doc.layout.nodes).map(([id,g])=>[inverse.get(id)??id,g]));
   }
   row.exact=geometrySignature(a.doc,a.routes)===geometrySignature(b.doc,b.routes);
   row.within1px=geometryEquivalent(a,b,1);
   row.changedHardValidity=r.metrics.hardValid!==baseline.metrics.hardValid;
  }
  rows.push(row);
 }
 await adapter.close();
 write('identity',{method:'Rename comparisons invert the source-tool identifier map before comparing geometry. Declaration-order changes are tested separately and are not automatically classified as defects.',planned:240,rows,
  summaries:['rename','reorder'].map(change=>{const a=rows.filter(r=>r.change===change),compared=a.filter(r=>typeof r.exact==='boolean');return {change,planned:a.length,compared:compared.length,unavailable:a.length-compared.length,exact:compared.filter(r=>r.exact).length,within1px:compared.filter(r=>r.within1px).length,hardValidityChanges:compared.filter(r=>r.changedHardValidity).length};})});
}

if(complete('timing-development')){
 const data=read('timing-development'),tasks=JSON.parse(fs.readFileSync(path.join(bundleRoot,'evaluation/tasks/timing-development.json'))),byTask=new Map(tasks.map(t=>[t.id,t]));
 const groups=new Map();for(const r of data.values()){const k=r.caseId+'|'+r.settings.engine;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const details=[];
 for(const [key,all]of groups){
  const samples=all.filter(r=>byTask.get(r.id).repeat>0),ok=samples.filter(r=>r.status==='ok'),successful=all.filter(r=>r.status==='ok');
  const ref=successful[0],equal=ref?successful.every(r=>geometryEquivalent(artifact(ref),artifact(r),1)):null;
  const exact=ref?successful.every(r=>r.geometryHash===ref.geometryHash):null;
  details.push({caseId:all[0].caseId,family:all[0].family,engine:all[0].settings.engine,
   samples:samples.length,successful:ok.length,timedOut:samples.filter(r=>r.status==='timed_out').length,failed:samples.filter(r=>r.status==='failed').length,
   compileMs:describe(ok.map(r=>r.timing.compileMs)),routingMs:describe(ok.map(r=>r.timing.routingMs)),labelMs:describe(ok.map(r=>r.timing.labelMs)),totalMs:describe(ok.map(r=>r.timing.totalMs)),
   repeatedCompletedGeometry:successful.length,allCompletedExact:exact,allCompletedWithin1px:equal,allSixCompleted:successful.length===6,
   reports:successful.flatMap(r=>(r.reports??[]).map(s=>({iterations:s.iterations,termination:s.termination,milliseconds:s.milliseconds}))) });
 }
 write('timing',{method:'Twelve predeclared family-stratified cases. One warmup and five measured repetitions per engine/case. Route cache disabled; one worker; full source compile/router/production labels. Successful-sample quantiles are conditional; every timeout remains visible and lower-bounded by15s. Cloud timings do not establish desktop200ms responsiveness.',planned:720,measuredSamples:600,warmups:120,cases:details,
  byEngine:engines.map(engine=>{const a=details.filter(d=>d.engine===engine),rs=[...data.values()].filter(r=>r.settings.engine===engine&&byTask.get(r.id).repeat>0),ok=rs.filter(r=>r.status==='ok');return {engine,cases:a.length,plannedSamples:rs.length,completedSamples:ok.length,timeouts:rs.filter(r=>r.status==='timed_out').length,failed:rs.filter(r=>r.status==='failed').length,completeFiveSampleCases:a.filter(r=>r.successful===5).length,compileMs:describe(ok.map(r=>r.timing.compileMs)),routingMs:describe(ok.map(r=>r.timing.routingMs)),totalMs:describe(ok.map(r=>r.timing.totalMs)),equalCaseMedianTotalMs:describe(a.map(r=>r.totalMs.median))};})});
 write('determinism',{plannedCaseEngineGroups:120,allSixComplete:details.filter(d=>d.allSixCompleted).length,exactAllCompleted:details.filter(d=>d.allCompletedExact).length,onePixelAllCompleted:details.filter(d=>d.allCompletedWithin1px).length,notFullyObserved:details.filter(d=>!d.allSixCompleted).map(d=>({caseId:d.caseId,engine:d.engine,completed:d.repeatedCompletedGeometry})),disagreements:details.filter(d=>d.allCompletedWithin1px===false).map(d=>({caseId:d.caseId,engine:d.engine})),method:'Geometry only, excluding timing/report clocks; every completed warmup/repetition checked; failed repetitions are unavailable rather than assumed deterministic.'});
}

if(complete('sanity')){
 const data=[...read('sanity').values()];write('sanity',{planned:20,rows:data.map(r=>({id:r.id,status:r.status,hardValid:r.metrics?.hardValid,engineCalls:r.engineCalls,diagnostics:r.diagnostics,hard:r.hard})),note:'An empty/single source can legitimately short-circuit an engine call; task execution is not mislabeled as an algorithm invocation.'});
}
console.log(JSON.stringify({output:directory,completedStages:['screen-development','identity-development','timing-development','sanity'].filter(complete)}));
