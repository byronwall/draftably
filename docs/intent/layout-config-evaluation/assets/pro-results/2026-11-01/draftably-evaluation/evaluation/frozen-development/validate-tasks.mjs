import fs from 'node:fs';
import path from 'node:path';
import { createAdapter,bundleRoot } from './adapter.mjs';
import { sourceFor } from './source-tools.mjs';
const adapter=await createAdapter();
const errors=[];let checked=0;
for(const file of fs.readdirSync(path.join(bundleRoot,'evaluation/tasks')).filter(n=>n.endsWith('.json'))){
 for(const task of JSON.parse(fs.readFileSync(path.join(bundleRoot,'evaluation/tasks',file),'utf8'))){
  if(task.kind!=='source')continue;
  checked++;
  try{adapter.syntax.parseModel(sourceFor(task,adapter));}catch(error){errors.push({id:task.id,error:String(error)});}
 }
}
await adapter.close();
const result={checked,errors,geometryExecutions:0};
fs.writeFileSync(path.join(bundleRoot,'data/task-syntax-validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
