import { controllers, registerDispose, listen, later, every, clearTimer } from './controller-context';
import { $, hideLayoutLab, clone, esc, clamp, icon, normalize, D, S, group, edge, geometryNode, rectUnion, center, snapshot, remember, change, persist, toast, undo, redo, dist, routingFingerprint, layoutScope, renderLayoutLab, cancelLayout, renderScene, renderOverlay, applyCamera, screenToWorld, checkbox, renderAll, closePopover, setTool, canvasCenter, finishInlineEdit, startDrag, finishDrag, downloadBlob, filename, setDocument, editableTarget } from './editor.js';
import { documentIdentity } from './explorer.js';
import { LayoutLab } from './engines/layout-engine.js';
import { RouteLab } from './engines/routing-engine.js';
import { ExplorerLab } from './engines/explorer-engine.js';
import { SculptLab } from './engines/sculpt-engine.js';
/* Diagram Studio 7 — transactional timeline + spatial brush controller.
 * D is committed data. S.sculptNodes is the render-only geometry buffer.
 * Scrubbing, hovering, cancelled gestures and cancelled workers do not write D.
 */
let JOURNEY=null,JOURNEY_ARCHIVE=null,journeyJob=0,journeyWorker=null,journeyReject=null;
const SCULPT={documentId:D.id,active:false,settings:{...SculptLab.defaults},point:null,client:null,hover:null,stroke:null,reference:null,referenceLabel:'Before brush',holds:new Set(),holdUndo:[],raf:0,hoverTimer:0,restoreKey:false,lastDabAt:0,playTimer:0,strokeTimer:0};
const JOURNEY_STORE='diagram-studio-v7-last-journey';
function sculptCheckDocument(){if(SCULPT.documentId===D.id)return;SCULPT.documentId=D.id;SCULPT.holds.clear();SCULPT.holdUndo=[];SCULPT.reference=null;SCULPT.referenceLabel='Before brush';JOURNEY_ARCHIVE=null;if(SCULPT.active)brushDeactivate();}
function sculptFixedIds(){sculptCheckDocument();return [...SCULPT.holds].filter(id=>D.layout.nodes[id]);}
function sculptInteracting(){return !!JOURNEY||!!SCULPT.stroke;}
function sculptSignature(doc){return documentIdentity(doc);}
function sculptRender(){S.routeCache=null;renderScene();}
function sculptQueueRender(){if(SCULPT.raf)return;SCULPT.raf=requestAnimationFrame(()=>{SCULPT.raf=0;sculptRender();});}
function sculptSetGeometry(nodes){S.sculptNodes=nodes||null;sculptQueueRender();}
function sculptStopPlayback(){clearTimer(SCULPT.playTimer);SCULPT.playTimer=0;const b=$('journey-play');if(b){b.textContent='Play';b.setAttribute('aria-pressed','false');}}
function sculptDiagnostics(){
 return{journey:JOURNEY?{busy:JOURNEY.busy,index:JOURNEY.index,peek:JOURNEY.peek,frames:JOURNEY.data?.frames.length||0,ghost:JOURNEY.ghost,report:JOURNEY.data?.report||null,bookmarks:clone(JOURNEY.data?.bookmarks||[]),signature:JOURNEY.signature}:null,brush:{active:SCULPT.active,settings:clone(SCULPT.settings),stroke:!!SCULPT.stroke,eligible:Object.keys(SCULPT.hover?.weights||{}),locked:SCULPT.hover?.locked||[],referenceLabel:SCULPT.referenceLabel,hasReference:!!SCULPT.reference,holds:sculptFixedIds()},archiveFrames:JOURNEY_ARCHIVE?.frames.length||0};
}
function sculptArchive(data){
 JOURNEY_ARCHIVE=clone(data);
 try{const raw=JSON.stringify(data);if(raw.length<3_500_000)localStorage.setItem(JOURNEY_STORE,raw);else toast('Timeline kept for this session; too large for browser history. Save the timeline file to keep it.');}catch{toast('Timeline kept in this tab. Browser history storage is unavailable.');}
}
function sculptExportJourney(){return clone(JOURNEY?.data||JOURNEY_ARCHIVE);}
function sculptRestoreArchive(){
 try{const text=localStorage.getItem(JOURNEY_STORE);if(!text)return;const raw=JSON.parse(text);if(raw.baseline?.id!==D.id)return;const a=sculptValidateJourney(raw);JOURNEY_ARCHIVE=a;SCULPT.reference=clone(a.frames[0].nodes);SCULPT.referenceLabel='Before last layout';}catch{}
}
async function journeyCompute(doc,opts){
 let worker;
 try{
  worker=new Worker(new URL('./workers/sculpt-worker.ts', import.meta.url),{type:'module'});
 }catch(err){console.warn('[journey] Worker unavailable; yielding main-thread solve',err);return SculptLab.journey(doc,opts);}
 journeyWorker=worker;
 return new Promise((resolve,reject)=>{
  journeyReject=reject;const done=()=>{worker.terminate();if(journeyWorker===worker)journeyWorker=null;journeyReject=null;};
  worker.onmessage=e=>{done();e.data.ok?resolve(e.data.data):reject(Error(e.data.error));};
  worker.onerror=e=>{e.preventDefault();done();console.warn('[journey] Worker startup failed',e.message);SculptLab.journey(doc,opts).then(resolve,reject);};
  worker.postMessage({doc,opts});
 });
}
async function openJourney(options={}){
 if(S.preview){toast('Keep or discard the existing layout preview first.');return;}
 if($('explorer-dialog').open)controllers.explorer.closeExplorer?.();
 finishInlineEdit(true);if(S.drag)finishDrag();if(S.layoutBusy)cancelLayout();
 if(SCULPT.stroke)sculptCancelStroke();brushDeactivate();closePopover();hideLayoutLab();setTool('select');
 if(JOURNEY)closeJourney();
 const baseline=clone(D),job=++journeyJob;
 S.sculptRoutePrior=clone(S.lastRoutes);
 const scope=layoutScope();
 const opts={...D.settings,...scope,selected:[...S.selected],fixedIds:sculptFixedIds(),maxIterations:640,viewport:{w:$('stage').clientWidth,h:$('stage').clientHeight},...options};
 JOURNEY={signature:sculptSignature(D),baseline,opts,busy:true,index:0,peek:null,ghost:'next',job,data:null};
 $('stage').classList.add('has-journey');sculptLockControls(true);renderJourneyDeck();$('canvas').focus();
 console.info('[journey] recording solver checkpoints',{algorithm:opts.algorithm,rebuild:!!opts.rebuild,scope:opts.scope,holds:opts.fixedIds.length});
 try{
  const data=await journeyCompute(baseline,opts);
  if(!JOURNEY||job!==journeyJob)return;
  if(sculptSignature(D)!==JOURNEY.signature){closeJourney();toast('Diagram changed while computing. Reopen the timeline.');return;}
  JOURNEY.data=data;JOURNEY.busy=false;JOURNEY.index=0;SCULPT.reference=clone(data.frames[0].nodes);SCULPT.referenceLabel='Before this layout';data.routePrior=clone(S.sculptRoutePrior||[]);
  sculptArchive(data);renderJourneyDeck();journeyScrub(0);$('journey-slider').focus({preventScroll:true});
  console.info('[journey] ready',{frames:data.frames.length,termination:data.report.termination,iterations:data.report.iterations});
 }catch(error){if(job!==journeyJob)return;closeJourney();toast('Timeline could not finish: '+error.message);console.warn('[journey]',error);}
}
function closeJourney(){
 if(!JOURNEY)return;
 journeyJob++;journeyWorker?.terminate();journeyWorker=null;if(journeyReject){journeyReject(Error('Cancelled'));journeyReject=null;}
 sculptStopPlayback();JOURNEY=null;S.sculptNodes=null;S.sculptRoutePrior=null;$('journey-deck').hidden=true;$('stage').classList.remove('has-journey');sculptLockControls(false);sculptRender();$('canvas').focus({preventScroll:true});
}
function renderJourneyDeck(){
 const el=$('journey-deck');el.hidden=!JOURNEY;if(!JOURNEY)return;const j=JOURNEY,a=LayoutLab.algorithms.find(a=>a.id===j.opts.algorithm),frames=j.data?.frames||[],max=Math.max(0,frames.length-1);
 el.innerHTML=`<div class="journey-head"><div class="journey-heading"><span class="sculpt-kicker">LAYOUT TIMELINE</span><strong>${esc(a?.name||'Layout')} <span class="journey-scope">· ${j.opts.scope}</span></strong></div><span id="journey-outcome" class="journey-outcome">${j.busy?'Computing a finish. Your diagram is unchanged.':esc(j.data.report.termination)+' · '+j.data.report.iterations+' solver steps'}</span><button class="ghost" data-sculpt="fit-path" title="Fit every recorded arrangement using one steady camera">Fit path</button><label class="journey-ghost-label">Ghost <select id="journey-ghost" aria-label="Preview ghost"><option value="next">Next meaningful change</option><option value="final">Computed finish</option><option value="off">Off</option></select></label><button class="ghost icon" data-sculpt="close-journey" aria-label="Cancel layout timeline" title="Cancel · Escape">×</button></div>
 ${j.busy?'<div class="journey-loading"><span></span><p>Recording intermediate arrangements, not just the start and end.</p><button data-sculpt="close-journey">Cancel</button></div>':`<div class="journey-track-row"><button id="journey-play" data-sculpt="play" aria-pressed="false" ${max?'':'disabled'}>Play</button><button class="ghost icon" data-sculpt="prev" aria-label="Previous layout step">‹</button><div class="journey-track"><input type="range" id="journey-slider" min="0" max="${max}" step="1" value="${j.index}" aria-label="Recorded layout step" ${max?'':'disabled'}><div class="journey-marks" id="journey-marks"></div><div class="journey-track-labels"><button class="ghost" data-sculpt="start">Your arrangement</button><span id="journey-step"></span><button class="ghost" data-sculpt="end">Computed finish</button></div></div><button class="ghost icon" data-sculpt="next" aria-label="Next layout step">›</button><span id="journey-motion"></span></div>
 <div class="journey-foot"><button data-sculpt="bookmark" title="Use this step as a local restore source later">Bookmark for restore</button><select id="journey-bookmarks" aria-label="Jump to bookmark"></select><span id="journey-note" class="journey-note">Preview only. Hover the track to peek; leave to return.</span><span class="grow"></span><button data-sculpt="keep-brush">Keep & brush</button><button class="primary" data-sculpt="keep">Keep & edit</button></div>`}`;
 if($('journey-ghost'))$('journey-ghost').value=j.ghost;
 if(!j.busy)journeyUpdateChrome();
}
function journeyUpdateChrome(){
 const j=JOURNEY;if(!j?.data)return;const max=j.data.frames.length-1,i=j.peek??j.index,f=j.data.frames[i],baseline=j.data.frames[0];
 $('journey-slider').value=j.index;$('journey-slider').setAttribute('aria-valuetext',`Step ${j.index} of ${max}. ${j.data.frames[j.index].phase}`);
 $('journey-step').textContent=(j.peek!==null?'Peek · ':'')+i+' / '+max;
 const moved=Object.keys(f.nodes).filter(id=>Math.hypot(f.nodes[id].x-baseline.nodes[id].x,f.nodes[id].y-baseline.nodes[id].y)>.05).length;
 $('journey-motion').innerHTML=`<b>${moved}</b> moved <span>${f.metrics.overlaps} overlaps</span>`;
 $('journey-note').textContent=j.peek!==null?'Hover preview only · leave the track to return to your chosen step.':'Recorded steps—not % optimal. Bookmark a good area, then restore it with the brush.';
 const bookmarks=j.data.bookmarks||[];
 $('journey-bookmarks').innerHTML='<option value="">Jump to bookmark…</option>'+bookmarks.map(b=>`<option value="${b.index}">${esc(b.title)} · ${b.index}</option>`).join('');
 $('journey-marks').innerHTML=bookmarks.map(b=>`<button style="left:${max?b.index/max*100:0}%" data-sculpt-frame="${b.index}" title="${esc(b.title)}" aria-label="Jump to ${esc(b.title)}"></button>`).join('');
}
function journeyScrub(index,{peek=false}={}){
 const j=JOURNEY;if(!j?.data||j.busy)return;
 const i=Math.round(clamp(Number(index),0,j.data.frames.length-1));
 if(peek)j.peek=i;else{j.peek=null;j.index=i;}
 sculptSetGeometry(j.data.frames[i].nodes);journeyUpdateChrome();return i;
}
function journeyBookmark(){
 const j=JOURNEY;if(!j?.data)return;const i=j.index;
 if(!j.data.bookmarks.some(b=>b.index===i))j.data.bookmarks.push({index:i,title:'Good at step '+i});
 SCULPT.reference=clone(j.data.frames[i].nodes);SCULPT.referenceLabel='Timeline step '+i;sculptArchive(j.data);journeyUpdateChrome();toast('Restore source: step '+i+'. Keep a later step, then brush this area back.');
}
function journeyKeep(options={}){
 if(typeof options!=='object')options={};const j=JOURNEY;if(!j?.data)return false;
 if(sculptSignature(D)!==j.signature){closeJourney();toast('The diagram changed. Preview discarded.');return false;}
 journeyScrub(j.index);sculptRender();const routed=clone(S.lastRouteResult);
 const before=snapshot(),frame=j.data.frames[j.index],currentCamera=clone(D.camera),data=j.data,step=j.index;
 sculptArchive(data);closeJourney();D.layout.nodes=clone(frame.nodes);D.camera=currentCamera;
 // A geometric checkpoint never imports changes to graph meaning or pin flags.
 D.settings={...D.settings,...data.settings};
 const prior=JSON.parse(before).layout.nodes,movements=Object.keys(frame.nodes).map(id=>Math.hypot(frame.nodes[id].x-prior[id].x,frame.nodes[id].y-prior[id].y)),moved=movements.filter(d=>d>.01).length;
 S.pendingRouteResult={fingerprint:routingFingerprint(D),result:routed};remember(before,'Layout timeline · step '+step);S.layoutReport={...data.report,mode:'journey',selectedStep:step,after:clone(frame.metrics),moved,maxDisplacement:+Math.max(0,...movements).toFixed(2),rmsDisplacement:+Math.sqrt(movements.reduce((n,d)=>n+d*d,0)/Math.max(1,moved)).toFixed(2)};S.routeCache=null;renderAll();
 if(options.brush){brushActivate({mode:SCULPT.reference?'restore':'tidy'});toast('Brush locally to restore '+SCULPT.referenceLabel.toLowerCase()+'. Other areas keep their new layout.');}
 else toast('Kept step '+step+'. Undo restores the arrangement before the timeline.');
 return true;
}
function journeyPlay(){
 const j=JOURNEY;if(!j?.data)return;if(SCULPT.playTimer){sculptStopPlayback();return;}
 if(j.index===j.data.frames.length-1)journeyScrub(0);
 $('journey-play').textContent='Pause';$('journey-play').setAttribute('aria-pressed','true');
 // No automatic animation on entry; playback is always explicitly requested.
 SCULPT.playTimer=every(()=>{if(!JOURNEY?.data){sculptStopPlayback();return;}journeyScrub(JOURNEY.index+1);if(JOURNEY.index>=JOURNEY.data.frames.length-1)sculptStopPlayback();},S.reduced?750:420);
}
function brushActivate(options={}){
 if(JOURNEY){toast('Keep a timeline step before brushing. Use Keep & brush.');return;}
 if(S.preview){toast('Keep or discard the layout preview first.');return;}
 if($('explorer-dialog').open)controllers.explorer.closeExplorer?.();if(S.layoutBusy)cancelLayout();finishInlineEdit(true);if(S.drag)finishDrag();
 SCULPT.settings=SculptLab.settings({...SCULPT.settings,...options});
 if(!SCULPT.reference){SCULPT.reference=clone(D.layout.nodes);SCULPT.referenceLabel='Before brush';}
 SCULPT.active=true;SCULPT.point=null;SCULPT.hover=null;S.selected.clear();S.tool='brush';S.connectFrom=null;
 $('stage').dataset.tool='brush';$('stage').classList.add('has-brush');$('brush-btn').setAttribute('aria-pressed','true');renderBrushDock();renderAll();$('canvas').focus({preventScroll:true});
}
function brushDeactivate(){
 if(!SCULPT.active)return;sculptCancelStroke();SCULPT.active=false;SCULPT.hover=null;SCULPT.point=null;SCULPT.client=null;clearTimer(SCULPT.hoverTimer);
 $('brush-dock').hidden=true;$('stage').classList.remove('has-brush');$('brush-btn').setAttribute('aria-pressed','false');if(S.tool==='brush'){S.tool='select';$('stage').dataset.tool='select';}renderOverlay();
}
function renderBrushDock(){
 const el=$('brush-dock');el.hidden=!SCULPT.active;if(!SCULPT.active)return;const s=SCULPT.settings;
 el.innerHTML=`<div class="brush-head"><span class="sculpt-kicker">LOCAL LAYOUT</span><span class="grow"></span><button class="ghost icon" data-sculpt="close-brush" aria-label="Exit layout brush">×</button></div><div class="brush-controls"><label>Brush<select id="brush-mode">${[['tidy','Tidy nearby'],['flow','Nudge into flow'],['space','Make space'],['restore','Restore from bookmark'],['protect','Hold this area']].map(([id,name])=>`<option value="${id}" ${id===s.mode?'selected':''}>${name}</option>`).join('')}</select></label><label>Radius <output id="brush-radius-out">${s.radius} px</output><input id="brush-radius" type="range" min="40" max="600" step="10" value="${s.radius}" aria-label="Radius ${s.radius}" aria-valuetext="${s.radius} pixels"></label><label>Strength <output id="brush-strength-out">${s.strength}%</output><input id="brush-strength" type="range" min="1" max="100" value="${s.strength}" aria-label="Brush strength"></label></div><div class="brush-detail"><label>Soft edge <input id="brush-softness" type="range" min="0" max="100" value="${s.softness}" aria-label="Brush softness"></label><label class="checkbox"><input id="brush-hold-restored" type="checkbox" ${s.holdRestored?'checked':''}>Hold restored nodes for the next layout</label><div class="brush-source"><span>Restore: <strong id="brush-source">${esc(SCULPT.referenceLabel)}</strong></span><button class="ghost" data-sculpt="reference-now">Use current</button></div><div class="brush-source"><span id="brush-held-count">${sculptFixedIds().length} local holds</span><button class="ghost" data-sculpt="clear-holds">Clear holds</button></div></div><div class="brush-next"><button data-sculpt="timeline-from-here">Preview from here</button><button class="ghost" data-sculpt="reopen-last">Last path</button></div><div class="brush-hint" id="brush-hint">Hover previews. Hold or drag to paint. [ / ] size · Alt restores · Space pans.</div>`;
}
function sculptDabOptions(point,extra={}){
 return{...SCULPT.settings,point,worldRadius:SCULPT.settings.radius/D.camera.k,reference:SCULPT.reference,protectedIds:SCULPT.settings.mode==='restore'?[]:sculptFixedIds(),...(SCULPT.restoreKey&&SCULPT.settings.mode!=='protect'?{mode:'restore',protectedIds:[]}:{}),...extra};
}
function sculptHoverAt(point){
 if(!SCULPT.active||SCULPT.stroke)return;
 SCULPT.point=point;SCULPT.hover=SculptLab.dab(D,sculptDabOptions(point));renderOverlay();
 const h=SCULPT.hover,n=Object.keys(h.weights).length;const label=$('brush-hint');
 if(label)label.textContent=n?`${n} eligible · ${h.locked.length} protected · ${h.blocked?'movement blocked by nearby shapes':h.mode==='restore'?'restore locally; the rest stays put':'hover is preview only; drag to paint'}`:`No movable shapes here${h.locked.length?' · '+h.locked.length+' protected':''} · [ / ] changes the radius`;
}
function brushStart(e){
 const point=screenToWorld(e.clientX,e.clientY);SCULPT.point=point;SCULPT.client={x:e.clientX,y:e.clientY};SCULPT.restoreKey=e.altKey;
 SCULPT.stroke={before:snapshot(),working:clone(D),signature:sculptSignature(D),holdsBefore:[...SCULPT.holds],pointerId:e.pointerId,points:0,moved:new Set(),last:point,alt:e.altKey};
 try{$('canvas').setPointerCapture(e.pointerId);}catch{}sculptStrokeDab(point);clearTimer(SCULPT.strokeTimer);SCULPT.strokeTimer=every(()=>{if(SCULPT.stroke&&SCULPT.point&&performance.now()-SCULPT.lastDabAt>=85)sculptStrokeDab(SCULPT.point);},90);$('canvas').focus({preventScroll:true});
}
function sculptStrokeDab(point){
 const st=SCULPT.stroke;if(!st)return;
 const opts=sculptDabOptions(point,{protectedIds:SCULPT.restoreKey||SCULPT.settings.mode==='restore'?[]:st.holdsBefore}),result=SculptLab.dab(st.working,opts);
 st.points++;st.last=point;SCULPT.lastDabAt=performance.now();SCULPT.hover=result;
 if(result.mode==='protect'){
  for(const [id,w] of Object.entries(result.weights))if(w>=.25){if(SCULPT.restoreKey)SCULPT.holds.delete(id);else SCULPT.holds.add(id);}
 }else{
  st.working=result.document;for(const id of result.moved){st.moved.add(id);if(result.mode==='restore'&&SCULPT.settings.holdRestored)SCULPT.holds.add(id);}
  sculptSetGeometry(st.working.layout.nodes);
 }
 renderOverlay();if($('brush-held-count'))$('brush-held-count').textContent=sculptFixedIds().length+' local holds';
}
function sculptPointerDown(e){
 if(e.button>1||e.ctrlKey||e.metaKey||S.space||e.button===1)return false;
 if(JOURNEY){e.preventDefault();startDrag('pan',e);return true;}
 if(!SCULPT.active)return false;e.preventDefault();brushStart(e);return true;
}
function sculptPointerMove(e){
 if(!SCULPT.active||S.drag||e.ctrlKey||e.metaKey)return false;
 SCULPT.client={x:e.clientX,y:e.clientY};SCULPT.point=screenToWorld(e.clientX,e.clientY);SCULPT.restoreKey=e.altKey;
 if(SCULPT.stroke){
  const dist=Math.hypot(SCULPT.point.x-SCULPT.stroke.last.x,SCULPT.point.y-SCULPT.stroke.last.y)*D.camera.k;
  if(performance.now()-SCULPT.lastDabAt>38||dist>SCULPT.settings.radius*.15)sculptStrokeDab(SCULPT.point);
  renderOverlay();return true;
 }
 clearTimer(SCULPT.hoverTimer);SCULPT.hoverTimer=later(()=>sculptHoverAt(SCULPT.point),55);renderOverlay();return true;
}
function sculptPointerUp(e){
 const st=SCULPT.stroke;if(!st)return false;
 if(e&&e.pointerId!==st.pointerId)return false;
 clearTimer(SCULPT.strokeTimer);SCULPT.strokeTimer=0;SCULPT.stroke=null;S.sculptNodes=null;
 if(sculptSignature(D)!==st.signature){SCULPT.holds=new Set(st.holdsBefore);sculptRender();toast('Diagram changed during the stroke; the stroke was discarded.');return true;}
 const camera=clone(D.camera);D.layout.nodes=clone(st.working.layout.nodes);D.camera=camera;
 const changed=remember(st.before,'Local layout brush');
 sculptRememberHolds(st.holdsBefore,changed,st.before);
 renderAll();if(SCULPT.point)sculptHoverAt(SCULPT.point);if($('brush-held-count'))$('brush-held-count').textContent=sculptFixedIds().length+' local holds';
 try{if(e)$('canvas').releasePointerCapture(e.pointerId);}catch{}
 console.info('[brush] stroke',{samples:st.points,moved:st.moved.size,undo:changed,holds:SCULPT.holds.size});return true;
}
function sculptCancelStroke(){
 const st=SCULPT.stroke;if(!st)return false;clearTimer(SCULPT.strokeTimer);SCULPT.strokeTimer=0;SCULPT.stroke=null;SCULPT.holds=new Set(st.holdsBefore);S.sculptNodes=null;SCULPT.hover=null;sculptRender();return true;
}
function brushApplyAt(options={}){
 if(JOURNEY)throw Error('Keep or cancel the timeline before brushing.');
 const before=snapshot(),result=SculptLab.dab(D,sculptDabOptions(options.point||canvasCenter(),options));
 if(result.mode==='protect'){const old=[...SCULPT.holds];for(const [id,w] of Object.entries(result.weights))if(w>=.25)SCULPT.holds.add(id);sculptRememberHolds(old,false,before);}
 else{const oldHolds=[...SCULPT.holds];D.layout.nodes=result.document.layout.nodes;const changed=remember(before,'Local layout brush');if(result.mode==='restore'&&SCULPT.settings.holdRestored)for(const id of result.moved)SCULPT.holds.add(id);sculptRememberHolds(oldHolds,changed,before);}
 renderAll();return{moved:result.moved,weights:result.weights,maxDisplacement:result.maxDisplacement,blocked:result.blocked};
}
function sculptClearHolds(){const old=[...SCULPT.holds];SCULPT.holds.clear();sculptRememberHolds(old,false,snapshot());renderBrushDock();renderOverlay();toast('Local holds cleared. Explicit pins are unchanged.');}
function sculptBeforeEdit(){
 if(JOURNEY)closeJourney();if(SCULPT.stroke)sculptCancelStroke();S.sculptNodes=null;
}
function sculptUndo(){
 if(JOURNEY){closeJourney();return true;}if(sculptCancelStroke())return true;
 return false;
}
function sculptToolChange(tool){
 if(tool==='brush'){brushActivate();return true;}
 if(SCULPT.active)brushDeactivate();if(JOURNEY){toast('Keep or cancel this layout step before editing.');return true;}return false;
}
function sculptBlur(){sculptStopPlayback();sculptCancelStroke();SCULPT.restoreKey=false;}
function sculptBeforeUnload(){sculptCancelStroke();if(JOURNEY?.data)sculptArchive(JOURNEY.data);}
function sculptOverlay(){
 let html='';const k=D.camera.k;
 const outline=(id,p,color,alpha=1,dashed=true)=>`<rect class="sculpt-ghost" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${group(id)?8:10}" style="stroke:${color};opacity:${alpha}" ${dashed?'stroke-dasharray="5 4"':''}/>`;
 if(JOURNEY?.data&&JOURNEY.ghost!=='off'){
  const j=JOURNEY,index=j.peek??j.index,at=j.data.frames[index],next=j.ghost==='final'?j.data.frames.length-1:SculptLab.lookahead(j.data.frames,index,48,k),to=j.data.frames[next];
  html+=`<g class="sculpt-ghost-layer" aria-hidden="true">`;
  for(const [id,p] of Object.entries(to.nodes)){const prev=at.nodes[id];if(!prev||Math.hypot(prev.x-p.x,prev.y-p.y)<1/k)continue;const a=center(prev),b=center(p);html+=`<path class="sculpt-travel" d="M${a.x},${a.y} L${b.x},${b.y}"/>`+outline(id,p,'var(--accent)',.48);}
  html+='</g>';
 }
 for(const id of sculptFixedIds()){const p=geometryNode(id);html+=`<rect class="sculpt-held" x="${p.x-4/k}" y="${p.y-4/k}" width="${p.w+8/k}" height="${p.h+8/k}" rx="12"/><circle class="sculpt-held-dot" cx="${p.x+p.w-2/k}" cy="${p.y-2/k}" r="4"/>`;}
 if(SCULPT.active&&SCULPT.point&&!S.drag){
  const p=SCULPT.point,r=SCULPT.settings.radius/k,core=r*(1-SCULPT.settings.softness/100),restore=SCULPT.restoreKey||SCULPT.settings.mode==='restore',color=restore?'var(--sculpt-restore)':'var(--accent)';
  html+=`<g class="sculpt-brush-ring" style="color:${color}" aria-hidden="true"><circle cx="${p.x}" cy="${p.y}" r="${r}" class="brush-outer"/><circle cx="${p.x}" cy="${p.y}" r="${core}" class="brush-core"/><path d="M${p.x-5/k},${p.y}h${10/k} M${p.x},${p.y-5/k}v${10/k}"/></g>`;
  const h=SCULPT.hover;if(h){
   for(const [id,w] of Object.entries(h.weights)){const base=SCULPT.stroke?.working.layout.nodes[id]||D.layout.nodes[id];html+=`<rect x="${base.x}" y="${base.y}" width="${base.w}" height="${base.h}" rx="10" fill="${color}" opacity="${w*.12}" pointer-events="none"/>`;if(!SCULPT.stroke&&h.document.layout.nodes[id]){const q=h.document.layout.nodes[id];if(Math.hypot(q.x-base.x,q.y-base.y)>.05)html+=outline(id,q,color,.8);}}
  }
 }
 return html;
}
async function sculptAction(name){
 if(name==='undo'&&JOURNEY){closeJourney();return true;}
 if(name==='journey-reopen'){reopenJourney();return true;}
 if(name==='journey-save'){const data=sculptExportJourney();if(!data){toast('Record a timeline first.');return true;}downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),filename('layout-journey.json'));closePopover();return true;}
 if(name==='journey-open'){if(JOURNEY)closeJourney();else await openJourney();return true;}
 if(name==='brush-toggle'){SCULPT.active?brushDeactivate():brushActivate();return true;}
 if(JOURNEY&&!['file-menu','fit','zoom-in','zoom-out','reset-camera','toggle-left','toggle-right','toggle-panels','help','close-dialog'].includes(name)){toast('Preview only. Keep this step or press Escape to cancel.');return true;}
 if(SCULPT.active&&['compare-layouts','layout','layout-all','layout-menu','run-layout'].includes(name)){brushDeactivate();}
 return false;
}
function sculptKey(e){
 const key=e.key.toLowerCase(),mod=e.metaKey||e.ctrlKey;
 if(key==='escape'){
  if(sculptCancelStroke()){e.preventDefault();return true;}
  if(JOURNEY){e.preventDefault();closeJourney();return true;}
  if(SCULPT.active){e.preventDefault();brushDeactivate();setTool('select');return true;}
 }
 if(editableTarget(e.target)&&e.target.id!=='journey-slider')return false;
 if(!mod&&e.altKey&&key==='t'){e.preventDefault();void openJourney();return true;}
 if(!mod&&!e.altKey&&key==='w'){e.preventDefault();SCULPT.active?brushDeactivate():brushActivate();return true;}
 if(JOURNEY){
  if(mod&&key==='z'){e.preventDefault();closeJourney();return true;}
  if(e.target.id==='journey-slider'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))return true;
  if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();journeyKeep();return true;}
  if(e.code==='Space'&&e.target.id==='journey-slider'){e.preventDefault();journeyPlay();return true;}
  if(['1','0','+','-','='].includes(key)||e.code==='Space')return false;
  if(e.target.closest('#journey-deck'))return false;
  if(!mod){e.preventDefault();return true;}
 }
 if(SCULPT.active){
  if(['[',']'].includes(key)){e.preventDefault();SCULPT.settings.radius=clamp(SCULPT.settings.radius+(key==='['?-20:20),40,600);renderBrushDock();if(SCULPT.point)sculptHoverAt(SCULPT.point);return true;}
  if(key==='l'&&!mod&&!e.altKey){e.preventDefault();brushApplyAt(sculptDabOptions(SCULPT.point||canvasCenter()));return true;}
 }
 return false;
}
listen($('journey-deck'), 'input',e=>{if(e.target.id==='journey-slider'){sculptStopPlayback();journeyScrub(+e.target.value);}});
listen($('journey-deck'), 'change',e=>{if(e.target.id==='journey-ghost'){JOURNEY.ghost=e.target.value;renderOverlay();}if(e.target.id==='journey-bookmarks'&&e.target.value!==''){sculptStopPlayback();journeyScrub(+e.target.value);}});
listen($('journey-deck'), 'pointermove',e=>{
 if(e.target.id!=='journey-slider'||e.buttons||!JOURNEY?.data||SCULPT.playTimer)return;
 const r=e.target.getBoundingClientRect(),ratio=clamp((e.clientX-r.left-7)/(r.width-14),0,1);journeyScrub(Math.round(ratio*(JOURNEY.data.frames.length-1)),{peek:true});
});
listen($('journey-deck'), 'pointerout',e=>{if(e.target.id==='journey-slider'&&JOURNEY?.data){JOURNEY.peek=null;journeyScrub(JOURNEY.index);}});
listen($('brush-dock'), 'input',e=>{
 const key={'brush-radius':'radius','brush-strength':'strength','brush-softness':'softness'}[e.target.id];if(!key)return;
 SCULPT.settings[key]=Number(e.target.value);if($('brush-'+key+'-out'))$('brush-'+key+'-out').textContent=e.target.value+(key==='radius'?' px':'%');
 if(key==='radius'){e.target.setAttribute('aria-label',`Radius ${e.target.value}`);e.target.setAttribute('aria-valuetext',`${e.target.value} pixels`);}
 if(SCULPT.point)sculptHoverAt(SCULPT.point);
});
listen($('brush-dock'), 'change',e=>{if(e.target.id==='brush-mode')SCULPT.settings.mode=e.target.value;if(e.target.id==='brush-hold-restored')SCULPT.settings.holdRestored=e.target.checked;if(SCULPT.point)sculptHoverAt(SCULPT.point);});
listen($('canvas'), 'pointerleave',()=>{if(!SCULPT.stroke){clearTimer(SCULPT.hoverTimer);SCULPT.point=null;SCULPT.hover=null;renderOverlay();}});
listen($('canvas'), 'lostpointercapture',()=>{if(SCULPT.stroke)sculptCancelStroke();});
listen(document, 'click',e=>{
 const frame=e.target.closest('[data-sculpt-frame]');if(frame){sculptStopPlayback();journeyScrub(+frame.dataset.sculptFrame);return;}
 const b=e.target.closest('[data-sculpt]');if(!b)return;
 const k=b.dataset.sculpt;
 if(k==='fit-path')journeyFitPath();if(k==='close-journey')closeJourney();if(k==='close-brush'){brushDeactivate();setTool('select');}
 if(k==='start')journeyScrub(0);if(k==='end')journeyScrub(JOURNEY.data.frames.length-1);
 if(k==='next')journeyScrub(JOURNEY.index+1);if(k==='prev')journeyScrub(JOURNEY.index-1);
 if(k==='play')journeyPlay();if(k==='bookmark')journeyBookmark();if(k==='keep')journeyKeep();if(k==='keep-brush')journeyKeep({brush:true});
 if(k==='timeline-from-here'){brushDeactivate();void openJourney();}if(k==='reopen-last')reopenJourney();if(k==='clear-holds')sculptClearHolds();if(k==='reference-now'){SCULPT.reference=clone(D.layout.nodes);SCULPT.referenceLabel='Current arrangement';renderBrushDock();}
});
listen(window, 'resize',()=>{if(SCULPT.active&&SCULPT.client){SCULPT.point=screenToWorld(SCULPT.client.x,SCULPT.client.y);renderOverlay();}});
sculptRestoreArchive();

