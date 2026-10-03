
/* Diagram Studio 7 — comparison workspace, retaining local layout holds.
 * Does not create saved views or write browser storage. Candidates are read-only
 * snapshots. Only Apply enters the editor's ordinary undoable command path.
 */
let EX=null,exSerial=0;
const exDialog=$('explorer-dialog');
const exDefaultAlgorithms=['compound-flow','layered','flow','tree','stress','force'];
function exConfig(mode='layout'){
 return{fixedIds:typeof sculptFixedIds==='function'?sculptFixedIds():[],intent:clone(D.layout.intent||{}),mode,kind:mode==='routing'?'parameters':'algorithms',algorithm:D.settings.algorithm,algorithms:[...exDefaultAlgorithms],axisA:mode==='routing'?'edgeGap':'nodeGap',valuesA:mode==='routing'?'10,18,28':'12,24,44',axisB:mode==='routing'?'bendPenalty':'direction',valuesB:mode==='routing'?'16,64':'RIGHT,DOWN',run:'rebuild',maxIterations:640,scope:'all',autoPorts:false,selected:[...S.selected],...((layoutScope().scope==='container')?{containerId:layoutScope().containerId}:{}),viewport:{w:$('stage').clientWidth,h:$('stage').clientHeight},priorRoutes:S.lastRoutes.map(r=>({id:r.id,fromSide:r.fromSide,toSide:r.toSide}))};
}
function documentIdentity(doc){const {camera,...meaning}=doc;return JSON.stringify(meaning);}
function openExplorer(mode='layout'){
 if(typeof sculptBeforeEdit==='function')sculptBeforeEdit();
 if(S.preview){toast('Keep or discard the current layout preview before comparing.');return;}
 finishInlineEdit(true);if(S.drag)finishDrag();if(S.layoutBusy)cancelLayout();closePopover();
 labOpen=false;renderLayoutLab();
 if(EX&&exDialog.open){EX.config={...exConfig(mode),priorRoutes:EX.config.priorRoutes};renderExplorerControls();return;}
 EX={baseline:clone(D),signature:documentIdentity(D),config:exConfig(mode),cells:[],presentation:'grid',controlsHidden:false,overlay:{camera:{cx:0,cy:0,k:1},active:0,allLabels:false},cameraMode:'sync',focusId:[...S.selected].find(id=>node(id)||group(id))||D.layout.intent?.start?.id||D.graph.nodes[0]?.id||'',shared:{cx:0,cy:0,k:1},busy:false,job:0,worker:null,reject:null,expanded:null,userCameraMoved:false,returnFocus:document.activeElement,controllers:[]};
 exDialog.showModal();exDialog.classList.toggle('controls-hidden',innerWidth<721);renderExplorerControls();exSetPresentation('grid',false);$('ex-grid').innerHTML='<div class="ex-empty"><strong>One diagram. Several possibilities.</strong><p>Generate six candidates from this exact starting point. Nothing changes in your diagram until you choose Apply.</p><button class="primary" data-ex-action="generate">Generate comparison</button></div>';
 $('ex-generate').focus();
 // One click opens and generates the default six-way sheet. Further parameter
 // changes are deliberately explicit so typing never repeatedly runs a solver.
 void generateExplorer();
}
function cancelExplorer(){
 if(!EX)return;EX.job=++exSerial;EX.worker?.terminate();EX.worker=null;
 if(EX.reject){EX.reject(Error('Comparison cancelled'));EX.reject=null;}
 EX.busy=false;exSetProgress('Cancelled. Completed candidates remain available.');
 $('ex-cancel').hidden=true;$('ex-generate').disabled=false;
}
function closeExplorer(){
 if(!EX)return;const focus=EX.returnFocus;cancelExplorer();EX.controllers.forEach(c=>c.abort());EX.overlayController?.abort();exDialog.close();EX=null;setTool('select');
 if(focus?.isConnected&&!focus.closest('#explorer-dialog'))focus.focus({preventScroll:true});
}
function exOption(value,label,selected){return `<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`;}
function exField(label,inner){return `<label class="ex-field"><span>${label}</span>${inner}</label>`;}
function renderExplorerControls(){
 if(!EX)return;const c=EX.config,route=c.mode==='routing';
 $('ex-title').textContent=route?'Compare ports & routes':'Compare layouts';
 $('ex-source').textContent=EX.baseline.title;
 $('ex-tabs').innerHTML=`<button data-ex-mode="layout" aria-pressed="${!route}">Layouts</button><button data-ex-mode="routing" aria-pressed="${route}">Ports & routes</button>`;
 const defs=route?ExplorerLab.routeParams:ExplorerLab.effectiveParams(c.algorithm,c.run);
 if(!defs[c.axisA]){c.axisA=Object.keys(defs)[0];c.valuesA=defs[c.axisA].values.join(',');}
 if(c.axisB&&!defs[c.axisB]){c.axisB='';c.valuesB='';}
 const selectAxis=(id,axis,none=false)=>`<select id="${id}">${none?exOption('','No second parameter',axis):''}${Object.entries(defs).map(([k,p])=>exOption(k,p.name,axis)).join('')}</select>`;
 let html='<div class="ex-config-top">';
 if(!route){
  html+=exField('Compare',`<select id="ex-kind">${exOption('algorithms','Different approaches',c.kind)}${exOption('parameters','Parameter grid',c.kind)}</select>`);
  if(c.kind==='parameters')html+=exField('Approach',`<select id="ex-algorithm">${LayoutLab.algorithms.map(a=>exOption(a.id,a.name,c.algorithm)).join('')}</select>`);
  html+=exField('Starting point',`<select id="ex-run">${exOption('rebuild','Rebuild & settle',c.run)}${exOption('warm','Current positions → settle',c.run)}${exOption('pass','One bounded pass',c.run)}</select>`);
 }else html+='<p class="ex-rule"><strong>Same nodes, different paths.</strong><br>Zoom in or switch to Overlay to compare individual connections.</p><label class="checkbox"><input id="ex-auto" type="checkbox" '+(c.autoPorts?'checked':'')+'>Release fixed port sides</label>';
 html+='</div>';
 if(!route&&c.kind==='algorithms'){
  html+=`<details class="ex-control-section" ${EX.cells.length?'':'open'}><summary>Approaches · ${c.algorithms.length} selected</summary><div class="ex-algorithms" role="group" aria-label="Approaches to compare">${LayoutLab.algorithms.map(a=>`<label title="${esc(a.short)}"><input type="checkbox" data-ex-algorithm="${a.id}" ${c.algorithms.includes(a.id)?'checked':''}><span>${a.name}</span></label>`).join('')}</div></details>`;
 }else html+=`<div class="ex-axes">${exField('Columns · parameter',selectAxis('ex-axis-a',c.axisA))}${exField('Column values',`<input id="ex-values-a" value="${esc(c.valuesA)}" aria-label="Column values">`)}${exField('Rows · parameter',selectAxis('ex-axis-b',c.axisB,true))}${exField('Row values',`<input id="ex-values-b" value="${esc(c.valuesB)}" aria-label="Row values" ${c.axisB?'':'disabled'}>`)}</div>`;
 if(!route)html+=`<details class="ex-control-section"><summary>Scope & effort</summary><div class="stack" style="margin-top:10px">${exField('Scope',`<select id="ex-scope">${exOption('all','Whole diagram',c.scope)}${exOption('selection','Selected siblings',c.scope)}${exOption('container','Selected container',c.scope)}</select>`)}${c.run!=='pass'?exField('Maximum solver effort',`<select id="ex-effort">${[320,640,1200].map(n=>exOption(n,n+' steps / solve',c.maxIterations)).join('')}</select>`):''}</div><p class="note">Stops on stability, a plateau, or this limit. Not a global optimum.</p></details>`;
 html+=`<div class="ex-generate-actions"><button class="primary" id="ex-generate" data-ex-action="generate" ${EX.busy?'disabled':''}>${EX.cells.length?'Regenerate':'Generate'} ${route?'routes':'layouts'}</button><button id="ex-cancel" data-ex-action="cancel" ${EX.busy?'':'hidden'}>Stop</button></div>`;
 $('ex-config').innerHTML=html;
 $('ex-camera-controls').innerHTML=`${exField('Grid navigation',`<select id="ex-camera-mode" ${EX.presentation==='overlay'?'disabled':''}>${exOption('sync','Synced · same world position',EX.cameraMode)}${exOption('focus','Same clicked object',EX.cameraMode)}${exOption('independent','Independent cameras',EX.cameraMode)}</select>`)}<div class="ex-camera-buttons"><button data-ex-action="fit">Fit all</button><button data-ex-action="actual">100%</button></div>`;
 exRenderIntent();exRenderLayerControls();exUpdateFocusNote();
}

