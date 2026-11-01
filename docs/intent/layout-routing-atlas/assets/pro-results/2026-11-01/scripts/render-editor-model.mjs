import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {openRuntime} from './editor-runtime.mjs';
const {server,repo:root,out,examples,fixture}=await openRuntime();
const copy=structuredClone,hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const save=(name,v)=>fs.writeFileSync(path.join(out,name),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
try{
 const [{LayoutLab},{SculptLab},{ExplorerLab},{RouteLab},{canonicalGeometry,projectScene},{renderSvg},{compile}]=await Promise.all(['/src/engines/layout-engine.js','/src/engines/sculpt-engine.js','/src/engines/explorer-engine.js','/src/engines/routing-engine.js','/src/dsl/project.ts','/src/cli/svg.ts','/src/dsl/compile.ts'].map(p=>server.ssrLoadModule(p)));
 const baseline=projectScene(await compile(fs.readFileSync(fixture('editor/editor-pass-start.draft'),'utf8')));
 save('json/editor-pass-start.json',baseline);
 const rows=[];
 const render=(name,document,provenance)=>{
  const geometry=canonicalGeometry(document),routing=RouteLab.compute(ExplorerLab.sceneInput(document),{...document.settings.routing,previous:[]}),svg=renderSvg(document),size=/width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  save('json/'+name+'.json',document);save('svg/'+name+'.svg',svg);save('geometry/'+name+'.json',geometry);
  const row={name,document:'json/'+name+'.json',svg:'svg/'+name+'.svg',geometry:'geometry/'+name+'.json',geometry_sha256:hash(geometry),metrics:{width:Number(size[1]),height:Number(size[2]),crossings:routing.report.crossings,bends:routing.report.bends,length:routing.report.length},...provenance};rows.push(row);return row;
 };
 render('model-layout-before',baseline,{visual_ids:['V-E17'],operation:'baseline'});
 const common={...baseline.settings,algorithm:'tidy',direction:'RIGHT',maxMove:48,stability:65,iterations:32,scope:'all',selected:[],fixedIds:[],viewport:{w:1440,h:1000}};
 for(const run of ['cold','warm','pass']){
  const options={...common,mode:run==='pass'?'pass':'rebuild',warmStart:run==='warm',settle:run!=='pass',maxIterations:640};
  const result=await LayoutLab.compute(baseline,options);render('model-layout-'+run,result.document,{visual_ids:['V-E17'],operation:run,options,report:result.report});
 }
 const journeyOptions={...common,maxIterations:640};
 const timeline=await SculptLab.journey(baseline,journeyOptions);save('json/model-timeline-full.json',timeline);
 const frameIndices=[0,Math.floor((timeline.frames.length-1)/2),timeline.frames.length-1];
 for(const [i,index]of frameIndices.entries()){
  const frame=timeline.frames[index],doc=copy(timeline.baseline);doc.settings=LayoutLab.settings({...doc.settings,...timeline.settings});doc.settings.routing=copy(baseline.settings.routing);doc.layout.nodes=copy(frame.nodes);
  render(['model-timeline-first','model-timeline-middle','model-timeline-last'][i],doc,{visual_ids:['V-E23','V-E24'],operation:'recorded frame',frameIndex:index,frameCount:timeline.frames.length,iteration:frame.iteration,phase:frame.phase,options:journeyOptions});
 }
 // All five dabs use this same perturbed baseline and the same unperturbed restore reference.
 const brushBefore=copy(baseline),reference=copy(baseline.layout.nodes);brushBefore.camera={x:0,y:0,k:1};brushBefore.layout.nodes.browse.x=560;brushBefore.layout.nodes.browse.y=320;
 const r=brushBefore.layout.nodes.browse,point={x:r.x+r.w/2,y:r.y+r.h/2};
 render('model-brush-before',brushBefore,{visual_ids:['V-E27','V-E28'],operation:'brush baseline',setup:{sourceJson:'json/editor-pass-start.json',referenceCapturedBeforePerturbation:true,edits:[{id:'browse',x:560,y:320}],cameraScale:1}});
 save('json/model-brush-reference.json',reference);
 for(const mode of ['tidy','flow','space','restore','protect']){
  const options={...SculptLab.defaults,mode,point,worldRadius:190,reference,protectedIds:[]};
  const result=SculptLab.dab(brushBefore,options),holds=mode==='protect'?Object.entries(result.weights).filter(([id,w])=>w>=0.25).map(([id])=>id):mode==='restore'&&options.holdRestored?result.moved:[];
  const {reference:unused,...reportedOptions}=options;
  render('model-brush-'+mode,result.document,{visual_ids:['V-E27','V-E28'],operation:'one dab',options:{...reportedOptions,reference:'json/model-brush-reference.json'},result:{weights:result.weights,locked:result.locked,moved:result.moved,maxDisplacement:result.maxDisplacement,blocked:result.blocked,attenuation:result.attenuation},editorSessionHoldsAfter:holds,holdsNote:'Hold IDs follow src/state/sculpt.ts brushDab; holds are session state, not a field in this Diagram JSON.'});
 }
 const families=[{name:'cold-warm-pass',names:['model-layout-before','model-layout-cold','model-layout-warm','model-layout-pass']},{name:'timeline',names:['model-timeline-first','model-timeline-middle','model-timeline-last']},{name:'brush',names:['model-brush-before','model-brush-tidy','model-brush-flow','model-brush-space','model-brush-restore','model-brush-protect']}];
 for(const family of families){const rects=family.names.flatMap(name=>JSON.parse(fs.readFileSync(path.join(out,'geometry/'+name+'.json'),'utf8')).nodes);const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));family.commonWorldRectangle={x,y,w:Math.max(...rects.map(r=>r.x+r.w))-x,h:Math.max(...rects.map(r=>r.y+r.h))-y};}
 const results={baseline:'af70d8317797d5a522acffdd604819376a3ec893',execution:'Actual LayoutLab.compute / SculptLab.journey / SculptLab.dab and src/cli/svg.ts renderSvg. Native model execution, not editor UI screenshots.',reproduce:'node scripts/render-editor-model.mjs --repo /path/to/pinned-draftably --out /path/to/output',source:'examples/editor/editor-pass-start.draft',startingJson:'json/editor-pass-start.json',routing:'SVG rendering uses the baseline renderer with previous:[]; it does not reproduce UI route-cache history.',timeline:{file:'json/model-timeline-full.json',frameCount:timeline.frames.length,selectedFrames:frameIndices,report:timeline.report},families,rows};save('model-render-results.json',results);
 console.log(JSON.stringify({renderCount:rows.length,timelineFrames:timeline.frames.length,selectedFrames:frameIndices,layout:rows.filter(r=>r.operation==='cold'||r.operation==='warm'||r.operation==='pass').map(r=>({operation:r.operation,metrics:r.metrics,report:{iterations:r.report.iterations,termination:r.report.termination,moved:r.report.moved,maxDisplacement:r.report.maxDisplacement}})),brush:rows.filter(r=>r.operation==='one dab').map(r=>({name:r.name,...r.result,holds:r.editorSessionHoldsAfter}))},null,2));
}finally{await server.close();}