function journeyFitPath(){
 const data=JOURNEY?.data;if(!data)return;
 const all=data.frames.flatMap(f=>Object.values(f.nodes));const b=rectUnion(all,40),w=$('stage').clientWidth,h=$('stage').clientHeight-$('journey-deck').offsetHeight-42,k=clamp(Math.min(w/b.w,h/b.h),.08,1.2);
 D.camera={x:(w-b.w*k)/2-b.x*k,y:(h-b.h*k)/2-b.y*k,k};applyCamera();renderOverlay();persist();
}
function reopenJourney(){
 if(!JOURNEY_ARCHIVE||JOURNEY_ARCHIVE.baseline.id!==D.id){toast('No recorded path for this diagram yet. Open Timeline first.');return;}
 const data=clone(JOURNEY_ARCHIVE),compatible=JSON.stringify(data.baseline.graph)===JSON.stringify(D.graph)&&Object.keys(D.layout.nodes).every(id=>data.frames[0].nodes[id]&&data.frames.some(f=>['w','h','pinned'].every(key=>f.nodes[id][key]===D.layout.nodes[id][key])));
 if(!compatible){toast('Objects, connections, sizes or pins changed. Record a new timeline; the brush can still restore matching nodes from its bookmark.');return;}
 if(JOURNEY)closeJourney();brushDeactivate();closePopover();if(S.layoutBusy)cancelLayout();
 const index=data.frames.reduce((best,f,i)=>{const score=Object.keys(f.nodes).reduce((n,id)=>n+Math.hypot(f.nodes[id].x-D.layout.nodes[id].x,f.nodes[id].y-D.layout.nodes[id].y),0);return score<best.score?{score,index:i}:best;},{score:Infinity,index:0}).index;
 JOURNEY={signature:sculptSignature(D),baseline:clone(D),opts:{...data.settings,scope:'all'},busy:false,index,peek:null,ghost:'next',job:++journeyJob,data};S.sculptRoutePrior=clone(data.routePrior||[]);
 $('stage').classList.add('has-journey');sculptLockControls(true);renderJourneyDeck();journeyScrub(index);$('journey-slider').focus({preventScroll:true});
}
function sculptValidateJourney(input){
 if(input?.kind!=='diagram-studio-journey')throw Error('Not a Diagram Studio timeline.');
 if(input.schemaVersion!==1||!Array.isArray(input.frames)||input.frames.length<1||input.frames.length>128)throw Error('Invalid timeline checkpoint collection.');
 const baseline=normalize(input.baseline),ids=Object.keys(baseline.layout.nodes),objects=new Map([...baseline.graph.nodes,...baseline.graph.groups].map(n=>[n.id,n]));
 const pinned=id=>{let item=objects.get(id);while(item){if(baseline.layout.nodes[item.id]?.pinned)return true;item=objects.get(item.parentId);}return false;};
 for(const frame of input.frames){
  if(!frame.metrics||Object.values(frame.metrics).some(v=>!Number.isFinite(v))||typeof frame.phase!=='string'||!Number.isFinite(frame.iteration))throw Error('Invalid timeline metrics.');
  if(!frame.nodes||Object.keys(frame.nodes).length!==ids.length)throw Error('Timeline frames must contain the same objects as their baseline.');
  for(const id of ids){const p=frame.nodes[id],original=baseline.layout.nodes[id];if(!p||!['x','y','w','h'].every(k=>Number.isFinite(p[k]))||p.w<=0||p.h<=0||p.pinned!==original.pinned)throw Error('Invalid timeline coordinates or pins: '+id);if(pinned(id)&&['x','y','w','h'].some(k=>p[k]!==original[k]))throw Error('A timeline cannot move a pinned object: '+id);}
 }
 if(!input.report||!Number.isFinite(input.report.iterations)||!['settled','objective plateau','iteration limit','bounded pass'].includes(input.report.termination)||!Array.isArray(input.bookmarks))throw Error('The timeline is missing its report or bookmarks.');
 const data=clone(input);data.baseline=baseline;const checked=LayoutLab.settings(input.settings);data.settings=Object.fromEntries(Object.keys(LayoutLab.defaults).map(key=>[key,checked[key]]));data.bookmarks=data.bookmarks.filter(b=>Number.isInteger(b.index)&&b.index>=0&&b.index<data.frames.length).map(b=>({index:b.index,title:String(b.title||'Bookmark')}));
 return data;
}
function sculptImportJourney(input){
 const data=sculptValidateJourney(input),baseline=data.baseline;
 if(JOURNEY)closeJourney();setDocument(baseline,{label:'Open saved layout timeline'});sculptArchive(data);SCULPT.reference=clone(data.frames[0].nodes);SCULPT.referenceLabel='Before imported layout';reopenJourney();return clone(baseline);
}