function exReadConfig(){
 const c={...EX.config};
 const value=(id,fallback)=>$(id)?.value??fallback;
 c.kind=value('ex-kind',c.kind);c.algorithm=value('ex-algorithm',c.algorithm);c.run=value('ex-run',c.run);c.scope=value('ex-scope',c.scope);c.maxIterations=Number(value('ex-effort',c.maxIterations));
 if(c.kind==='algorithms'&&c.mode==='layout')c.algorithms=[...exDialog.querySelectorAll('[data-ex-algorithm]:checked')].map(el=>el.dataset.exAlgorithm);
 c.axisA=value('ex-axis-a',c.axisA);c.axisB=value('ex-axis-b',c.axisB);c.valuesA=value('ex-values-a',c.valuesA);c.valuesB=value('ex-values-b',c.valuesB);c.autoPorts=$('ex-auto')?.checked??c.autoPorts;return c;
}
function exSetProgress(text,error=false){$('ex-progress').textContent=text;$('ex-progress').classList.toggle('error-text',error);}
function exWorkerCandidate(baseline,spec,config,owner){
 let worker;
 try{
  const source=['layout-engine','routing-engine','explorer-engine'].map(id=>$(id).textContent).join('\n')+`\nself.onmessage=async e=>{try{const result=await ExplorerLab.candidate(e.data.baseline,e.data.spec,e.data.config);self.postMessage({ok:true,result});}catch(error){self.postMessage({ok:false,message:error.message});}};`;
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);
 }catch(error){console.warn('[compare] Worker unavailable; using local engine',error);return ExplorerLab.candidate(baseline,spec,config);}
 owner.worker=worker;
 return new Promise((resolve,reject)=>{
  owner.reject=reject;
  const timer=setTimeout(()=>{cleanup();reject(Error('Candidate exceeded 30 seconds. Try a smaller diagram or lower effort.'));},30000);
  const cleanup=()=>{clearTimeout(timer);worker.terminate();if(owner.worker===worker)owner.worker=null;if(owner.reject===reject)owner.reject=null;};
  worker.onmessage=e=>{cleanup();if(e.data.ok)resolve(e.data.result);else reject(Error(e.data.message));};
  worker.onerror=e=>{e.preventDefault();cleanup();console.warn('[compare] Worker blocked; local fallback',e.message);ExplorerLab.candidate(baseline,spec,config).then(resolve,reject);};
  worker.postMessage({baseline,spec,config});
 });
}
async function generateExplorer(override){
 if(!EX)return;cancelExplorer();const owner=EX;
 let config=override?{...owner.config,...override}:exReadConfig(),specs;
 try{
  specs=ExplorerLab.specs(config);
  if(owner.baseline.graph.nodes.length>160||owner.baseline.graph.edges.length>360)throw Error('Comparison is limited to 160 shapes / 360 edges. Use a smaller working diagram for the grid.');
  if(config.scope==='selection'&&!config.selected.length)throw Error('No objects were selected when this explorer opened.');
  if(config.scope==='container'&&!config.containerId)throw Error('Select one container before opening the explorer.');
 }catch(error){exSetProgress(error.message,true);return{status:'error',message:error.message};}
 owner.config=config;owner.generatedConfig=clone(config);owner.busy=true;owner.job=++exSerial;const job=owner.job;
 owner.controllers.forEach(c=>c.abort());owner.controllers=[];owner.cells=specs.map((spec,i)=>({spec,status:'pending',camera:{cx:0,cy:0,k:1},layer:{visible:true,opacity:i===0?.85:.30}}));owner.expanded=null;owner.userCameraMoved=false;owner.overlay.active=0;
 renderExplorerControls();$('ex-grid').classList.remove('expanded');$('ex-grid').innerHTML=owner.cells.map((cell,i)=>exCardShell(cell,i)).join('');exArrangeGrid();exRenderOverlay();
 const started=performance.now();console.info('[compare] start',{candidates:specs.length,mode:config.mode,start:config.run});
 for(let i=0;i<specs.length;i++){
  if(EX!==owner||job!==owner.job)return{status:'cancelled'};
  exSetProgress(`Computing ${i+1} of ${specs.length} · ${specs[i].title}`);
  try{
   const result=await exWorkerCandidate(clone(owner.baseline),specs[i],config,owner);
   if(EX!==owner||job!==owner.job)return{status:'cancelled'};
   const cell=owner.cells[i];Object.assign(cell,result,{status:'ready'});cell.scene=captureCandidateScene(result);renderExplorerCell(i);if(owner.presentation==='grid')exFitCell(i);exRenderOverlay();exRenderLayerControls();
  }catch(error){
   if(EX!==owner||job!==owner.job)return{status:'cancelled'};
   owner.cells[i].status='error';owner.cells[i].error=error.message;renderExplorerCell(i);console.warn('[compare] candidate failed',specs[i].key,error.message);
  }
 }
 if(EX!==owner||job!==owner.job)return{status:'cancelled'};
 owner.busy=false;$('ex-cancel').hidden=true;$('ex-generate').disabled=false;
 const good=owner.cells.filter(c=>c.status==='ready').length;
 exSetProgress(`${good} of ${specs.length} ready · ${((performance.now()-started)/1000).toFixed(1)} s · original diagram unchanged`);
 exArrangeGrid();if(!owner.userCameraMoved)exFitAll();
 console.info('[compare] complete',{ready:good,total:specs.length});return{status:'complete',ready:good,total:specs.length};
}
function exCardShell(cell,i){return `<article class="ex-card" data-ex-cell="${i}" aria-label="Candidate ${i+1}"><header><div><span class="ex-index">${String(i+1).padStart(2,'0')}</span><strong>${esc(cell.spec.title)}</strong><p>${esc(cell.spec.subtitle)}</p></div><button class="ghost small" data-ex-action="expand" data-ex-index="${i}" aria-label="Enlarge candidate ${i+1}">Enlarge</button></header><div class="ex-cell-content"><div class="ex-pending">Queued</div></div><footer><span>Waiting for computation</span><button disabled>Apply</button></footer></article>`;}
function captureCandidateScene(result){
 // Reuse the editor's exact node, label, icon, group and edge renderers.
 // This scoped binding swap has no DOM write, persistence, undo or async work.
 const saveD=D,saveS=S;
 try{
  D=result.document;S={...saveS,selected:new Set(),drag:null,animationNodes:null,connectFrom:null,preview:null};
  const vg=visibleGraph(),rects=new Map([...vg.nodes,...vg.groups].map(n=>[n.id,group(n.id)?groupRect(n.id):geometryNode(n.id)]));
  const obs=vg.nodes.map(n=>rects.get(n.id));for(const g of vg.groups){const r=rects.get(g.id);obs.push(D.collapsed.includes(g.id)?r:{x:r.x,y:r.y,w:r.w,h:32});}
  const labels=[],byEdge=new Map(vg.edges.map(e=>[e.id,e]));
  const routes=result.routing.routes.map(r=>{const e=byEdge.get(r.id),cfg=D.layout.edges[r.id]||{},label=e.label?labelPosition(e.label,r.points,obs,labels):null;if(label){label.x+=cfg.labelDx||0;label.y+=cfg.labelDy||0;labels.push({x:label.x-label.w/2,y:label.y-label.h/2,w:label.w,h:label.h});}return{...r,edge:e,label,path:routePath(r.points)};});
  const boxes=[...rects.values(),...vg.nodes.map(n=>visualNodeBounds(n,geometryNode(n.id))),...labels,...routes.flatMap(r=>r.points.map(p=>({...p,w:0,h:0})))];
  const markup=vg.groups.sort((a,b)=>ancestors(a.id).length-ancestors(b.id).length).map(g=>renderGroup(g,vg,rects)).join('')+renderEdges(routes,vg)+vg.nodes.map(n=>renderNode(n,vg)).join('');
  return{markup,bounds:rectUnion(boxes),rects:Object.fromEntries(rects)};
 }finally{D=saveD;S=saveS;}
}
function exUniqueIds(markup,prefix){return markup.replace(/\bid="([^"]+)"/g,(_,id)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}${id})`);}
function renderExplorerCell(i){
 const cell=EX.cells[i],card=exDialog.querySelector(`[data-ex-cell="${i}"]`),body=card.querySelector('.ex-cell-content'),footer=card.querySelector('footer');
 if(cell.status==='error'){body.innerHTML=`<div class="ex-pending error-text">${esc(cell.error)}</div>`;footer.innerHTML='<span>Not applied</span>';return;}
 if(cell.status!=='ready')return;
 const report=cell.report,r=cell.routing.report;
 body.innerHTML=`<svg class="ex-canvas" data-ex-canvas="${i}" tabindex="0" role="application" aria-label="Candidate ${i+1}. Drag or use arrow keys to pan. Plus and minus zoom. Home fits."><g data-ex-world>${exUniqueIds(cell.scene.markup,'ex'+i+'-')}</g></svg><span class="ex-scale" data-ex-scale="${i}"></span>`;
 // Candidate nodes can take focus to choose an anchor, but cannot be edited.
 body.querySelectorAll('[tabindex]:not(.ex-canvas)').forEach(el=>el.removeAttribute('tabindex'));
 body.querySelectorAll('[role=button]').forEach(el=>el.removeAttribute('role'));
 body.querySelectorAll('[data-node]').forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label','Use '+(EX.baseline.graph.nodes.find(n=>n.id===el.dataset.node)?.title||el.dataset.node)+' as visual anchor');});
 const stopped=report?(EX.generatedConfig?.run==='pass'?'Bounded pass':report.termination):'Reroute only';
 const detail=[`${r.crossings} crossing${r.crossings===1?'':'s'}`,`${r.lanePairs} close lane pair${r.lanePairs===1?'':'s'}`,`${r.bends} bends`,...(report?[`${report.after.overlaps} overlaps`,`${report.backwardEdges} backward`,`${report.after.aspect}:1`]:[])];
 footer.innerHTML=`<div><strong class="${r.blocked||r.lanePairs?'ex-warn':''}">${esc(stopped)}${r.blocked?' · '+r.blocked+' blocked':''}</strong><p>${detail.join(' · ')}</p></div><button class="primary" data-ex-action="apply" data-ex-index="${i}">Apply</button>`;
 const warnings=[...(report?.warnings||[]),...(r.lanePairs?[`The requested ${r.requestedEdgeGap}px lane gap is not fully feasible in this result. ${r.lanePairs} parallel segment pairs remain too close.`]:[])];
 if(warnings.length){const el=document.createElement('details');el.className='ex-warnings';el.innerHTML=`<summary>${warnings.length} constraint note${warnings.length===1?'':'s'}</summary>${warnings.map(w=>`<p>${esc(w)}</p>`).join('')}`;card.appendChild(el);}
 exBindCanvas(body.querySelector('svg'),i);exUpdateFocusNote();
}
function exViewRect(i){const el=exDialog.querySelector(`[data-ex-canvas="${i}"]`);return el?.getBoundingClientRect();}
function exNodeCenter(i){const cell=EX.cells[i],id=EX.focusId,by=new Map([...EX.baseline.graph.nodes,...EX.baseline.graph.groups].map(n=>[n.id,n]));let p=id;while(p&&!cell.scene?.rects[p])p=by.get(p)?.parentId;const r=cell.scene?.rects[p];return r?center(r):center(cell.scene?.bounds||{x:0,y:0,w:1,h:1});}
function exEffectiveCamera(i){
 if(i===-1)return EX.overlay.camera;
 if(EX.cameraMode==='independent')return EX.cells[i].camera;
 if(EX.cameraMode==='sync')return EX.shared;
 const c=exNodeCenter(i);return{cx:c.x+EX.shared.cx,cy:c.y+EX.shared.cy,k:EX.shared.k};
}
function exApplyCameras(){
 if(!EX)return;
 EX.cells.forEach((c,i)=>{if(c.status!=='ready')return;const el=exDialog.querySelector(`[data-ex-canvas="${i}"]`),r=el?.getBoundingClientRect();if(!r?.width)return;const cam=exEffectiveCamera(i);el.querySelector('[data-ex-world]').setAttribute('transform',`translate(${r.width/2-cam.cx*cam.k},${r.height/2-cam.cy*cam.k}) scale(${cam.k})`);const scale=exDialog.querySelector(`[data-ex-scale="${i}"]`);if(scale)scale.textContent=Math.round(cam.k*100)+'%';el.querySelectorAll('[data-node],[data-group]').forEach(n=>n.classList.toggle('ex-focused',EX.cameraMode==='focus'&&(n.dataset.node||n.dataset.group)===EX.focusId));});
 exApplyOverlayCamera();
}
function exFitCell(i){
 const cell=EX.cells[i];if(cell.status!=='ready')return;const r=exViewRect(i),b=cell.scene.bounds,c=center(b);if(!r?.width||!r?.height)return;
 cell.camera={cx:c.x,cy:c.y,k:clamp(Math.min((r.width-36)/Math.max(1,b.w),(r.height-36)/Math.max(1,b.h)),.015,2)};
 if(EX.cameraMode==='independent')exApplyCameras();else if(EX.cells.filter(c=>c.status==='ready').length===1)exFitAll();else exApplyCameras();
}
function exFitAll(){
 if(!EX)return;if(EX.presentation==='overlay'){exFitOverlay();return;}const ready=EX.cells.map((c,i)=>({c,i})).filter(({c})=>c.status==='ready');if(!ready.length)return;
 ready.forEach(({i})=>{const cell=EX.cells[i],r=exViewRect(i),b=cell.scene.bounds,c=center(b);cell.camera={cx:c.x,cy:c.y,k:clamp(Math.min((r.width-36)/Math.max(1,b.w),(r.height-36)/Math.max(1,b.h)),.015,2)};});
 if(EX.cameraMode==='sync'){
  const bounds=rectUnion(ready.map(({c})=>c.scene.bounds)),c=center(bounds);let k=2;
  ready.forEach(({i})=>{const r=exViewRect(i);k=Math.min(k,(r.width-36)/Math.max(1,bounds.w),(r.height-36)/Math.max(1,bounds.h));});EX.shared={cx:c.x,cy:c.y,k:clamp(k,.015,2)};
 }else if(EX.cameraMode==='focus'){EX.shared={cx:0,cy:0,k:Math.min(...ready.map(({c})=>c.camera.k))*1.8};}
 exApplyCameras();
}
function exSetCamera(i,next){
 const k=clamp(next.k,.015,6);EX.userCameraMoved=true;
 if(i===-1){EX.overlay.camera={...next,k};exApplyCameras();return;}
 if(EX.cameraMode==='independent')EX.cells[i].camera={...next,k};
 else if(EX.cameraMode==='sync')EX.shared={...next,k};
 else{const center=exNodeCenter(i);EX.shared={cx:next.cx-center.x,cy:next.cy-center.y,k};}
 exApplyCameras();
}
function exPan(i,dx,dy){const c=exEffectiveCamera(i);exSetCamera(i,{...c,cx:c.cx-dx/c.k,cy:c.cy-dy/c.k});}
function exZoom(i,factor,x,y){const c=exEffectiveCamera(i),r=exViewRect(i),dx=x-r.left-r.width/2,dy=y-r.top-r.height/2,k=clamp(c.k*factor,.015,6);exSetCamera(i,{cx:c.cx+dx/c.k-dx/k,cy:c.cy+dy/c.k-dy/k,k});}
function exUpdateFocusNote(){
 if(!EX)return;
 const n=[...EX.baseline.graph.nodes,...EX.baseline.graph.groups].find(n=>n.id===EX.focusId),name=n?.title||'none';
 $('ex-anchor-label').textContent='Visual anchor: '+name+' · click a shape to change';
 $('ex-camera-note').textContent=EX.presentation==='overlay'?'All layers share one scale. Clicking aligns that object by translation only; candidate geometry is unchanged.':EX.cameraMode==='focus'?'Click a shape to center the same object in every panel. Drag and zoom stay synchronized.':'Drag / scroll to pan. Pinch to zoom. Click any shape to set the overlay anchor.';
}
function exBindCanvas(svg,i){
 const controller=new AbortController();if(i===-1){EX.overlayController?.abort();EX.overlayController=controller;}else EX.controllers.push(controller);const signal=controller.signal,pointers=new Map();let drag=null,pinch=null,modifier=null;
 const rect=()=>svg.getBoundingClientRect();
 const setupPinch=()=>{const [a,b]=[...pointers.values()];const r=rect(),c=exEffectiveCamera(i),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),camera:{...c},world:{x:c.cx+(mid.x-r.left-r.width/2)/c.k,y:c.cy+(mid.y-r.top-r.height/2)/c.k}};drag=null;};
 svg.addEventListener('pointerdown',e=>{
  if(!EX)return;e.preventDefault();svg.focus({preventScroll:true});try{svg.setPointerCapture(e.pointerId);}catch{}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){setupPinch();return;}drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,target:e.target.closest('[data-node],[data-group]')?.dataset,zoom:e.metaKey||e.ctrlKey};
 },{signal});
 svg.addEventListener('pointermove',e=>{
  if(!EX)return;
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],r=rect(),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},k=clamp(pinch.camera.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,.015,6);exSetCamera(i,{cx:pinch.world.x-(mid.x-r.left-r.width/2)/k,cy:pinch.world.y-(mid.y-r.top-r.height/2)/k,k});return;}
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>3;if(drag.zoom)exZoom(i,Math.exp(-dy*.008),drag.startX,drag.startY);else exPan(i,dx,dy);drag.x=e.clientX;drag.y=e.clientY;return;}
  if(e.metaKey&&!e.buttons){if(modifier)exZoom(i,Math.exp((modifier.y-e.clientY)*.008),modifier.x,modifier.startY);modifier={x:modifier?.x??e.clientX,startY:modifier?.startY??e.clientY,y:e.clientY};}else modifier=null;
 },{signal});
 const end=e=>{pointers.delete(e.pointerId);if(pinch){if(pointers.size<2)pinch=null;drag=null;return;}if(drag&&!drag.moved&&EX&&drag.target)exChooseAnchor(drag.target.node||drag.target.group);drag=null;};
 svg.addEventListener('pointerup',end,{signal});svg.addEventListener('pointercancel',()=>{pointers.clear();drag=null;pinch=null;},{signal});
 svg.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();if(!EX)return;const unit=e.deltaMode===1?16:e.deltaMode===2?rect().height:1;if(e.ctrlKey||e.metaKey)exZoom(i,Math.exp(-clamp(e.deltaY*unit,-300,300)*.007),e.clientX,e.clientY);else exPan(i,-e.deltaX*unit,-e.deltaY*unit);},{signal,passive:false});
 svg.addEventListener('keydown',e=>{
  if(!EX)return;const key=e.key,r=rect();
  const chosen=e.target.closest('[data-node],[data-group]');if(chosen&&['Enter',' '].includes(key)){e.preventDefault();e.stopPropagation();exChooseAnchor(chosen.dataset.node||chosen.dataset.group);return;}
  if(key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();const d=e.shiftKey?100:30;exPan(i,key==='ArrowLeft'?d:key==='ArrowRight'?-d:0,key==='ArrowUp'?d:key==='ArrowDown'?-d:0);}
  if(['+','=','-'].includes(key)){e.preventDefault();exZoom(i,key==='-'?1/1.2:1.2,r.left+r.width/2,r.top+r.height/2);}
  if(key==='Home'){e.preventDefault();i!==-1&&EX.cameraMode==='independent'?exFitCell(i):exFitAll();}
 },{signal});
}
function applyExplorerCandidate(i){
 if(!EX)return false;const cell=EX.cells[i];if(!cell||cell.status!=='ready')return false;
 if(documentIdentity(D)!==EX.signature){exSetProgress('The editor changed after this snapshot. Close and reopen Compare to avoid overwriting newer edits.',true);return false;}
 const winner=clone(cell.document),routes=clone(cell.routing),label=cell.spec.title,report=cell.report&&clone(cell.report),camera=clone(D.camera);
 closeExplorer();
 change('Apply comparison: '+label,()=>{D=normalize(winner);D.camera=camera;S.selected.clear();S.connectFrom=null;S.tool='select';S.routeCache=null;S.lastRoutes=[];S.pendingRouteResult={fingerprint:routingFingerprint(D),result:routes};S.layoutReport=report;});
 fitView();renderLayoutLab();toast('Applied '+label+' · one undo restores your starting diagram');return true;
}
function explorerDiagnostics(){
 if(!EX)return{open:false};return{open:exDialog.open,presentation:EX.presentation,overlay:clone(EX.overlay),anchorCenters:EX.cells.map((c,i)=>c.status==='ready'?exNodeCenter(i):null),busy:EX.busy,config:clone(EX.config),generatedConfig:clone(EX.generatedConfig||null),cameraMode:EX.cameraMode,focusId:EX.focusId,shared:clone(EX.shared),sourceUnchanged:documentIdentity(D)===EX.signature,cells:EX.cells.map((c,i)=>({status:c.status,title:c.spec.title,patch:clone(c.spec.patch),camera:c.status==='ready'?clone(exEffectiveCamera(i)):null,report:c.report,routing:c.routing?.report,bounds:c.scene?.bounds,error:c.error}))};
}
function exMaterializeSvgGroup(original){
 const copy=original.cloneNode(true),os=[original,...original.querySelectorAll('*')],cs=[copy,...copy.querySelectorAll('*')],props=['fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','fill-opacity','stroke-opacity','opacity','font-family','font-size','font-weight','letter-spacing','text-anchor','dominant-baseline','visibility','display'];
 os.forEach((el,i)=>{const computed=getComputedStyle(el),dest=cs[i];for(const p of props)dest.setAttribute(p,computed.getPropertyValue(p));for(const attr of [...dest.attributes])if(attr.name.startsWith('data-')||['class','style','tabindex','role','aria-pressed'].includes(attr.name))dest.removeAttribute(attr.name);});
 original.querySelectorAll('.port,.selection-ring,.resize-handle,.label-handle,.waypoint,.edge-hit,.group-collapse,.group-header,.position-badge').forEach(el=>cs[os.indexOf(el)]?.remove());copy.removeAttribute('transform');return new XMLSerializer().serializeToString(copy);
}
function exportExplorerSheet(download=true){
 if(!EX)return null;if(EX.presentation==='overlay')return exportExplorerOverlay(download);const ready=EX.cells.map((c,i)=>({c,i})).filter(({c})=>c.status==='ready');if(!ready.length){exSetProgress('Generate a candidate before saving a sheet.',true);return null;}
 const cols=Math.min(3,ready.length),tileW=800,tileH=530,gap=22,margin=28,header=92,w=margin*2+cols*tileW+(cols-1)*gap,h=header+Math.ceil(ready.length/cols)*(tileH+gap)+margin;
 const text=(value,x,y,size=14,weight=400,fill='#626a7e')=>`<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(value)}</text>`;
 let body=`<rect width="${w}" height="${h}" fill="#f4f5f9"/>${text(EX.baseline.title,margin,40,24,700,'#222738')}${text(EX.generatedConfig?.mode==='routing'?'Port & route comparison · identical node positions':'Layout comparison · one starting document',margin,68,15)}`;
 ready.forEach(({c,i},n)=>{const x=margin+(n%cols)*(tileW+gap),y=header+Math.floor(n/cols)*(tileH+gap),b=c.scene.bounds,scene=exDialog.querySelector(`[data-ex-canvas="${i}"] [data-ex-world]`),content=exMaterializeSvgGroup(scene),plotW=tileW-24,plotH=tileH-130;
  // Export complete drawings, not accidental crops left by interactive panning.
  // Each tile is fitted independently and its scale is stated explicitly.
  const k=Math.min((plotW-30)/Math.max(1,b.w),(plotH-30)/Math.max(1,b.h),2),cx=plotW/2-(b.x+b.w/2)*k,cy=plotH/2-(b.y+b.h/2)*k;
  const r=c.routing.report,termination=c.report?.termination||'reroute only';
  body+=`<g transform="translate(${x},${y})"><rect width="${tileW}" height="${tileH}" rx="12" fill="#fff" stroke="#dfe2eb"/>${text((n+1)+'. '+c.spec.title,20,31,18,700,'#222738')}${text(c.spec.subtitle,20,55,13)}<svg x="12" y="70" width="${plotW}" height="${plotH}" overflow="hidden"><rect width="100%" height="100%" fill="${getComputedStyle($('stage')).backgroundColor}"/><g transform="translate(${cx},${cy}) scale(${k})">${content}</g></svg>${text(termination+' · '+r.crossings+' crossings · '+r.lanePairs+' close lane pairs · '+r.bends+' bends',20,tileH-31,13)}${text('Fit independently · '+Math.round(k*100)+'%',20,tileH-12,11)}</g>`;
 });
 const svg=`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${esc(EX.baseline.title)} — comparison sheet</title>${body}</svg>`;
 if(download)downloadBlob(new Blob([svg],{type:'image/svg+xml'}),'diagram-comparison.svg');return svg;
}
function getExplorerExperiment(){
 if(!EX)return null;
 return clone({format:'diagram-studio/experiment',version:1,baseline:EX.baseline,config:EX.generatedConfig||EX.config,cameraMode:EX.cameraMode,focusId:EX.focusId,presentation:EX.presentation,overlay:EX.overlay,layers:EX.cells.map(c=>c.layer),candidates:EX.cells.filter(c=>c.status==='ready').map(c=>({spec:c.spec,document:c.document,report:c.report,routing:c.routing}))});
}
function exportExplorerExperiment(){
 const data=getExplorerExperiment();if(!data)return;
 downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'diagram-experiment.json');
}

