'use strict';
const M=require('../src/meld-core.js'),fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const results=[];
for(const count of [25,50,100]){
 let source='diagram "Synthetic grouped chain"\nlayout root row gap=60\nview explore "Explore" width=1400 height=900\n';
 for(let g=0;g<Math.ceil(count/10);g++)source+=`group g${g} "Group ${g}"\nlayout g${g} grid columns=2 gap=40\n`;
 for(let i=0;i<count;i++){source+=`node n${i} "Node ${i}" in=g${Math.floor(i/10)}\n`;if(i)source+=`edge e${i} n${i-1} -> n${i}\n`;}
 const times=[];let scene;for(let i=0;i<6;i++){const t=performance.now();scene=M.compile(source);if(i)times.push(performance.now()-t);}times.sort((a,b)=>a-b);
 results.push({nodes:count,groups:Math.ceil(count/10),edges:count-1,layout:'10 nodes per group, grid=2, root=row, chain edges',warmMedianMs:+times[2].toFixed(2),maxMs:+times.at(-1).toFixed(2),runs:5,warnings:scene.diagnostics.length,fitScale:scene.fit.scale,geometryKey:scene.geometryKey});
}
const report={runtime:process.version,platform:process.platform,engine:M.VERSION,note:'Synthetic measurements of the original prototype only. No competitor benchmark. Parsing, layout and routing included; DOM paint excluded.',results};
fs.writeFileSync(path.join(__dirname,'stress-results.json'),JSON.stringify(report,null,2));console.log(report);