function sculptRememberHolds(before,geometryChanged,beforeData){
 const after=[...SCULPT.holds];if(JSON.stringify([...before].sort())===JSON.stringify([...after].sort()))return;
 if(!geometryChanged){S.undo.push({data:beforeData,label:'Local layout holds'});if(S.undo.length>80)S.undo.shift();S.redo=[];S.revision++;}
 S.undo.at(-1).sculpt={before:[...before],after};
}
function sculptHistory(entry,direction){
 if(entry.sculpt){SCULPT.holds=new Set(direction==='undo'?entry.sculpt.before:entry.sculpt.after);renderBrushDock();}
}

function sculptLockControls(locked){
 const controls=document.querySelectorAll('#algorithm-quick,#document-title,.toolbelt [data-tool],#inspector input,#inspector select,#inspector textarea');
 for(const control of controls){
  if(locked){if(control.dataset.sculptWasDisabled===undefined)control.dataset.sculptWasDisabled=String(control.disabled);control.disabled=true;}
  else if(control.dataset.sculptWasDisabled!==undefined){control.disabled=control.dataset.sculptWasDisabled==='true';delete control.dataset.sculptWasDisabled;}
 }
}

Object.assign(controllers.sculpt, { sculptCheckDocument, sculptFixedIds, sculptInteracting, sculptSignature, sculptRender, sculptQueueRender, sculptSetGeometry, sculptStopPlayback, sculptDiagnostics, sculptArchive, sculptExportJourney, sculptRestoreArchive, journeyCompute, openJourney, closeJourney, renderJourneyDeck, journeyUpdateChrome, journeyScrub, journeyBookmark, journeyKeep, journeyPlay, brushActivate, brushDeactivate, renderBrushDock, sculptDabOptions, sculptHoverAt, brushStart, sculptStrokeDab, sculptPointerDown, sculptPointerMove, sculptPointerUp, sculptCancelStroke, brushApplyAt, sculptClearHolds, sculptBeforeEdit, sculptUndo, sculptToolChange, sculptBlur, sculptBeforeUnload, sculptOverlay, sculptAction, sculptKey, journeyFitPath, reopenJourney, sculptValidateJourney, sculptImportJourney, sculptRememberHolds, sculptHistory, sculptLockControls });

controllers.sculpt.isJourneyOpen = () => !!JOURNEY;
controllers.sculpt.hasActiveStroke = () => !!SCULPT.stroke;

registerDispose(() => { sculptStopPlayback(); sculptCancelStroke(); clearTimer(SCULPT.hoverTimer); if (SCULPT.raf) cancelAnimationFrame(SCULPT.raf); if (JOURNEY) closeJourney(); brushDeactivate(); });
