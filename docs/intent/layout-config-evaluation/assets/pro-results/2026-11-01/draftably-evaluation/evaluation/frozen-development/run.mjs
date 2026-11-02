/** Persistent worker batches; resume skips completed trial IDs, including failures/timeouts. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { bundleRoot } from './adapter.mjs';

const taskFile=process.argv[2];
if(!taskFile)throw Error('Usage: node evaluation/run.mjs evaluation/tasks/NAME.json [workers=2]');
const tasks=JSON.parse(fs.readFileSync(path.resolve(bundleRoot,taskFile),'utf8'));
const workers=Math.max(1,Math.min(4,Number(process.argv[3]??2)));
const runId=path.basename(taskFile,'.json');
const protocolPath=path.resolve(bundleRoot,'data/protocol-freeze.json');
const protocol=JSON.parse(fs.readFileSync(protocolPath,'utf8'));
const assignmentStart=new Date(protocol.assignmentStarted).getTime();
const taskDir=path.resolve(bundleRoot,'evaluation/tasks');
const reserved=new Set(fs.readdirSync(taskDir).filter(n=>n.endsWith('.json')).flatMap(n=>JSON.parse(fs.readFileSync(path.join(taskDir,n),'utf8')).map(t=>t.id)));
if(reserved.size>11500)throw Error(`Assignment reservation ${reserved.size} exceeds 11500 plus 500 ancillary-run allowance`);
let policySha256=null;
if(tasks.some(t=>t.split==='heldout')){
 const file=path.resolve(bundleRoot,'data/policy-freeze.json');
 if(!fs.existsSync(file))throw Error('Heldout tasks blocked until the policy is sealed.');
 const bytes=fs.readFileSync(file),frozen=JSON.parse(bytes),proposal=frozen.proposal??frozen;
 const corpusHash=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(bundleRoot,'corpus/manifest.json'))).digest('hex');
 const metricHash=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(bundleRoot,'evaluation/metrics.mjs'))).digest('hex');
 if(frozen.frozen!==true||proposal.splitSha256!==corpusHash||proposal.baseline!==protocol.baseline||metricHash!==protocol.metricSha256)
  throw Error('Heldout guard: policy must be explicitly frozen and match immutable corpus, baseline and metric hashes.');
 policySha256=crypto.createHash('sha256').update(bytes).digest('hex');
}
const resultsPath=path.resolve(bundleRoot,`data/${runId}.jsonl`);
fs.mkdirSync(path.dirname(resultsPath),{recursive:true});
const prior=fs.existsSync(resultsPath)?fs.readFileSync(resultsPath,'utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s)):[];
const done=new Set(prior.map(r=>r.id));
const remaining=tasks.filter(t=>!done.has(t.id));
const start=Date.now();
const manifestPath=path.resolve(bundleRoot,`data/logs/${runId}-run.json`);
fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
const status={runId,started:new Date(start).toISOString(),node:process.version,platform:process.platform,workers,
  policySha256,
  planned:tasks.length,priorCompleted:prior.length,executed:0,failed:0,timedOut:0,skipped:0,
  taskSha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(bundleRoot,taskFile))).digest('hex')};
const log=event=>console.log(JSON.stringify({at:new Date().toISOString(),runId,...event}));
const attemptsDir=path.resolve(bundleRoot,'data/attempts',runId);fs.mkdirSync(attemptsDir,{recursive:true});
log({event:'start',...status});
fs.writeFileSync(manifestPath,JSON.stringify(status,null,2));
let next=0,complete=0;
const persist=row=>{
 // Immutable per-attempt records protect results even if an append-only summary loses a write.
 const record=path.join(attemptsDir,(row.attemptStarted??new Date().toISOString()).replace(/[:.]/g,'-')+'-'+row.id+'-'+crypto.randomUUID()+'.json');
 fs.writeFileSync(record,JSON.stringify(row)+'\n',{flag:'wx'});
 fs.appendFileSync(resultsPath,JSON.stringify(row)+'\n');
 complete++;status.executed++;if(row.status==='failed')status.failed++;if(row.status==='timed_out')status.timedOut++;
 if(complete%20===0||row.status!=='ok')log({event:'progress',complete,total:remaining.length,last:row.id,status:row.status,elapsedSeconds:Math.round((Date.now()-start)/1000)});
 fs.writeFileSync(manifestPath,JSON.stringify({...status,last:row.id,elapsedSeconds:(Date.now()-start)/1000},null,2));
};

async function slot(index){
 let worker;
 async function create(){
  worker=new Worker(new URL('./trial-worker.mjs',import.meta.url),{type:'module'});
  await new Promise((resolve,reject)=>{worker.once('message',m=>m.ready?resolve():reject(Error('Unexpected init')));worker.once('error',reject);});
 }
 await create();
 while(next<remaining.length){
  const task=remaining[next++];
  const attemptStarted=new Date().toISOString();
  if(Date.now()-assignmentStart>5.5*60*60*1000){status.skipped++;fs.appendFileSync(path.resolve(bundleRoot,`data/logs/${runId}-unstarted.jsonl`),JSON.stringify({id:task.id,reason:'assignment wall-clock cutoff; reserved final 30 minutes for analysis and packaging'})+'\n');continue;}
  const row=await new Promise(resolve=>{
   const timer=setTimeout(()=>{worker.removeListener('message',onMessage);worker.removeListener('error',onError);resolve({id:task.id,stage:task.stage,caseId:task.caseId,family:task.family,split:task.split,kind:task.kind,status:'timed_out',settings:task.layout??task.options??task.routing,control:task.control,level:task.level,error:`Trial exceeded ${task.timeoutMs??90000} ms`,timing:{workerMs:task.timeoutMs??90000}});},task.timeoutMs??90000);
   const onMessage=m=>{clearTimeout(timer);worker.removeListener('error',onError);resolve(m.row);};
   const onError=e=>{clearTimeout(timer);worker.removeListener('message',onMessage);resolve({id:task.id,stage:task.stage,caseId:task.caseId,family:task.family,split:task.split,kind:task.kind,status:'failed',workerFailed:true,error:String(e.stack??e)});};
   worker.once('message',onMessage);worker.once('error',onError);worker.postMessage(task);
  });
  row.attemptStarted=attemptStarted;row.attemptFinished=new Date().toISOString();row.trialBudgetMs=task.timeoutMs??90000;
  if(row.status==='timed_out'){
   const rel=`data/layout-checkpoints/${task.id}.json.gz`,cp=path.resolve(bundleRoot,rel);
   if(fs.existsSync(cp)){const partial=JSON.parse(zlib.gunzipSync(fs.readFileSync(cp)));row.layoutCheckpoint=rel;row.engineCalls=partial.engineCalls;row.reports=partial.reports;row.timing={...row.timing,compileMs:partial.compileMs};row.timeoutPhase='after layout; routing or label placement';}
   else row.timeoutPhase='before layout checkpoint';
  }
  persist(row);
  if(row.status==='timed_out'||row.workerFailed){await worker.terminate();await create();}
 }
 await worker.terminate();
}
await Promise.all(Array.from({length:Math.min(workers,remaining.length)},(_,i)=>slot(i)));
status.finished=new Date().toISOString();status.elapsedSeconds=(Date.now()-start)/1000;
const terminal=new Set((fs.existsSync(resultsPath)?fs.readFileSync(resultsPath,'utf8'):'').split('\n').filter(Boolean).map(l=>JSON.parse(l).id));
for(const name of fs.readdirSync(attemptsDir).sort()){
 const row=JSON.parse(fs.readFileSync(path.join(attemptsDir,name),'utf8'));
 if(!terminal.has(row.id)){fs.appendFileSync(resultsPath,JSON.stringify(row)+'\n');terminal.add(row.id);log({event:'restored-terminal-record',id:row.id,record:path.join(attemptsDir,name)});}
}
status.persistedDistinct=terminal.size;
fs.writeFileSync(manifestPath,JSON.stringify(status,null,2));log({event:'complete',...status});
