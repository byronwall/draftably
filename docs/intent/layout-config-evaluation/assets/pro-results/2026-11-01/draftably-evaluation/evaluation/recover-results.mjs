/** Reconcile missing summary rows from existing complete artifacts, never rerun algorithms. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
import {bundleRoot} from './adapter.mjs';import {geometrySignature} from './metrics.mjs';
const [name,logName]=process.argv.slice(2);
if(!name||!logName)throw Error('Usage: recover-results.mjs RUN-NAME data/logs/console.log');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const tasks=JSON.parse(fs.readFileSync(path.join(bundleRoot,'evaluation/tasks',name+'.json')));
const file=path.join(bundleRoot,'data',name+'.jsonl');
const original=fs.readFileSync(file,'utf8');
const existing=new Map();for(const line of original.split('\n').filter(Boolean)){const r=JSON.parse(line);if(!existing.has(r.id))existing.set(r.id,r);}
const logs=fs.readFileSync(path.join(bundleRoot,logName),'utf8').split('\n').flatMap(line=>{try{return[JSON.parse(line)];}catch{return[];}}).filter(r=>r.runId===name);
if(!logs.some(r=>r.event==='complete'))throw Error('Refuse recovery before a logged batch completion.');
const missing=tasks.filter(t=>!existing.has(t.id));
const directory=path.join(bundleRoot,'data/recovery');fs.mkdirSync(directory,{recursive:true});
if(missing.length&&!fs.existsSync(path.join(directory,name+'-original.jsonl')))fs.writeFileSync(path.join(directory,name+'-original.jsonl'),original);
const recovered=[];
const attemptDir=path.join(bundleRoot,'data/attempts',name);
const attemptRecords=fs.existsSync(attemptDir)?fs.readdirSync(attemptDir).sort().map(n=>({path:path.join(attemptDir,n),row:JSON.parse(fs.readFileSync(path.join(attemptDir,n),'utf8'))})):[];
for(const task of missing){
 const immutable=attemptRecords.find(x=>x.row.id===task.id);
 if(immutable){
  const row={...immutable.row,restoredFromAttemptRecord:path.relative(bundleRoot,immutable.path)};
  fs.appendFileSync(file,JSON.stringify(row)+'\n');recovered.push({id:row.id,status:row.status,exactImmutableTerminalRecord:row.restoredFromAttemptRecord,unavailableFields:[]});continue;
 }
 const geometry=`data/geometry/${task.id}.json.gz`,checkpoint=`data/layout-checkpoints/${task.id}.json.gz`;
 const read=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(bundleRoot,p))));
 const cp=fs.existsSync(path.join(bundleRoot,checkpoint))?read(checkpoint):null;
 const proof=logs.find(r=>r.last===task.id&&r.status);
 let row={id:task.id,stage:task.stage,caseId:task.caseId,family:task.family,split:task.split,kind:task.kind,
  settings:task.layout??task.options??task.routing??{},control:task.control??null,level:task.level??null,tag:task.tag??null,
  policy:task.policy??null,editId:task.editId??null,editOperation:task.editOperation??null,
  trialBudgetMs:task.timeoutMs??90000,recoveredFromArtifact:true,recoveryAt:new Date().toISOString(),
  recoveryReason:'Batch console records completion but terminal JSONL summary omitted this ID. Existing geometry/checkpoint plus logged terminal status are used; no algorithm rerun.',
  timing:{compileMs:cp?.compileMs??null,routingMs:null,labelMs:null,totalMs:null,workerMs:null},engineCalls:cp?.engineCalls??null,reports:cp?.reports??[]};
 if(proof?.status==='timed_out'){
  Object.assign(row,{status:'timed_out',layoutCheckpoint:cp?checkpoint:null,error:`Trial exceeded ${task.timeoutMs??90000} ms`,timeoutPhase:cp?'after layout; routing or label placement':'before layout checkpoint',attemptFinished:proof.at});
  row.timing.workerMs=task.timeoutMs??90000;
 }else if(fs.existsSync(path.join(bundleRoot,geometry))){
  const a=read(geometry),{issues,hard,routeDetail,groupFill,groupPadding,...flat}=a.metrics;
  Object.assign(row,{status:'ok',metrics:flat,issueCounts:a.metrics.counts,hard,geometry,geometryHash:hash(geometrySignature(a.doc,a.routes)),geometryBin1pxHash:hash(geometrySignature(a.doc,a.routes,1)),routingSettings:a.doc.settings.routing,reports:a.reports,intent:a.intent,diagnostics:a.diagnostics,routingCacheHit:null,actualRouterCalls:null,inputHash:null});
 }else{
  Object.assign(row,{status:'failed',error:'Unrecoverable summary loss: no full geometry or logged terminal status. Counted as failed; not rerun.',layoutCheckpoint:cp?checkpoint:null});
 }
 fs.appendFileSync(file,JSON.stringify(row)+'\n');
 recovered.push({id:row.id,status:row.status,geometry:row.geometry??null,layoutCheckpoint:row.layoutCheckpoint??null,geometryHash:row.geometryHash??null,sourceProgress:proof??null});
}
const record={runId:name,at:new Date().toISOString(),originalSummarySha256:hash(original),loggedCompletion:logs.findLast(r=>r.event==='complete'),originalRows:existing.size,recoveredRows:recovered.length,recovered,unavailableFields:recovered.every(r=>r.exactImmutableTerminalRecord)?'None: exact immutable terminal records retained all fields.':'For artifact-only reconstruction, full wall/routing/label timings, original cache-hit status and exact attempt timestamps cannot be recovered. They remain null.',algorithmReruns:0};
if(missing.length)fs.writeFileSync(path.join(directory,name+'-recovery.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record));
