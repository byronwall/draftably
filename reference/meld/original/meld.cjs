#!/usr/bin/env node
/* Headless entry point, Node built-ins only. */
'use strict';
const fs=require('node:fs');
const M=require('./src/meld-core.js');
const args=process.argv.slice(2);
function usage(){console.error('Usage: node meld.cjs FILE.meld [--view VIEW] [--check | --snapshot | --verify]');}
if(!args.length||args.includes('--help')){usage();process.exit(args.length?0:2);}
const file=args.shift();let view;let action='scene';
try{
  while(args.length){const a=args.shift();if(a==='--view'){view=args.shift();if(!view)throw new Error('--view needs an identifier.');}else if(['--check','--snapshot','--verify'].includes(a)){action=a.slice(2);}else throw new Error('Unknown option '+a);}
  const source=fs.readFileSync(file,'utf8'),model=M.parse(source);
  if(view&&!model.views.some(v=>v.id===view))throw new Error('Unknown view '+view);
  const scene=M.layout(model,view);
  if(action==='scene')console.log(JSON.stringify(scene,null,2));
  else if(action==='snapshot')console.log(M.snapshotText(scene));
  else if(action==='check'){console.log(JSON.stringify({valid:true,view:scene.view.id,inputKey:scene.inputKey,geometryKey:scene.geometryKey,diagnostics:scene.diagnostics},null,2));if(scene.diagnostics.some(d=>d.level==='error'))process.exitCode=1;}
  else if(action==='verify'){const expected=M.geometry(scene);for(let i=0;i<20;i++)if(M.geometry(M.compile(source,scene.view.id))!==expected)throw new Error('Geometry mismatch at independent compile '+(i+1));console.log(JSON.stringify({identical:true,runs:20,view:scene.view.id,geometryKey:scene.geometryKey,method:'Exact canonical geometry comparison'},null,2));}
}catch(e){console.error(e.name+': '+e.message);process.exitCode=1;}
