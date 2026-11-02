/** Read saved geometry and verify signatures; no layout, compiler or router calls. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {geometrySignature} from './frozen-development/metrics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const canonical=new Map(),taskIds=new Set(),verified=[],missing=[],malformed=[],mismatches=[];
for(const name of fs.readdirSync(path.join(root,'evaluation/tasks')).filter(n=>n.endsWith('.json')).sort()){
  for(const t of JSON.parse(fs.readFileSync(path.join(root,'evaluation/tasks',name),'utf8')))taskIds.add(t.id);
  const file=path.join(root,'data',name.replace(/\.json$/,'.jsonl'));
  if(!fs.existsSync(file))continue;
  for(const line of fs.readFileSync(file,'utf8').split('\n').filter(Boolean)){
    const row=JSON.parse(line);if(!canonical.has(row.id))canonical.set(row.id,row);
  }
}
for(const row of canonical.values()){
  if(row.status!=='ok')continue;
  if(!row.geometry||!fs.existsSync(path.join(root,row.geometry))){missing.push({id:row.id,path:row.geometry??null});continue;}
  try{
    const artifact=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,row.geometry))));
    const actual=sha(geometrySignature(artifact.doc,artifact.routes));
    if(actual!==row.geometryHash)mismatches.push({id:row.id,expected:row.geometryHash,actual});
    else verified.push({id:row.id,split:row.split});
  }catch(error){malformed.push({id:row.id,error:String(error)});}
}
const extra=[];
const expected=new Set([...canonical.values()].filter(r=>r.status==='ok').map(r=>r.geometry));
const geometryDir=path.join(root,'data/geometry');
for(const name of fs.readdirSync(geometryDir).filter(n=>n.endsWith('.json.gz')).sort()){
  const relative='data/geometry/'+name;
  if(expected.has(relative))continue;
  const id=name.replace(/\.json\.gz$/,'');
  extra.push({path:relative,id,registered:taskIds.has(id),canonicalStatus:canonical.get(id)?.status??null});
}
const report={at:new Date().toISOString(),productionCalls:0,layoutCalls:0,routerCalls:0,
  signatureSource:'evaluation/frozen-development/metrics.mjs',
  signatureScope:'Node/group boxes, chosen port sides and route polylines. Not a hash of whole archive bytes, SVG paint, labels, halos or raw source input.',
  canonicalSuccessful:[...canonical.values()].filter(r=>r.status==='ok').length,
  verified:verified.length,bySplit:Object.fromEntries(['development','heldout'].map(s=>[s,verified.filter(r=>r.split===s).length])),
  missing,malformed,mismatches,extraSavedGeometry:extra,totalGeometryFiles:expected.size+extra.length};
fs.writeFileSync(path.join(root,'data/analysis/final-geometry-integrity.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
