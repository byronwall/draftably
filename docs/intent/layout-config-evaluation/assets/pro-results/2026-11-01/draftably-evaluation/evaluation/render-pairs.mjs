/** Production renderer and unchanged repository screenshot tool; identities blinded on cards. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createAdapter,bundleRoot,baselineRoot } from './adapter.mjs';
const specPath=process.argv[2];
if(!specPath)throw Error('Usage: node evaluation/render-pairs.mjs data/visual-pairs-SPLIT.json');
const specs=JSON.parse(fs.readFileSync(path.resolve(bundleRoot,specPath),'utf8'));
const adapter=await createAdapter();
const rows=fs.readdirSync(path.join(bundleRoot,'data')).filter(n=>n.endsWith('.jsonl')).flatMap(n=>fs.readFileSync(path.join(bundleRoot,'data',n),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)));
// The first terminal attempt is canonical throughout this evaluation.
const byId=new Map();for(const row of rows)if(row.id&&!byId.has(row.id))byId.set(row.id,row);
const publicManifest=[],key=[];
for(const p of specs){
 const shuffled=parseInt(crypto.createHash('sha256').update('blind-20261101-'+p.id).digest('hex').slice(0,8),16)%2;
 const selected=shuffled?[p.b,p.a]:[p.a,p.b];
 const files=[];
 for(const [i,id]of selected.entries()){
  const row=byId.get(id);if(!row?.geometry)throw Error('No completed geometry for '+id);
  const artifact=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(bundleRoot,row.geometry))));
  const {vg,rects}=adapter.projection.visibleRects(artifact.doc);
  const target=`renders/blinded/${p.id}-${i?'B':'A'}.svg`;
  fs.mkdirSync(path.dirname(path.join(bundleRoot,target)),{recursive:true});
  fs.writeFileSync(path.join(bundleRoot,target),adapter.render({doc:artifact.doc,result:artifact.rawRouting,vg,rects}));
  files.push(target);
 }
 const png=`renders/blinded/${p.id}.png`;
 execFileSync(process.execPath,[path.join(baselineRoot,'scripts/shoot.mjs'),'--sheet',path.join(bundleRoot,png),'--cols','2','--size','1800x1000',...files.map((f,i)=>`${p.id} ${i?'B':'A'}::${path.join(bundleRoot,f)}`)],{env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH??'/tmp/draftably-evaluation-browsers'},stdio:'pipe'});
 publicManifest.push({id:p.id,split:p.split,family:p.family,task:p.task,png,svgA:files[0],svgB:files[1],renderPath:'production SVG; shipped fonts, labels and routing, repository shoot.mjs'});
 key.push({id:p.id,A:selected[0],B:selected[1],selectionReason:p.reason});
 console.log(JSON.stringify({rendered:p.id,png}));
}
await adapter.close();
const suffix=path.basename(specPath,'.json').replace('visual-pairs-','');
fs.writeFileSync(path.join(bundleRoot,`data/visual-manifest-${suffix}.json`),JSON.stringify(publicManifest,null,2));
fs.writeFileSync(path.join(bundleRoot,`data/visual-key-${suffix}.json`),JSON.stringify(key,null,2));
