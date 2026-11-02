#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure,editMetrics,VERSION,WEIGHTS,EQUIVALENCE } from './metrics.mjs';
import { RouteLab } from '../../baseline/src/engines/routing-engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const records=[];
const node=(id,x,y,w=40,h=40,extra={})=>({id,title:id,x,y,w,h,...extra});
const edge=(id,from,to,cfg={})=>({id,from,to,directed:true,label:'',cfg});
const make=(nodes,edges=[],groups=[])=>({schemaVersion:2,id:'calibration',title:'calibration',graph:{nodes:nodes.map(({x,y,w,h,...n})=>n),groups:groups.map(({x,y,w,h,...n})=>n),edges:edges.map(({cfg,...e})=>e)},layout:{nodes:Object.fromEntries([...nodes,...groups].map(n=>[n.id,{x:n.x,y:n.y,w:n.w,h:n.h,...(n.pinned?{pinned:true}:{})}])),edges:Object.fromEntries(edges.map(e=>[e.id,e.cfg??{}])),labels:{},containers:{},intent:{}},styles:Object.fromEntries(nodes.map(n=>[n.id,{shape:n.shape??'box',color:'slate',icon:''}])),collapsed:[],settings:{direction:'RIGHT',routing:{...RouteLab.defaults}},camera:{x:0,y:0,k:1},appearance:{},theme:'light'});
const input=(nodes,edges=[],groups=[])=>({nodes:nodes.map(n=>({...n,shape:n.shape??'box'})),groups,edges});
const route=(e,points,fromSide='right',toSide='left')=>({...e,fromSide,toSide,fromOffset:0,toOffset:0,blocked:false,points:points.map(([x,y])=>({x,y}))});
const eq=(value,expected,name)=>assert.equal(value,expected,name);
const check=(id,kind,doc,result,options,expect)=>{
 const m=measure(doc,result,options);expect(m);records.push({id,kind,pass:true,expected:expect.toString(),metrics:m,doc,routing:result,options});
 console.log(`[calibration] ${id}: PASS`);return m;
};
let actualRouterRuns=0;
const compute=(i,o)=>{actualRouterRuns++;return RouteLab.compute(i,o);};

