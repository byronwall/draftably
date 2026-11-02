import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../baseline/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = path.resolve(root, '../baseline');
const server = await createServer({root: baseline, configFile: false, server: {middlewareMode: true, hmr: false}, optimizeDeps: {noDiscovery: true, include: []}, appType: 'custom', logLevel: 'error'});
try {
  const { parseModel } = await server.ssrLoadModule('/src/dsl/syntax.ts');
  const routing = process.argv.includes('--routing');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, routing ? 'corpus/routing/manifest.json' : 'corpus/manifest.json')));
  const inputs = routing
    ? manifest.fixtures.flatMap(c => [{id:c.id,path:c.path},{id:c.id+'/automatic',path:c.automaticPath},...c.explicitVariants.map(e=>({id:c.id+'/'+e.id,path:e.path}))])
    : manifest.cases.flatMap(c => [{id:c.id,path:c.path},...c.edits.map(e=>({id:c.id+'/'+e.id,path:e.path}))]).concat(manifest.extras);
  const results = inputs.map(x => {
    try {
      const m = parseModel(fs.readFileSync(path.join(root, x.path),'utf8'));
      return {id:x.id,path:x.path,ok:true,nodes:m.objects.filter(x=>x.type==='node').length,groups:m.objects.filter(x=>x.type==='group').length,edges:m.edges.length,warnings:m.warnings};
    } catch(error) {return {id:x.id,path:x.path,ok:false,error:String(error)};}
  });
  fs.writeFileSync(path.join(root,routing ? 'corpus/routing/syntax-validation.json' : 'corpus/syntax-validation.json'),JSON.stringify({type:'Shipped parseModel validation; zero geometry trials.',at:new Date().toISOString(),results},null,2)+'\n');
  console.log(JSON.stringify({inputs:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok)}));
  if(results.some(x=>!x.ok))process.exitCode=1;
} finally {await server.close();}
