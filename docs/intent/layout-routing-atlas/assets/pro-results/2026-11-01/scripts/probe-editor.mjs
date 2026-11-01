import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {openRuntime} from './editor-runtime.mjs';
const {server,repo:root,out,examples,fixture}=await openRuntime();
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const save=(name,value)=>fs.writeFileSync(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const line=s=>s.split('\n').filter(l=>l.startsWith('layout ')||l.startsWith('routing '));
const bbox=doc=>{const r=Object.values(doc.layout.nodes);const x=Math.min(...r.map(a=>a.x)),y=Math.min(...r.map(a=>a.y));return{x,y,w:Math.max(...r.map(a=>a.x+a.w))-x,h:Math.max(...r.map(a=>a.y+a.h))-y}};
try {
 const [{compile},{projectScene,canonicalGeometry},{readSource,printSource},{setLayoutRecipe,setRouting,engineAttrs},{LayoutLab},{RouteLab},{ExplorerLab},{runEngineTask},{draw,vary,parseTry}]=await Promise.all([
  server.ssrLoadModule('/src/dsl/compile.ts'),server.ssrLoadModule('/src/dsl/project.ts'),server.ssrLoadModule('/src/dsl/syntax.ts'),server.ssrLoadModule('/src/dsl/layout-edits.ts'),server.ssrLoadModule('/src/engines/layout-engine.js'),server.ssrLoadModule('/src/engines/routing-engine.js'),server.ssrLoadModule('/src/engines/explorer-engine.js'),server.ssrLoadModule('/src/lib/engine-tasks.ts'),server.ssrLoadModule('/src/cli/variants.ts')]);
 const compileDoc=async source=>projectScene(await compile(source));
 const recipe=async(source,patch)=>{const scene=await compile(source),doc=projectScene(scene),ast=readSource(source);const settings=LayoutLab.settings({...doc.settings,...patch,mode:'rebuild'});const removed=setLayoutRecipe(ast,scene,'root',settings);return{source:printSource(ast),removed,settings}};
 const result={baseline:'af70d8317797d5a522acffdd604819376a3ec893',execution:'Actual pinned TypeScript/JavaScript loaded by Vite SSR; no browser interaction and no baseline edits.',probes:{},companions:[]};
 // Fold omission: isolate fold by using implicit/auto reading direction in all three files.
 const chain=fs.readFileSync(fixture('layout/chain.draft'),'utf8').replace('layout root flow direction=right','layout root engine=layered fold=never');
 const before=await compileDoc(chain),never=await recipe(chain,{fold:'never'}),auto=await recipe(chain,{fold:'auto'}),neverDoc=await compileDoc(never.source),autoDoc=await compileDoc(auto.source);
 save('sources/fold-before-explicit-never.draft',chain);save('sources/fold-after-ui-never.draft',never.source);save('sources/fold-after-ui-auto.draft',auto.source);
 for(const [name,src] of [['fold-before-explicit-never',chain],['fold-after-ui-never',never.source],['fold-after-ui-auto',auto.source]])save('svg/'+name+'.svg',(await draw(src)).svg);
 result.probes.fold={uiDefault:LayoutLab.defaults.fold,beforeLines:line(chain),afterNeverLines:line(never.source),afterAutoLines:line(auto.source),beforeBox:bbox(before),neverBox:bbox(neverDoc),autoBox:bbox(autoDoc),beforeGeometry:hash(canonicalGeometry(before)),neverGeometry:hash(canonicalGeometry(neverDoc)),autoGeometry:hash(canonicalGeometry(autoDoc)),neverEqualsAuto:JSON.stringify(canonicalGeometry(neverDoc))===JSON.stringify(canonicalGeometry(autoDoc)),neverPreservesExplicitBefore:JSON.stringify(canonicalGeometry(before))===JSON.stringify(canonicalGeometry(neverDoc)),projectedSettings:{before:before.settings.fold,afterNever:neverDoc.settings.fold,afterAuto:autoDoc.settings.fold}};
 // Compare axes advertised for layered but removed by recipe serializer.
 const compare=fs.readFileSync(fixture('editor/editor-compare-start.draft'),'utf8');
 const ignored=[];
 for(const [axis,values] of [['respectDirection',[true,false]],['respectManual',[false,true]],['growContainers',[false,true]],['flowStrength',[25,100]],['aspect',['1.6','canvas']]]){
  const variants=[];
  for(const value of values){const x=await recipe(compare,{algorithm:'layered',[axis]:value});const d=await compileDoc(x.source);variants.push({requested:value,lines:line(x.source),sourceHash:hash(x.source),geometryHash:hash(canonicalGeometry(d)),projectedValue:d.settings[axis]});}
  ignored.push({axis,offeredByCompare:axis in ExplorerLab.effectiveParams('layered','rebuild'),variants,sameSource:variants[0].sourceHash===variants[1].sourceHash,sameGeometry:variants[0].geometryHash===variants[1].geometryHash});
 }
 result.probes.sourceIgnoredAxes=ignored;
 // Actual source engine task receives the user's spec but only clamped routing source.
 const routeSource=fs.readFileSync(fixture('routing/corner-radius-0.draft'),'utf8'),routeDoc=await compileDoc(routeSource);
 const spec={key:'cell-0',title:'Parallel edge gap = 1',subtitle:'One-parameter sweep',patch:{edgeGap:1}};
 let nativeError=null;try{await ExplorerLab.candidate(routeDoc,spec,{mode:'routing',autoPorts:false,priorRoutes:[]});}catch(e){nativeError=e.message;}
 const ast=readSource(routeSource);setRouting(ast,RouteLab.settings({...routeDoc.settings.routing,...spec.patch}));const clampedSource=printSource(ast);
 const clampedResult=await runEngineTask({kind:'source',source:clampedSource,spec});
 save('sources/compare-edge-gap-requested-1-effective-4.draft',clampedSource);save('svg/compare-edge-gap-requested-1-effective-4.svg',(await draw(clampedSource)).svg);
 result.probes.sourceClamp={parsedValue:ExplorerLab.parseValues('edgeGap','1','routing')[0],nativeError,sourceLines:line(clampedSource),preservedSpec:clampedResult.spec,effectiveEdgeGap:clampedResult.document.settings.routing.edgeGap,report:clampedResult.report};
 // Source branch ignores release-ports and effort/config because task payload carries no config.
 const fixed=fs.readFileSync(fixture('routing/ports-fixed-both.draft'),'utf8'),fixedDoc=await compileDoc(fixed),sameSpec={key:'ports',title:'Current settings',patch:{}};
 const nativeReleased=await ExplorerLab.candidate(fixedDoc,sameSpec,{mode:'routing',autoPorts:true,priorRoutes:[]});
 const sourceReleased=await runEngineTask({kind:'source',source:fixed,spec:sameSpec});
 result.probes.releasePorts={source:'examples/routing/ports-fixed-both.draft',before:fixedDoc.layout.edges,nativeAfter:nativeReleased.document.layout.edges,sourceAfter:sourceReleased.document.layout.edges,sourceEqualsBefore:JSON.stringify(fixedDoc.layout.edges)===JSON.stringify(sourceReleased.document.layout.edges)};
 // Direction omission removes edge flow metadata; compiler routing can expose a difference.
 const directionBase=chain.replace('layout root engine=layered fold=never','edge feedback n11 -> n0\nlayout root engine=layered direction=right fold=never');
 const directionOmitted=directionBase.replace(' direction=right','');
 const explicitDoc=await compileDoc(directionBase),omittedDoc=await compileDoc(directionOmitted);
 save('sources/direction-explicit-right.draft',directionBase);save('sources/direction-omitted-auto.draft',directionOmitted);
 for(const [name,src]of[['direction-explicit-right',directionBase],['direction-omitted-auto',directionOmitted]])save('svg/'+name+'.svg',(await draw(src)).svg);
 result.probes.direction={explicitEdges:explicitDoc.layout.edges,omittedEdges:omittedDoc.layout.edges,sameNodeGeometry:JSON.stringify(canonicalGeometry(explicitDoc).nodes)===JSON.stringify(canonicalGeometry(omittedDoc).nodes),sameRoutes:JSON.stringify(canonicalGeometry(explicitDoc).routes)===JSON.stringify(canonicalGeometry(omittedDoc).routes),uiRightAttrs:engineAttrs(LayoutLab.settings({algorithm:'layered',direction:'RIGHT',fold:'never'})).map(([k,v])=>[k,v.value])};
 // Direct CLI algorithm proof available even when command's mandatory PNG writer is blocked.
 const radiusVary=await vary(routeSource,{axes:[parseTry('corner-radius=0,6,16')]});
 const radius=[];
 for(const v of radiusVary.variants){const d=radiusVary.drawn.get(v.id);save('sources/radius-'+v.id+'.draft',d.source);save('svg/radius-'+v.id+'.svg',d.svg);const measured=await draw(d.source);radius.push({...v,svgHash:hash(d.svg),geometryKey:measured.key});}
 result.probes.radiusVary={mode:radiusVary.mode,recommended:radiusVary.recommended,tried:radiusVary.tried,failed:radiusVary.failed,variants:radius,allGeometryKeysEqual:radius.every(v=>v.geometryKey===radius[0].geometryKey),svgHashes:radius.map(v=>v.svgHash),distinctSvgCount:new Set(radius.map(v=>v.svgHash)).size};
 // Standalone native companions are exact compiler projections, with no hand-edited geometry.
 for(const name of ['editor-pass-start','editor-scope-start','editor-intent-start','editor-compare-start']){const source=fs.readFileSync(fixture('editor/'+name+'.draft'),'utf8');const scene=await compile(source),doc=projectScene(scene);save('json/'+name+'.json',doc);save('svg/'+name+'.svg',(await draw(source)).svg);result.companions.push({source:'examples/editor/'+name+'.draft',nativeJson:'json/'+name+'.json',svg:'svg/'+name+'.svg',diagnostics:scene.diagnostics,geometryHash:hash(canonicalGeometry(doc))});}
 save('probe-results.json',result);
 console.log(JSON.stringify({fold:result.probes.fold,ignoredAxes:ignored.map(v=>({axis:v.axis,offered:v.offeredByCompare,sameSource:v.sameSource,sameGeometry:v.sameGeometry})),clamp:result.probes.sourceClamp,radius:{allGeometryKeysEqual:result.probes.radiusVary.allGeometryKeysEqual,distinctSvgCount:result.probes.radiusVary.distinctSvgCount,tags:radius.map(v=>({id:v.id,title:v.title,tags:v.tags}))},companions:result.companions},null,2));
}finally{await server.close();}
