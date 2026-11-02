#!/usr/bin/env node
/** Read-only integrity check. Imports metric serialization, never a layout/router engine. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { geometrySignature } from './metrics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let text='';
for await (const chunk of process.stdin) text+=chunk;
const rows=JSON.parse(text), mismatches=[];
for(const row of rows){
  try{
    const artifact=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(root,row.geometry))));
    const observed=crypto.createHash('sha256').update(geometrySignature(artifact.doc,artifact.routes)).digest('hex');
    if(observed!==row.geometryHash)mismatches.push({id:row.id,expected:row.geometryHash,observed,path:row.geometry});
  }catch(error){mismatches.push({id:row.id,error:String(error),path:row.geometry});}
}
console.log(JSON.stringify({verified:rows.length-mismatches.length,checked:rows.length,mismatches,
  verification:'Canonical geometrySignature hash: node/group boxes, selected sides and route point sequences.',
  excludes:'SVG path/halo strings and other archive content are not covered by the trial geometry hash. This is not whole-archive byte identity.'}));