// OVERLAY_AND_INTENT_HELPERS
const EX_COLORS=['#5263d6','#d37b28','#188c83','#c64e83','#7f56b5','#5b861f','#3b82b5','#96624d','#267969','#ad5273','#5d6398','#896d21'];
const INTENT_PLACEMENT_LABELS={'top-left':'Top left','left-center':'Left center',center:'Center · branch both ways','top-center':'Top center','top-right':'Top right','right-center':'Right center','bottom-left':'Bottom left','bottom-center':'Bottom center','bottom-right':'Bottom right'};
function exArrangeGrid(){
 if(!EX)return;const count=EX.expanded!==null?1:Math.max(1,EX.cells.length),grid=$('ex-grid'),r=grid.getBoundingClientRect();if(!r.width||!r.height)return;
 let cols=count===1?1:Math.min(count,3);
 if(count<=4)cols=Math.min(count,2);
 if(r.width<660&&count>2)cols=2;
 if(count>9)cols=4;
 const ready=EX.cells.filter(c=>c.status==='ready');
 if(ready.length&&EX.expanded===null){let best=-Infinity;for(let cc=1;cc<=Math.min(count,4);cc++){const rr=Math.ceil(count/cc),w=(r.width-20-(cc-1)*10)/cc-38,h=(r.height-20-(rr-1)*10)/rr-126;if(w<80||h<36)continue;const score=ready.reduce((sum,c)=>sum+Math.min(w/Math.max(1,c.scene.bounds.w),h/Math.max(1,c.scene.bounds.h)),0)/ready.length*(.96+.04*count/(cc*rr));if(score>best){best=score;cols=cc;}}}
 const c=EX.generatedConfig;if(c?.kind==='parameters'&&EX.expanded===null){try{cols=ExplorerLab.parseValues(c.axisA,c.valuesA,c.mode).length;}catch{}}
 grid.style.setProperty('--ex-cols',cols);grid.style.setProperty('--ex-rows',Math.ceil(count/cols));
}
function exSetPresentation(mode,fit=true){
 if(!EX)return;EX.presentation=mode==='overlay'?'overlay':'grid';
 $('ex-grid').hidden=EX.presentation!=='grid';$('ex-overlay-stage').hidden=EX.presentation!=='overlay';
 exDialog.querySelectorAll('[data-ex-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.exView===EX.presentation)));
 if($('ex-camera-mode'))$('ex-camera-mode').disabled=EX.presentation==='overlay';
 const layers=$('ex-layer-controls');if(EX.presentation==='overlay')$('ex-config').before(layers);else $('ex-camera-controls').closest('section').after(layers);
 exRenderOverlay();exRenderLayerControls();exUpdateFocusNote();
 requestAnimationFrame(()=>{exArrangeGrid();if(fit)exFitAll();else exApplyCameras();});
}
function exChooseAnchor(id){
 if(!EX||![...EX.baseline.graph.nodes,...EX.baseline.graph.groups].some(n=>n.id===id))return;
 const restoreFocus=EX.presentation==='overlay'&&Boolean(document.activeElement?.closest('.ex-overlay-layer'));
 EX.focusId=id;if(EX.cameraMode==='focus'){EX.shared.cx=0;EX.shared.cy=0;}EX.overlay.camera.cx=0;EX.overlay.camera.cy=0;
 // A translation-only display change: no recomputation, candidate mutation,
 // worker job, storage write, or undo transaction.
 exRenderOverlay();exApplyCameras();exRenderIntent();exUpdateFocusNote();
 if(restoreFocus){const target=[...$('ex-overlay-stage').querySelectorAll('.ex-layer-active [data-node]')].find(n=>n.dataset.node===id);target?.focus({preventScroll:true});}
}
function exRenderIntent(){
 if(!EX)return;const c=EX.config,route=c.mode==='routing',intent=c.intent||{},find=id=>EX.baseline.graph.nodes.find(n=>n.id===id);
 $('ex-intent').hidden=route;if(route)return;
 const roleRow=role=>{const hint=intent[role],n=find(hint?.id);return `<div class="ex-intent-row"><div class="row"><span class="intent-role">${role==='start'?'Start':'End'}</span><strong class="grow">${esc(n?.title||'Not specified')}</strong>${n?`<button class="ghost" data-ex-intent="${role}" data-clear="true" aria-label="Clear ${role}">×</button>`:''}</div>${n?`<select data-ex-placement="${role}" aria-label="${role} placement">${Object.entries(INTENT_PLACEMENT_LABELS).filter(([k])=>role==='start'||k!=='center').map(([k,v])=>exOption(k,v,hint.placement)).join('')}</select>`:''}<button data-ex-intent="${role}" ${find(EX.focusId)?'':'disabled'}>Use clicked shape as ${role}</button></div>`;};
 const old=$('ex-intent').querySelector('details')?.open;
 $('ex-intent').innerHTML=`<details class="ex-control-section" ${old||intent.start||intent.end?'open':''}><summary>Drawing intent ${intent.start||intent.end?'· set':''}</summary><p class="note">Optional placement preferences, not pins. Applied only with the chosen candidate.</p>${roleRow('start')}${roleRow('end')}</details>`;
}
function exSetIntent(role,clear=false){
 if(!EX||!['start','end'].includes(role))return;EX.config=exReadConfig();EX.config.intent||={};
 if(clear)delete EX.config.intent[role];else{
  if(!EX.baseline.graph.nodes.some(n=>n.id===EX.focusId))return;
  const other=role==='start'?'end':'start';if(EX.config.intent[other]?.id===EX.focusId)delete EX.config.intent[other];
  EX.config.intent[role]={id:EX.focusId,placement:role==='start'?'top-left':'bottom-right'};
 }
 exRenderIntent();exSetProgress('Drawing intent changed. Generate to compare it; existing candidates have not changed.');
}
function exRenderLayerControls(){
 if(!EX)return;const el=$('ex-layer-controls');el.hidden=EX.presentation!=='overlay';if(el.hidden)return;
 const ready=EX.cells.map((c,i)=>({c,i})).filter(({c})=>c.status==='ready');
 el.innerHTML=`<section class="ex-control-section"><h3>Overlay layers</h3><p class="note">Click a name to emphasize that layer. Its labels are shown; other layers show geometry.</p>${ready.map(({c,i})=>`<div class="ex-layer-row ${i===EX.overlay.active?'is-active':''}" style="--layer-color:${EX_COLORS[i%EX_COLORS.length]}"><input type="checkbox" data-ex-layer-visible="${i}" ${c.layer.visible?'checked':''} aria-label="Show ${esc(c.spec.title)}"><button class="ex-layer-name" data-ex-layer-active="${i}" aria-pressed="${i===EX.overlay.active}" title="Emphasize ${esc(c.spec.title)}"><span class="ex-color-dot"></span><span>${i+1}. ${esc(c.spec.title)}</span></button><output id="ex-alpha-${i}">${Math.round(c.layer.opacity*100)}%</output><input type="range" min="5" max="100" step="5" value="${Math.round(c.layer.opacity*100)}" data-ex-opacity="${i}" aria-label="${esc(c.spec.title)} opacity"></div>`).join('')}<label class="checkbox" style="margin-top:10px"><input id="ex-all-labels" type="checkbox" ${EX.overlay.allLabels?'checked':''}>Show labels in every layer</label><button class="primary ex-apply-overlay" data-ex-action="apply" data-ex-index="${EX.overlay.active}" ${EX.cells[EX.overlay.active]?.status==='ready'?'':'disabled'}>Apply emphasized candidate</button><p class="note">Overlay alignment is visual only. Apply keeps the candidate’s original coordinates.</p></section>`;
}
function exRenderOverlay(){
 if(!EX)return;const svg=$('ex-overlay-stage').querySelector('svg'),world=svg.querySelector('[data-ex-world]');
 const ready=EX.cells.map((c,i)=>({c,i})).filter(({c})=>c.status==='ready'&&c.layer.visible);
 // Put the emphasized layer last for predictable hit-testing and readable text.
 ready.sort((a,b)=>Number(a.i===EX.overlay.active)-Number(b.i===EX.overlay.active));
 world.innerHTML=ready.map(({c,i})=>{const anchor=exNodeCenter(i),color=EX_COLORS[i%EX_COLORS.length];return `<g class="ex-overlay-layer ${i===EX.overlay.active?'ex-layer-active':''}" data-overlay-layer="${i}" style="--layer-color:${color};opacity:${c.layer.opacity}" transform="translate(${-anchor.x},${-anchor.y})">${exUniqueIds(c.scene.markup,'ov'+i+'-')}</g>`;}).join('');
 svg.classList.toggle('all-labels',EX.overlay.allLabels);
 svg.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));
 svg.querySelectorAll('[data-node]').forEach(n=>{
  const id=n.dataset.node,active=Number(n.closest('[data-overlay-layer]').dataset.overlayLayer)===EX.overlay.active;
  n.classList.toggle('ex-focused',id===EX.focusId);n.setAttribute('role','button');n.setAttribute('aria-label','Align on '+(EX.baseline.graph.nodes.find(x=>x.id===id)?.title||id));if(active)n.setAttribute('tabindex','0');
 });
 $('ex-overlay-stage').querySelector('.ex-overlay-empty').hidden=ready.length>0;
 if(!EX.overlayBound){EX.overlayBound=true;exBindCanvas(svg,-1);}
 exApplyOverlayCamera();
}
function exApplyOverlayCamera(){
 if(!EX||EX.presentation!=='overlay')return;const svg=$('ex-overlay-stage').querySelector('svg'),r=svg.getBoundingClientRect(),cam=EX.overlay.camera;if(!r.width)return;
 svg.querySelector('[data-ex-world]').setAttribute('transform',`translate(${r.width/2-cam.cx*cam.k},${r.height/2-cam.cy*cam.k}) scale(${cam.k})`);
 $('ex-overlay-stage').querySelector('.ex-scale').textContent=Math.round(cam.k*100)+'% · shared scale';
}
function exFitOverlay(){
 if(!EX)return;const rects=EX.cells.flatMap((c,i)=>{if(c.status!=='ready'||!c.layer.visible)return[];const a=exNodeCenter(i);return[{...c.scene.bounds,x:c.scene.bounds.x-a.x,y:c.scene.bounds.y-a.y}];});if(!rects.length)return;
 const b=rectUnion(rects),r=exViewRect(-1),c=center(b),k=clamp(Math.min((r.width-56)/b.w,(r.height-56)/b.h),.015,2);EX.overlay.camera={cx:c.x,cy:c.y,k};exApplyOverlayCamera();
}
function exportExplorerOverlay(download=true){
 if(!EX)return null;const ready=EX.cells.map((c,i)=>({c,i})).filter(({c})=>c.status==='ready'&&c.layer.visible);if(!ready.length)return null;
 const b=rectUnion(ready.map(({c,i})=>{const a=exNodeCenter(i);return{...c.scene.bounds,x:c.scene.bounds.x-a.x,y:c.scene.bounds.y-a.y};})),w=1440,h=1000,pad=36,head=100,foot=40+Math.ceil(ready.length/3)*18,k=Math.min((w-2*pad)/b.w,(h-head-foot)/b.h,2);
 const content=ready.map(({c,i})=>{const el=exDialog.querySelector(`[data-overlay-layer="${i}"]`),a=exNodeCenter(i);if(!el)return'';return `<g transform="translate(${-a.x},${-a.y})">${exMaterializeSvgGroup(el)}</g>`;}).join('');
 const label=EX.baseline.graph.nodes.find(n=>n.id===EX.focusId)?.title||EX.focusId;
 const legend=ready.map(({c,i},n)=>`<text x="${pad+(n%3)*450}" y="${h-45+Math.floor(n/3)*18}" font-family="Arial" font-size="12" fill="${EX_COLORS[i%EX_COLORS.length]}">${esc(c.spec.title)} · ${Math.round(c.layer.opacity*100)}%</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${D.theme==='dark'?'#191c27':'#fbfbfd'}"/><text x="36" y="38" font-family="Arial" font-size="24" fill="${D.theme==='dark'?'#e8eaf3':'#222738'}">${esc(EX.baseline.title)} · overlay</text><text x="36" y="66" font-family="Arial" font-size="14" fill="#697185">Aligned on ${esc(label)} · translation only · common scale ${Math.round(k*100)}%</text><g transform="translate(${pad-b.x*k},${head-b.y*k}) scale(${k})">${content}</g>${legend}</svg>`;
 if(download)downloadBlob(new Blob([svg],{type:'image/svg+xml'}),'diagram-overlay.svg');return svg;
}
exDialog.addEventListener('input',e=>{
 if(!EX||e.target.dataset.exOpacity===undefined)return;const i=Number(e.target.dataset.exOpacity),opacity=clamp(Number(e.target.value)/100,.05,1);EX.cells[i].layer.opacity=opacity;EX.cells[i].layer.adjusted=true;$('ex-alpha-'+i).value=Math.round(opacity*100)+'%';
 const layer=exDialog.querySelector(`[data-overlay-layer="${i}"]`);if(layer)layer.style.opacity=opacity;
});
exDialog.addEventListener('cancel',e=>{e.preventDefault();closeExplorer();});
exDialog.addEventListener('click',e=>{
 if(!EX)return;e.stopPropagation();
 const view=e.target.closest('[data-ex-view]');if(view){exSetPresentation(view.dataset.exView);return;}
 const layer=e.target.closest('[data-ex-layer-active]');if(layer){const previous=EX.cells[EX.overlay.active];if(previous&&!previous.layer.adjusted)previous.layer.opacity=.30;EX.overlay.active=Number(layer.dataset.exLayerActive);EX.cells[EX.overlay.active].layer.visible=true;if(!EX.cells[EX.overlay.active].layer.adjusted)EX.cells[EX.overlay.active].layer.opacity=.85;exRenderOverlay();exRenderLayerControls();return;}
 const intentButton=e.target.closest('[data-ex-intent]');if(intentButton){exSetIntent(intentButton.dataset.exIntent,intentButton.dataset.clear==='true');return;}
 const toggle=e.target.closest('[data-ex-action=toggle-controls]');if(toggle){exDialog.classList.toggle('controls-hidden');requestAnimationFrame(()=>{exArrangeGrid();exFitAll();});return;}
 const mode=e.target.closest('[data-ex-mode]');
 if(mode){cancelExplorer();EX.config={...exConfig(mode.dataset.exMode),intent:clone(EX.config.intent||{}),priorRoutes:EX.config.priorRoutes};renderExplorerControls();exSetProgress('Choose parameters, then Generate. Existing panels are from the previous experiment.');return;}
 const button=e.target.closest('[data-ex-action]');if(!button)return;const name=button.dataset.exAction,i=Number(button.dataset.exIndex);
 if(name==='close')closeExplorer();else if(name==='generate')void generateExplorer();else if(name==='cancel')cancelExplorer();else if(name==='apply')applyExplorerCandidate(i);else if(name==='fit')exFitAll();else if(name==='actual'){EX.shared.k=1;EX.overlay.camera.k=1;EX.cells.forEach(c=>c.camera.k=1);exApplyCameras();}else if(name==='export-svg')exportExplorerSheet();else if(name==='export-json')exportExplorerExperiment();else if(name==='expand'){
  EX.expanded=EX.expanded===i?null:i;$('ex-grid').classList.toggle('expanded',EX.expanded!==null);exDialog.querySelectorAll('.ex-card').forEach((c,j)=>{c.hidden=EX.expanded!==null&&i!==j;c.querySelector('[data-ex-action=expand]').textContent=EX.expanded===j?'Back to grid':'Enlarge';});requestAnimationFrame(()=>{exArrangeGrid();exFitAll();});
 }
});
exDialog.addEventListener('change',e=>{
 if(!EX)return;const id=e.target.id;if(e.target.dataset.exOpacity!==undefined)return;
 if(e.target.dataset.exLayerVisible!==undefined){const i=Number(e.target.dataset.exLayerVisible);EX.cells[i].layer.visible=e.target.checked;exRenderOverlay();return;}
 if(id==='ex-all-labels'){EX.overlay.allLabels=e.target.checked;exRenderOverlay();return;}
 if(e.target.dataset.exPlacement){const role=e.target.dataset.exPlacement;EX.config.intent[role].placement=e.target.value;exSetProgress('Drawing intent changed. Generate to preview; the working diagram is untouched.');return;}
 if(id==='ex-camera-mode'){
  const ready=EX.cells.findIndex(c=>c.status==='ready'),old=ready>=0?clone(exEffectiveCamera(ready)):null;
  if(e.target.value==='independent')EX.cells.forEach((c,i)=>{if(c.status==='ready')c.camera=clone(exEffectiveCamera(i));});
  EX.cameraMode=e.target.value;if(EX.cameraMode==='focus'){EX.shared={cx:0,cy:0,k:Math.max(.2,old?.k||.6)};}else if(EX.cameraMode==='sync'&&old)EX.shared=old;
  exUpdateFocusNote();exApplyCameras();return;
 }
 
 EX.config=exReadConfig();
 if(id==='ex-axis-a'){EX.config.valuesA=(EX.config.mode==='routing'?ExplorerLab.routeParams:ExplorerLab.layoutParams)[e.target.value].values.join(',');}
 if(id==='ex-axis-b')EX.config.valuesB=e.target.value?(EX.config.mode==='routing'?ExplorerLab.routeParams:ExplorerLab.layoutParams)[e.target.value].values.join(','):'';
 if(['ex-kind','ex-algorithm','ex-run','ex-axis-a','ex-axis-b'].includes(id))renderExplorerControls();
 if(EX.cells.length)exSetProgress('Settings changed. Generate to replace this sheet; the editor remains untouched.');
});
exDialog.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();e.stopPropagation();void generateExplorer();}});
new ResizeObserver(()=>{if(EX&&exDialog.open){exArrangeGrid();exApplyCameras();}}).observe(exDialog.querySelector('.ex-main'));

