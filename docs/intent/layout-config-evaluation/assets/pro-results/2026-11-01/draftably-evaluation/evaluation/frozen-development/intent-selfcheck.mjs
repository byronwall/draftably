/** Hand-calculated metric fixtures; no compiler/layout/router executions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkIntent } from './intent.mjs';

const node=(id,parent='root')=>({id,type:'node',label:id,parent,shape:'box'});
const group=(id,parent='root')=>({id,type:'group',label:id,parent,shape:'box'});
const edge=(id,source,target)=>({id,source,target,label:'',from:'auto',to:'auto'});
const model=(objects,edges=[],hints=[],layouts=[])=>({objects,edges,hints,layouts,phases:[]});
function doc(m,geometry){return {graph:{nodes:m.objects.filter(x=>x.type==='node').map(x=>({id:x.id,title:x.label,...(x.parent==='root'?{}:{parentId:x.parent})})),groups:m.objects.filter(x=>x.type==='group').map(x=>({id:x.id,title:x.label,...(x.parent==='root'?{}:{parentId:x.parent})})),edges:m.edges.map(x=>({id:x.id,from:x.source,to:x.target,label:x.label,directed:x.directed!==false}))},layout:{nodes:geometry,edges:Object.fromEntries(m.edges.map(e=>[e.id,{}])),containers:{}}};}
const box=(x,y,w=100,h=40)=>({x,y,w,h});
const results=[];
function test(name,fn){fn();results.push({name,passed:true});}

test('required near accepts a larger gap and ignores soft cross-axis offset',()=>{
 const m=model([node('a'),node('b')],[],[{type:'near',id:'b',ref:'a',side:'right',gap:20,offset:0,strength:'required'}]);
 const d=doc(m,{a:box(0,0),b:box(180,90)});assert.deepEqual(checkIntent(m,d).failures,[]);
 d.layout.nodes.b.x=110;assert(checkIntent(m,d).failures.some(x=>x.startsWith('required-near:')));
});
test('cross-group near constrains sibling group boundary',()=>{
 const m=model([group('g'),node('inside','g'),node('outside')],[],[{type:'near',id:'outside',ref:'inside',side:'right',gap:20,strength:'required'}]);
 const d=doc(m,{g:box(0,0,300,200),inside:box(24,48),outside:box(320,300)});assert.deepEqual(checkIntent(m,d).failures,[]);
 d.layout.nodes.outside.x=200;assert(checkIntent(m,d).failures.some(x=>x.startsWith('required-near:')));
});
test('required alignment uses centers and permits half-pixel rounding',()=>{
 const m=model([node('a'),node('b')],[],[{type:'align',axis:'x',ids:['a','b'],strength:'required'}]);
 const d=doc(m,{a:box(0,0,100),b:box(0,100,101)});assert.deepEqual(checkIntent(m,d).failures,[]);
 d.layout.nodes.b.x=10;assert(checkIntent(m,d).failures.some(x=>x.startsWith('required-align:')));
});
test('identity detects missing objects and changed endpoints',()=>{
 const m=model([node('a'),node('b')],[edge('e','a','b')]);
 const d=doc(m,{a:box(0,0),b:box(200,0)});d.graph.nodes.pop();d.graph.edges[0].to='a';
 const f=checkIntent(m,d).failures;assert(f.some(x=>x.startsWith('missing-source-object:')));assert(f.some(x=>x.startsWith('edge-endpoints:')));
});
test('diamond explicit size preserves square maximum',()=>{
 const m=model([{...node('a'),shape:'diamond'}],[],[{type:'size',id:'a',width:100,height:80}]);
 const d=doc(m,{a:box(0,0,100,100)});assert.deepEqual(checkIntent(m,d).failures,[]);d.layout.nodes.a.h=80;assert(checkIntent(m,d).failures.some(x=>x.startsWith('explicit-size:')));
});
test('sequence checks participant row/order and message time order',()=>{
 const m=model([node('a'),node('b')],[edge('e1','a','b'),edge('e2','b','a')],[],[{scope:'root',algorithm:'sequence'}]);
 const d=doc(m,{a:box(0,0),b:box(200,0)});d.layout.sequence={panel:box(0,0,400,300),phases:[]};d.layout.edges.e1.row=100;d.layout.edges.e2.row=150;
 assert.deepEqual(checkIntent(m,d).failures,[]);d.layout.nodes.b.y=30;d.layout.edges.e2.row=90;
 const f=checkIntent(m,d).failures;assert(f.some(x=>x.startsWith('sequence-header-row:')));assert(f.some(x=>x.startsWith('sequence-message-order:')));
});
test('ordinary cells must touch and retain row boundaries',()=>{
 const m=model([group('g'),node('a','g'),node('b','g'),node('c','g'),node('d','g')],[],[],[{scope:'g',algorithm:'cells',columns:2,direction:'right'}]);
 const d=doc(m,{g:box(0,0,200,120),a:box(0,40),b:box(100,40),c:box(0,80),d:box(100,80)});d.layout.containers.g={cellsBand:40};
 assert.deepEqual(checkIntent(m,d).failures,[]);d.layout.nodes.b.x=110;assert(checkIntent(m,d).failures.some(x=>x.startsWith('cells-adjacency:')));
});
test('same-source cell reference permits whole group translation only',()=>{
 const m=model([group('g'),node('a','g'),node('b','g')],[],[],[{scope:'g',algorithm:'cells',direction:'right'}]);
 const reference=doc(m,{g:box(0,0,200,80),a:box(0,40),b:box(100,40)});reference.layout.containers.g={cellsBand:40};
 const d=structuredClone(reference);for(const r of Object.values(d.layout.nodes)){r.x+=200;r.y+=80;}
 assert.deepEqual(checkIntent(m,d,{referenceDoc:reference}).failures,[]);d.layout.nodes.b.y+=10;assert(checkIntent(m,d,{referenceDoc:reference}).failures.some(x=>x.startsWith('cells-relative-geometry:')));
});
test('bit cells encode main spans and ruler offsets',()=>{
 const m=model([group('g'),{...node('a','g'),span:4},{...node('b','g'),span:4}],[],[],[{scope:'g',algorithm:'cells',unit:'bit',columns:8,unitWidth:24}]);
 const d=doc(m,{g:box(0,0,192,100),a:box(0,60,96),b:box(96,60,96)});d.layout.containers.g={cellsBand:40,cellsChrome:{ruler:{h:20}}};
 assert.deepEqual(checkIntent(m,d).failures,[]);d.layout.nodes.b.w=90;assert(checkIntent(m,d).failures.some(x=>x.startsWith('unit-cells:')));
});
test('lane bands share span and preserve source order',()=>{
 const m=model([group('g1'),group('g2'),node('a','g1'),node('b','g2')],[],[],[{scope:'root',algorithm:'lanes',direction:'right'}]);
 const d=doc(m,{g1:box(0,0,400,100),g2:box(0,100,400,100),a:box(24,48),b:box(24,148)});
 assert.deepEqual(checkIntent(m,d).failures,[]);d.layout.nodes.g2.y=140;assert(checkIntent(m,d).failures.some(x=>x.startsWith('lane-order:')));
});

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.mkdirSync(path.join(root,'data/calibration'),{recursive:true});
fs.writeFileSync(path.join(root,'data/calibration/intent-selfcheck.json'),JSON.stringify({at:new Date().toISOString(),type:'Hand-calculated intent metric calibration; zero geometry executions',checks:results.length,passed:results.length,results},null,2)+'\n');
console.log(JSON.stringify({checks:results.length,passed:results.length,geometryExecutions:0}));
