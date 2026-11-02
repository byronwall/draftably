#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { measure } from './metrics.mjs';
const doc={graph:{nodes:[{id:'a',title:'A'},{id:'b',title:'B',parentId:'g'}],groups:[{id:'g',title:'Collapsed'}],edges:[{id:'e',from:'a',to:'b',directed:true,label:''}]},layout:{nodes:{a:{x:0,y:100,w:40,h:40},b:{x:120,y:140,w:40,h:40},g:{x:100,y:100,w:100,h:100}},edges:{e:{}},containers:{},labels:{}},collapsed:['g'],styles:{a:{shape:'box'},b:{shape:'box'}},settings:{direction:'RIGHT',routing:{edgeGap:16}}};
const rects=new Map([['a',doc.layout.nodes.a],['g',{x:100,y:100,w:100,h:58}]]);
const input={nodes:[{id:'a',...rects.get('a'),shape:'box'}],groups:[{id:'g',...rects.get('g'),collapsed:true}],edges:[{id:'e',from:'a',to:'g',cfg:{}}]};
const route={id:'e',from:'a',to:'g',fromSide:'right',toSide:'left',fromOffset:0,toOffset:0,blocked:false,points:[{x:40,y:120},{x:70,y:120},{x:70,y:129},{x:100,y:129}]};
const result=measure(doc,{routes:[route]},{input,drawnRoutes:[{...route,label:null}],rects,expectedEdges:['e']});
assert.equal(result.hardDefects,0);assert.equal(result.visibleNodes,2);assert.equal(result.edges,1);
const soft=structuredClone(doc);soft.collapsed=[];soft.graph.groups[0].frame='soft';soft.layout.nodes.g={x:-10,y:90,w:190,h:140};
const softResult=measure(soft,{routes:[]},{input:{nodes:[],groups:[],edges:[]}});assert.equal(softResult.overlaps,0);
fs.writeFileSync(new URL('../data/calibration/visibility-calibration.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),kind:'analytical metric calibration, no engine/router calls',pass:true,fixtures:2,collapsed:result,soft:softResult},null,2));
console.log('[calibration] collapsed proxy and soft group: 2 PASS');
