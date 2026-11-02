/** Queue replayable batches in this process, without a subprocess per trial. */
import fs from 'node:fs';
import path from 'node:path';
import {bundleRoot} from './adapter.mjs';
const args=process.argv.slice(2);
const afterIndex=args.indexOf('--after');
const after=afterIndex>=0?args.splice(afterIndex,2)[1]:null;
const workersIndex=args.indexOf('--workers');
const workers=workersIndex>=0?args.splice(workersIndex,2)[1]:'2';
for(const prerequisite of after?after.split(','):[]){
 const tasks=JSON.parse(fs.readFileSync(path.join(bundleRoot,'evaluation/tasks',prerequisite+'.json')));
 const expected=new Set(tasks.map(t=>t.id));
 while(true){
  const file=path.join(bundleRoot,'data',prerequisite+'.jsonl');
  const done=new Set(fs.existsSync(file)?fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).id):[]);
  if([...expected].every(id=>done.has(id)))break;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 console.log(JSON.stringify({event:'prerequisite-complete',after:prerequisite,at:new Date().toISOString()}));
}
for(const name of args){
 process.argv=[process.argv[0],path.join(bundleRoot,'evaluation/run.mjs'),`evaluation/tasks/${name}.json`,workers];
 await import(new URL('./run.mjs?'+encodeURIComponent(name)+'-'+Date.now(),import.meta.url));
}
