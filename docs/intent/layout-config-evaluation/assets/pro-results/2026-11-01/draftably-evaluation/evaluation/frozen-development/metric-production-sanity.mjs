#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createAdapter,baselineRoot,bundleRoot } from './adapter.mjs';
import { measure } from './metrics.mjs';
const adapter=await createAdapter();
const files=['examples/web-app-components.draft','examples/login-sequence.draft','examples/tcp-header.draft','examples/order-pipeline.draft'];
const rows=[];
try {
 for(const file of files){
  const output=await adapter.source(fs.readFileSync(path.join(baselineRoot,file),'utf8'));
  const metrics=measure(output.doc,output.result,{input:output.input,drawnRoutes:output.drawnRoutes,rects:output.rects,expectedEdges:output.vg.edges.map(e=>e.id)});
  rows.push({file,compileMs:output.compileMs,routingMs:output.routingMs,metrics});
  console.log(JSON.stringify({file,hard:metrics.hard,labels:metrics.labelCount,edges:metrics.edges,throughNodes:metrics.throughNodes}));
 }
 fs.writeFileSync(path.join(bundleRoot,'data/calibration/production-sanity.json'),JSON.stringify({recordedAt:new Date().toISOString(),purpose:'Calibration on unmodified shipped examples, no algorithm comparison or tuning',rows},null,2));
}finally{await adapter.close();}