// Exact overlap area: intersection is 10 x 40 = 400px². Zero-edge normalization stays finite.
{
 const ns=[node('a',0,0),node('b',30,0)],doc=make(ns);
 check('overlapping-boxes','analytical',doc,{routes:[]},{input:input(ns)},m=>{eq(m.overlaps,1);eq(m.overlapArea,400);eq(m.hardValid,false);eq(Number.isFinite(m.diPer10),true);eq(m.defectRaw,m.diPer10);});
}
// Real shipped router must detour around one unrelated obstacle.
{
 const ns=[node('a',0,80),node('b',200,80),node('obstacle',95,60,50,80)],es=[edge('e','a','b')],doc=make(ns,es),i=input(ns,es),r=compute(i);
 check('one-obstacle','actual-router',doc,r,{input:i},m=>{eq(m.throughNodes,0);eq(m.blockedRoutes,0);eq(m.authoredSideViolations,0);assert.ok(m.routeLength>160);});
 const bad={routes:[route(es[0],[[40,100],[200,100]])]};
 check('one-obstacle-penetration','analytical',doc,bad,{input:i},m=>{eq(m.throughNodes,1);eq(m.routingHardDefects>=1,true);});
}
// Cross versus detour differs by exactly one proper crossing; endpoints touching do not count.
{
 const ns=[node('a',0,80,20,20),node('b',180,80,20,20),node('c',80,0,20,20),node('d',80,180,20,20)],es=[edge('ab','a','b'),edge('cd','c','d')],doc=make(ns,es),i=input(ns,es);
 const ab=route(es[0],[[20,90],[180,90]]),cd=route(es[1],[[90,20],[90,180]],'bottom','top');
 check('unavoidable-crossing-with-fixed-straight-paths','analytical',doc,{routes:[ab,cd]},{input:i},m=>{eq(m.crossings,1);eq(m.throughNodes,0);eq(m.hardValid,true);eq(m.routeLength,320);});
 const around=route(es[1],[[90,20],[90,40],[220,40],[220,140],[90,140],[90,180]],'bottom','top');
 check('avoidable-crossing-detour','analytical',doc,{routes:[ab,around]},{input:i},m=>{eq(m.crossings,0);eq(m.throughNodes,0);eq(m.routeLength,580);eq(m.bends,4);});
}
{
 const ns=[node('a',0,0),node('b',120,120)],es=[edge('e','a','b',{fromSide:'bottom',toSide:'top'})],doc=make(ns,es),i=input(ns,es),r=compute(i);
 check('explicit-sides','actual-router',doc,r,{input:i},m=>{eq(m.authoredSideViolations,0);eq(m.blockedRoutes,0);});
 const wrong=structuredClone(r);wrong.routes[0].fromSide='left';
 check('explicit-side-violation','analytical-mutation',doc,wrong,{input:i},m=>{eq(m.authoredSideViolations,1);eq(m.hardValid,false);});
}
{
 const ns=[node('a',25,75)],doc=make(ns);doc.layout.nodes.a.pinned=true;
 check('fixed-pin','analytical',doc,{routes:[]},{input:input(ns),expectedPins:{a:{x:25,y:75}}},m=>eq(m.pinScopeViolations,0));
 const moved=structuredClone(doc);moved.layout.nodes.a.x=26;
 check('fixed-pin-violation','analytical',moved,{routes:[]},{input:input(ns),expectedPins:{a:{x:25,y:75}}},m=>{eq(m.pinScopeViolations,1);eq(m.hardValid,false);});
}
{
 const ns=[node('a',0,0),node('b',100,200),node('c',300,50)],doc=make(ns);
 check('disconnected','analytical',doc,{routes:[]},{input:input(ns)},m=>{eq(m.edges,0);eq(m.hardValid,true);eq(m.routeLength,0);eq(Number.isFinite(m.diPer10),true);});
 const relabel=structuredClone(doc);relabel.graph.nodes[0].title='A renamed';
 check('relabel-no-topology','analytical',relabel,{routes:[]},{input:input(ns),referenceDoc:doc,referenceRoutes:[]},m=>{eq(m.edit.meanDisplacement,0);eq(m.edit.orderFlips,0);eq(m.edit.changedRoutes,0);});
}
{
 const ns=[node('a',0,0),node('b',200,0),node('c',100,-100),node('d',100,100)],es=[edge('ab','a','b'),edge('cd','c','d')],doc=make(ns,es),i=input(ns,es);
 const ab=route(es[0],[[40,20],[200,20]]),cd=route(es[1],[[120,-60],[120,100]],'bottom','top');
 const drawn=[{...ab,label:{x:120,y:20,w:60,h:20}},{...cd,label:null}];
 check('label-ownership-other-edge-through-text','analytical-production-shape',doc,{routes:[ab,cd]},{input:i,drawnRoutes:drawn,labelInk:{ab:{x:98,y:15,w:44,h:10}}},m=>{eq(m.counts['label-through-text'],1);eq(m.labelCount,1);eq(m.counts['label-detached']??0,0);});
 const detached=[{...ab,label:{x:120,y:70,w:60,h:20}},{...cd,label:null}];
 check('label-detached','analytical-production-shape',doc,{routes:[ab,cd]},{input:i,drawnRoutes:detached},m=>eq(m.counts['label-detached'],1));
}
{
 const ns=[node('a',0,0),node('b',200,0)],gs=[{id:'g',title:'Group',x:80,y:0,w:80,h:140,titleWidth:65,titleHeight:28,collapsed:false}],es=[edge('e','a','b')],doc=make(ns,es,gs),i=input(ns,es,gs),r={routes:[route(es[0],[[40,20],[200,20]])]};
 check('group-title','analytical',doc,r,{input:i},m=>{eq(m.titleTextHits,1);eq(m.titleBandHits,1);eq(m.counts['edge-through-group'],1);});
}
// All geometric results except positions/explicit shift are invariant under an arbitrary translation.
{
 const ns=[node('a',0,0),node('b',200,0)],es=[edge('e','a','b')],doc=make(ns,es),i=input(ns,es),r=compute(i),base=measure(doc,r,{input:i});
 const dx=137.125,dy=-63.75,shiftDoc=structuredClone(doc);for(const g of Object.values(shiftDoc.layout.nodes)){g.x+=dx;g.y+=dy;}
 const shiftInput=structuredClone(i);for(const n of [...shiftInput.nodes,...shiftInput.groups]){n.x+=dx;n.y+=dy;}
 const shiftRoute=structuredClone(r);for(const rt of shiftRoute.routes)for(const p of rt.points){p.x+=dx;p.y+=dy;}
 check('translation-invariance','analytical-transformation',shiftDoc,shiftRoute,{input:shiftInput,referenceDoc:doc,referenceRoutes:r.routes},m=>{for(const k of ['overlaps','hardDefects','width','height','area','routeLength','crossings','bends','diPer10'])eq(m[k],base[k],k);eq(m.edit.translationAdjustedMean,0);eq(m.edit.orderFlips,0);eq(m.edit.changedRoutes,0);});
}
// Replicating disjoint identical crossing units doubles absolute counts and leaves per-edge DI equal.
{
 const one=(prefix,dx)=>({ns:[node(prefix+'a',dx,80,20,20),node(prefix+'b',dx+180,80,20,20),node(prefix+'c',dx+80,0,20,20),node(prefix+'d',dx+80,180,20,20)],es:[edge(prefix+'ab',prefix+'a',prefix+'b'),edge(prefix+'cd',prefix+'c',prefix+'d')]});
 const p=one('p',0),q=one('q',600),rp=[route(p.es[0],[[20,90],[180,90]]),route(p.es[1],[[90,20],[90,180]],'bottom','top')],rq=[route(q.es[0],[[620,90],[780,90]]),route(q.es[1],[[690,20],[690,180]],'bottom','top')];
 const first=measure(make(p.ns,p.es),{routes:rp},{input:input(p.ns,p.es)});
 check('edge-normalization','analytical',make([...p.ns,...q.ns],[...p.es,...q.es]),{routes:[...rp,...rq]},{input:input([...p.ns,...q.ns],[...p.es,...q.es])},m=>{eq(m.crossings,2);eq(m.edges,4);eq(m.counts.crossing/m.edges,first.counts.crossing/first.edges);eq(10*m.counts.crossing/m.edges,5);});
}
// A diagonal's empty AABB corner is not diamond ink; boundary-hugging remains a soft defect.
{
 const ns=[node('a',0,0,20,20),node('b',200,0,20,20),node('diamond',80,0,80,80,{shape:'diamond'})],es=[edge('e','a','b')],doc=make(ns,es),r={routes:[route(es[0],[[20,10],[200,10]])]};
 check('diamond-interior-positive','analytical',doc,r,{input:input(ns,es)},m=>eq(m.throughNodes,1));
 const ns2=[node('a',0,-10,20,20),node('b',200,-10,20,20),node('diamond',80,0,80,80,{shape:'diamond'})],doc2=make(ns2,es),r2={routes:[route(es[0],[[20,0],[200,0]])]};
 check('diamond-boundary-not-penetration','analytical',doc2,r2,{input:input(ns2,es)},m=>eq(m.throughNodes,0));
}
const report={version:VERSION,frozenAt:new Date().toISOString(),baseline:'f14d9b891adba75de6cc172b190017ea5a5ca091',status:'pass',fixtures:records.length,actualRouterRuns,analyticalCases:records.filter(r=>r.kind!=='actual-router').length,records};
fs.writeFileSync(path.join(root,'data/calibration/metric-calibration.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'evaluation/metrics-spec.json'),JSON.stringify({version:VERSION,frozenAt:report.frozenAt,weights:WEIGHTS,equivalence:EQUIVALENCE,epsilon:0.5,geometryTolerance:1,profileNames:['readable directional flow','compact presentation','traceable connections','stable incremental edits','specialist structure preservation'],normalization:{defectIndex:'raw / max(1,E/10), baseline compatible cap',diPer10:'10*raw/E for E>0; raw for E=0',zeroEdge:'no zero divisor; all count/rate pairs kept'},hardGate:['nonfinite/missing geometry','missing object/route','unexpected/duplicate route','blocked route','wrong endpoint ID','port disconnected >1px','authored-side violation','unrelated object overlap >0.5px','route-through unrelated node interior >0.5px','pin/scope movement >0.5px','explicit required intent failure'],limitations:['Diagnostic subset is not a numerical reproduction of baseline audit DI.','Full exported clipping, text ink rectangles, and actual title width need caller-supplied production evidence.','Title-width envelope is conservative, not pixel-exact glyph coverage.','Soft DI never overrides hard gates.','No claim calibration paths are product output except rows labelled actual-router.','One crossing saved by a long detour can be worse under FEEL: retain direct weighting and visual ledger.','Equivalence bands borrowed from contract, not inferred from user study; visual validation pending before final policy freeze.']},null,2));
console.log(`[calibration] completed ${records.length} fixtures; ${actualRouterRuns} actual router calls`);
