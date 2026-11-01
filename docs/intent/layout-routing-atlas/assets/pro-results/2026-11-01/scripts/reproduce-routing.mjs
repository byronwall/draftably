#!/usr/bin/env node
/** Reproduce the 36 flat, frozen routing probes using the exact reviewed engine.
 * This deliberately narrow reader is NOT a replacement .draft compiler.
 * Actual CLI compilation/SVG evidence is supplied separately and can be compared.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const BASELINE = 'af70d8317797d5a522acffdd604819376a3ec893';
const ROUTER_SHA256 = 'feee4a0ce946d8b2961b86219bc4e72dc333a04173b913c1908fab24376456d9';
const here = path.dirname(fileURLToPath(import.meta.url));
const usage = `Usage: node reproduce-routing.mjs --repo CHECKOUT --fixtures DIR --output FILE [--verify-cli-results FILE]\n\n--repo                 Exact reviewed Draftably checkout (required).\n--fixtures             Directory containing the36 numeric .draft companions.\n                       Defaults to routing-fixtures beside this script.\n--output               JSON report path (required; parent directories created).\n--verify-cli-results   Optional actual CLI results.json; assert source hashes,\n                       rectangles and route points match all36 files.\n\nNo dependencies are required beyond Node and the reviewed router source.\nThis script handles only these known flat pinned fixtures, never arbitrary DSL.\nReported milliseconds are diagnostic observations, not a benchmark.\n`;
function options(argv) {
 const out={};
 for(let i=0;i<argv.length;i++) {
  const k=argv[i];if(k==='--help'||k==='-h'){process.stdout.write(usage);process.exit(0);}
  if(!['--repo','--fixtures','--output','--verify-cli-results'].includes(k))throw Error(`Unknown argument: ${k}`);
  if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error(`Missing value for ${k}`);
  if(k in out)throw Error(`Duplicate argument: ${k}`);out[k]=path.resolve(argv[++i]);
 }
 if(!out['--repo']||!out['--output'])throw Error('--repo and --output are required.');
 out['--fixtures']??=path.join(here,'routing-fixtures');return out;
}
const keys={clearance:'clearance',standoff:'standoff','port-gap':'portGap','edge-gap':'edgeGap','bend-penalty':'bendPenalty','crossing-penalty':'crossingPenalty','shared-penalty':'sharedPenalty','parallel-penalty':'parallelPenalty','port-stability':'portStability','fanout-penalty':'fanoutPenalty',passes:'passes','corner-radius':'cornerRadius'};
const values={clearance:[4,10,30],standoff:[0,20,40],'port-gap':[6,16,28],'edge-gap':[4,16,48],'bend-penalty':[0,32,100],'crossing-penalty':[0,360,1200],'shared-penalty':[0,8,20],'parallel-penalty':[0,18,60],'port-stability':[0,20,150],'fanout-penalty':[0,50,160],passes:[1,3,5],'corner-radius':[0,6,16]};
const hash=x=>createHash('sha256').update(x).digest('hex');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
function parse(text,file) {
 const nodes=new Map(),edges=[],settings={};let diagram=false,row=false,routing=false;
 for(const [index,raw]of text.split(/\r?\n/).entries()) {
  const line=raw.trim();if(!line||line.startsWith('#'))continue;
  let m;
  const fail=()=>{throw Error(`${file}:${index+1}: Outside this probe's supported flat fixture grammar: ${line}`);};
  if(/^diagram "[^"]*" version=1$/.test(line)){assert(!diagram,`${file}: duplicate diagram`);diagram=true;continue;}
  if(line==='layout root row'){assert(!row,`${file}: duplicate row`);row=true;continue;}
  if(line==='theme drafting padding-y=4')continue;
  if((m=/^node (\w+) "[^"]*"$/.exec(line))){assert(!nodes.has(m[1]),`${file}: duplicate node`);nodes.set(m[1],{id:m[1],shape:'box'});continue;}
  if((m=/^size (\w+) width=([\d.]+) height=([\d.]+)$/.exec(line))){assert(nodes.has(m[1]),`${file}: unknown sized node`);Object.assign(nodes.get(m[1]),{w:Number(m[2]),h:Number(m[3])});continue;}
  if((m=/^pin (\w+) x=([\d.]+) y=([\d.]+)$/.exec(line))){assert(nodes.has(m[1]),`${file}: unknown pinned node`);Object.assign(nodes.get(m[1]),{x:Number(m[2]),y:Number(m[3])});continue;}
  if((m=/^edge (\w+) (\w+) -> (\w+)(.*)$/.exec(line))){
   const cfg={};for(const token of m[4].trim().split(/\s+/).filter(Boolean)){
    const attr=/^(from|to)=(auto|left|right|top|bottom)$/.exec(token);if(!attr)fail();
    if(attr[2]!=='auto')cfg[attr[1]+'Side']=attr[2];
   }
   assert(!edges.some(e=>e.id===m[1]),`${file}: duplicate edge`);edges.push({id:m[1],from:m[2],to:m[3],cfg});continue;
  }
  if(line.startsWith('routing ')){
   assert(!routing,`${file}: duplicate routing statement`);routing=true;
   for(const token of line.slice(8).split(/\s+/)){
    const [k,v,...rest]=token.split('=');assert(k in keys&&!rest.length&&v!==undefined&&Number.isFinite(Number(v)),`${file}: invalid routing attribute ${token}`);settings[keys[k]]=Number(v);
   }
   continue;
  }
  fail();
 }
 assert(diagram&&row,`${file}: requires diagram and constant layout root row`);
 for(const n of nodes.values())assert(['x','y','w','h'].every(k=>Number.isFinite(n[k]))&&n.w>0&&n.h>0,`${file}: node ${n.id} lacks a finite pinned rectangle`);
 for(const e of edges)assert(nodes.has(e.from)&&nodes.has(e.to),`${file}: missing endpoint`);
 return {input:{nodes:[...nodes.values()],groups:[],edges},settings};
}
const canonicalRoutes=routes=>routes.map(r=>({id:r.id,points:r.points})).sort((a,b)=>a.id.localeCompare(b.id));
const canonicalNodes=nodes=>nodes.map(n=>({id:n.id,x:n.x,y:n.y,w:n.w,h:n.h})).sort((a,b)=>a.id.localeCompare(b.id));
try {
 const opts=options(process.argv.slice(2));
 const routerFile=path.join(opts['--repo'],'src','engines','routing-engine.js');
 const routerHash=hash(await fs.readFile(routerFile));
 assert(routerHash===ROUTER_SHA256,`Router source differs from reviewed baseline ${BASELINE}. Expected ${ROUTER_SHA256}, got ${routerHash}.`);
 const {RouteLab}=await import(pathToFileURL(routerFile).href);
 let cli;
 if(opts['--verify-cli-results']){
  const ledger=JSON.parse(await fs.readFile(opts['--verify-cli-results'],'utf8'));assert(ledger.baseline===BASELINE,'CLI ledger baseline differs.');cli=new Map(ledger.rows.map(r=>[r.file,r]));
 }
 const rows=[];
 for(const [key,sweep]of Object.entries(values))for(const value of sweep){
  const file=`${key}-${value}.draft`,source=await fs.readFile(path.join(opts['--fixtures'],file),'utf8');
  const {input,settings}=parse(source,file);assert(settings[keys[key]]===value,`${file}: primary value does not match filename.`);
  const before=JSON.stringify(input),result=RouteLab.compute(input,settings);
  assert(before===JSON.stringify(input),`${file}: engine mutated its input.`);
  const row={file,source_sha256:hash(source),settings,geometryUnchanged:true,report:result.report,routes:result.routes};
  if(cli){
   const prior=cli.get(file);assert(prior,`${file}: missing from CLI ledger.`);
   row.cli_source_hash_match=prior.source_sha256===row.source_sha256;
   row.cli_rectangles_match=JSON.stringify(canonicalNodes(prior.geometry.nodes))===JSON.stringify(canonicalNodes(input.nodes));
   row.cli_route_points_match=JSON.stringify(canonicalRoutes(prior.geometry.routes))===JSON.stringify(canonicalRoutes(result.routes));
   assert(row.cli_source_hash_match&&row.cli_rectangles_match&&row.cli_route_points_match,`${file}: does not match actual CLI evidence.`);
  }
  rows.push(row);
 }
 const result={baseline:BASELINE,router_source_sha256:routerHash,fixture_count:rows.length,scope:'36 known flat pinned numeric companions; raw RouteLab reproduction, not a DSL compiler or SVG renderer',cli_evidence_verified:Boolean(cli),rows};
 await fs.mkdir(path.dirname(opts['--output']),{recursive:true});await fs.writeFile(opts['--output'],JSON.stringify(result,null,2)+'\n');
 process.stdout.write(JSON.stringify({baseline:BASELINE,fixtures:rows.length,geometry_unchanged:rows.every(r=>r.geometryUnchanged),cli_matches:cli?rows.filter(r=>r.cli_route_points_match).length:null,output:opts['--output']})+'\n');
} catch(error){process.stderr.write(`${error.message}\n\n${usage}`);process.exitCode=1;}
