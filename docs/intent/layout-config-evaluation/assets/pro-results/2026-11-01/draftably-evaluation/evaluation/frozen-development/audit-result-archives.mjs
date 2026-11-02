/** Verify canonical result rows still match their replay artifacts. No engine/router calls. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { geometrySignature } from './metrics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),split=args.includes('--heldout')?'heldout':'development';
if(split==='heldout') {
  const fp=path.join(root,'data/policy-freeze.json');
  if(!fs.existsSync(fp)||!JSON.parse(fs.readFileSync(fp,'utf8')).frozen)throw new Error('Policy must be frozen before heldout archive access');
}
const stems=split==='development'?['screen-development','documented-default-development','selected-presets-development','tuning-development']:['screen-heldout','documented-default-heldout','selected-presets-heldout'];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const result={split,canonicalRule:'First terminal row per trial ID',productionCalls:0,stems:[],mismatches:[],missing:[]};
for(const stem of stems){
  const file=path.join(root,'data',stem+'.jsonl');if(!fs.existsSync(file))continue;
  const canonical=new Map();let attempts=0;
  for(const line of fs.readFileSync(file,'utf8').split('\n')){
    if(!line.trim())continue;const row=JSON.parse(line);if(row.split&&row.split!==split)throw new Error('Wrong split '+row.id);
    if(!['ok','failed','timed_out'].includes(row.status))continue;
    attempts++;if(!canonical.has(row.id))canonical.set(row.id,row);
  }
  let verified=0,completeRows=0;
  for(const row of canonical.values()){
    if(row.status!=='ok')continue;completeRows++;
    const artifact=path.resolve(root,row.geometry);
    if(!fs.existsSync(artifact)){result.missing.push({trial:row.id,artifact:row.geometry});continue;}
    const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(artifact)));
    const actual=hash(geometrySignature(data.doc,data.routes));
    if(actual!==row.geometryHash)result.mismatches.push({trial:row.id,expected:row.geometryHash,actual,artifact:row.geometry});
    else verified++;
  }
  result.stems.push({stem,attempts,canonical:canonical.size,duplicates:attempts-canonical.size,completeRows,verified});
}
const out=path.join(root,'data/analysis',split,'archive-hash-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({split,stems:result.stems,mismatches:result.mismatches.length,missing:result.missing.length,output:path.relative(root,out)}));
if(result.mismatches.length||result.missing.length)process.exitCode=2;
