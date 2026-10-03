"""Exercise the exact built HTML with Chromium. No test adapter changes app code.
Set STUDIO_NATIVE=1 to require file:// navigation on a browser that permits it.
This environment blocks file and loopback navigation, so the default injects
that same HTML into a fresh about:blank page. Native storage is not claimed.
"""
import asyncio, json, os, traceback
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
results=[]
def check(name, condition, detail=None):
 assert condition, name+' '+str(detail or '')
 results.append({'name':name,'status':'passed',**({'detail':detail} if detail else {})})
 print('[browser] PASS',name,flush=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce',accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   if os.environ.get('STUDIO_NATIVE'): await page.goto((ROOT/'diagram-studio.html').as_uri())
   else: await page.set_content((ROOT/'diagram-studio.html').read_text(),wait_until='load')
   await page.wait_for_function('window.diagramStudio?.diagnostics().ready')
   check('Boots in Edit, not Pan',await page.evaluate("diagramStudio.diagnostics().tool==='select'"))
   # Real continuous keyboard creation and ordinary undo.
   await page.evaluate('diagramStudio.newDocument()');await page.click('#canvas',position={'x':500,'y':350});await page.keyboard.press('n')
   await page.locator('.inline-edit').fill('Receive');await page.keyboard.press('Tab')
   await page.locator('.inline-edit').fill('Transform');await page.keyboard.press('Tab')
   await page.locator('.inline-edit').fill('Deliver');await page.keyboard.press('Enter')
   d=await page.evaluate('diagramStudio.get()');check('N → title → Tab builds three connected nodes',len(d['graph']['nodes'])==3 and len(d['graph']['edges'])==2)
   await page.keyboard.press('c');await page.keyboard.press('Escape');await page.keyboard.press('Escape');check('Repeated Escape returns to Edit',await page.evaluate("diagramStudio.diagnostics().tool==='select'"))
   await page.evaluate("diagramStudio.loadSample('branches')")
   await page.evaluate("diagramStudio.select('n00')");await page.click('[data-action=toggle-right]')
   before=await page.evaluate('diagramStudio.get().layout.nodes');depth=await page.evaluate('diagramStudio.diagnostics().undoDepth')
   await page.click('#inspector [data-action=mark-start]')
   await page.select_option('#inspector [data-field="intent.start"]','left-center')
   check('Start preference controls do not move or pin the shape',await page.evaluate('diagramStudio.get().layout.nodes')==before and await page.evaluate("diagramStudio.get().layout.intent.start.placement==='left-center'"))
   await page.evaluate("diagramStudio.select('n13')");await page.click('#inspector [data-action=mark-end]')
   check('One start and one end persist as layout intent',await page.evaluate("diagramStudio.get().layout.intent.start.id==='n00'&&diagramStudio.get().layout.intent.end.id==='n13'"))
   await page.evaluate('diagramStudio.undo()');check('Intent edit is undoable',await page.evaluate('!diagramStudio.get().layout.intent.end'))
   await page.evaluate('diagramStudio.redo()');check('Intent edit is redoable',await page.evaluate("diagramStudio.get().layout.intent.end.id==='n13'"))
   await page.screenshot(path=str(ROOT/'previews'/'studio-inspectors.png'))
   await page.evaluate("diagramStudio.select('n13')");await page.keyboard.press('Delete')
   check('Deleting an endpoint clears its preference',await page.evaluate('!diagramStudio.get().layout.intent.end'))
   await page.evaluate('diagramStudio.undo()');check('Undo deletion restores its preference',await page.evaluate("diagramStudio.get().layout.intent.end.id==='n13'"))
   valid=await page.evaluate('JSON.stringify(diagramStudio.get())')
   invalid=await page.evaluate("(()=>{const d=diagramStudio.get();d.layout.intent={start:{id:'missing',placement:'top-left'}};try{diagramStudio.set(d);return false}catch{return true}})()")
   check('Invalid preference references reject without data loss',invalid and await page.evaluate('JSON.stringify(diagramStudio.get())')==valid)
   # Existing editing interaction regression: selected objects, pan, resize.
   await page.evaluate("diagramStudio.loadSample('automatic-ports');diagramStudio.select(['request','new'])")
   old=await page.evaluate('diagramStudio.get()');loc=page.locator('#world [data-node=request] .node-shape');r=await loc.bounding_box()
   await page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);await page.mouse.down();await page.mouse.move(r['x']+r['width']/2+30,r['y']+r['height']/2+20,steps=8);await page.mouse.up()
   d=await page.evaluate('diagramStudio.get()');check('Multi-selection moves both shapes, not the camera',d['layout']['nodes']['request']['x']!=old['layout']['nodes']['request']['x'] and d['layout']['nodes']['new']['x']!=old['layout']['nodes']['new']['x'] and d['camera']==old['camera'])
   old=d;await page.keyboard.down('Space');await page.mouse.move(500,170);await page.mouse.down();await page.mouse.move(545,195,steps=5);await page.mouse.up();await page.keyboard.up('Space')
   d=await page.evaluate('diagramStudio.get()');check('Space-drag pans without moving shapes',d['camera']!=old['camera'] and d['layout']['nodes']==old['layout']['nodes'])
   await page.evaluate("diagramStudio.select('review')");old=await page.evaluate('diagramStudio.get()');r=await page.locator('#world [data-resize=review][data-handle=se]').bounding_box()
   await page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);await page.mouse.down();await page.mouse.move(r['x']+45,r['y']+40,steps=5);await page.mouse.up()
   d=await page.evaluate('diagramStudio.get()');check('Container frame resizes independently of children',d['layout']['nodes']['review']['w']>old['layout']['nodes']['review']['w'] and all(d['layout']['nodes'][n]==old['layout']['nodes'][n] for n in ['check','ready','revise']))
   # Compare all candidates, with the live baseline frozen.
   await page.evaluate("diagramStudio.loadSample('branches')");await page.click('#compare-btn')
   await page.wait_for_function('diagramStudio.explorerState().cells.length===6&&!diagramStudio.explorerState().busy',timeout=120000)
   check('Six candidates compute successfully',await page.evaluate("diagramStudio.explorerState().cells.every(c=>c.status==='ready')"))
   baseline=await page.evaluate('JSON.stringify(diagramStudio.get())');experiment=await page.evaluate('JSON.stringify(diagramStudio.getExperiment().candidates)')
   for w,h in [(1440,900),(1024,768),(1920,1080)]:
    await page.set_viewport_size({'width':w,'height':h});await page.wait_for_timeout(160)
    data=await page.evaluate("(()=>{const grid=document.getElementById('ex-grid'),dialog=document.getElementById('explorer-dialog');return {scroll:grid.scrollHeight>grid.clientHeight+1||dialog.scrollHeight>dialog.clientHeight+1,cards:[...grid.querySelectorAll('.ex-card')].map(c=>{const r=c.getBoundingClientRect(),plot=c.querySelector('.ex-cell-content').getBoundingClientRect();return r.top>=55&&r.bottom<=innerHeight-20&&r.left>=0&&r.right<=innerWidth&&plot.height>50})}})()")
    check(f'All six charts visible, no diagram scroll at {w}×{h}',not data['scroll'] and all(data['cards']),data)
   await page.set_viewport_size({'width':1440,'height':900});await page.wait_for_timeout(100);await page.screenshot(path=str(ROOT/'previews'/'grid-desktop.png'))
   await page.set_viewport_size({'width':1024,'height':768});await page.screenshot(path=str(ROOT/'previews'/'grid-laptop.png'));await page.set_viewport_size({'width':1440,'height':900})
   # Synced camera gesture.
   old=await page.evaluate('diagramStudio.explorerState().shared')
   box=await page.locator('[data-ex-canvas="0"]').bounding_box();await page.mouse.move(box['x']+25,box['y']+30);await page.mouse.down();await page.mouse.move(box['x']+55,box['y']+60,steps=5);await page.mouse.up()
   cams=await page.evaluate('diagramStudio.explorerState().cells.map(c=>c.camera)');check('Grid synchronized pan updates all cameras equally',len({json.dumps(c) for c in cams})==1 and cams[0]!=old)
   # All three navigation modes remain available.
   await page.select_option('#ex-camera-mode','independent');old=await page.evaluate('diagramStudio.explorerState().cells.map(c=>c.camera)')
   await page.mouse.move(box['x']+25,box['y']+30);await page.mouse.down();await page.mouse.move(box['x']+70,box['y']+45,steps=5);await page.mouse.up();cams=await page.evaluate('diagramStudio.explorerState().cells.map(c=>c.camera)')
   check('Independent pan changes only the operated chart',cams[0]!=old[0] and cams[1:]==old[1:])
   await page.select_option('#ex-camera-mode','focus');await page.evaluate("diagramStudio.anchorComparison('n04')")
   check('Focus navigation centers corresponding objects',await page.evaluate("(()=>{const s=diagramStudio.explorerState();return s.cells.every((c,i)=>Math.abs(c.camera.cx-s.anchorCenters[i].x)<1e-6&&Math.abs(c.camera.cy-s.anchorCenters[i].y)<1e-6)})()"))
   await page.click('[data-ex-view=overlay]');await page.wait_for_timeout(100)
   check('Overlay switches without recomputing or mutating candidates',await page.evaluate('JSON.stringify(diagramStudio.getExperiment().candidates)')==experiment)
   # Actual pointer click on the emphasized layer, not an API substitute.
   await page.evaluate("diagramStudio.anchorComparison('n00')");await page.click('.ex-overlay-layer.ex-layer-active [data-node=n04] .node-shape')
   check('Clicking an overlay shape changes the common anchor',await page.evaluate("diagramStudio.explorerState().focusId==='n04'"))
   aligned=await page.evaluate("(()=>{return [...document.querySelectorAll('.ex-overlay-layer')].map(layer=>{const n=layer.querySelector('[data-node=n04]');const r=diagramStudio.get().layout.nodes.n04;const m=n.getScreenCTM(),p=new DOMPoint(r.w/2,r.h/2).matrixTransform(m);return [p.x,p.y]})})()")
   check('Every overlay anchor coincides within a pixel',max(p[0] for p in aligned)-min(p[0] for p in aligned)<.01 and max(p[1] for p in aligned)-min(p[1] for p in aligned)<.01)
   # Shift emphasis and opacity without invoking layout again.
   await page.click('[data-ex-layer-active="2"]');check('Layer emphasis switches labels and default opacity',await page.evaluate("document.querySelector('.ex-layer-active').dataset.overlayLayer==='2'&&Number(getComputedStyle(document.querySelector('.ex-layer-active')).opacity)===.85"))
   await page.locator('[data-ex-opacity="2"]').fill('50');await page.locator('[data-ex-opacity="2"]').dispatch_event('change')
   check('Opacity control changes only rendering',await page.evaluate("getComputedStyle(document.querySelector('[data-overlay-layer=\"2\"]')).opacity==='0.5'") and await page.evaluate('JSON.stringify(diagramStudio.getExperiment().candidates)')==experiment)
   await page.uncheck('[data-ex-layer-visible="4"]');check('Layer visibility toggle removes that overlay layer',await page.locator('[data-overlay-layer="4"]').count()==0)
   await page.check('[data-ex-layer-visible="4"]')
   # Per-node keyboard activation in the overlay.
   await page.locator('.ex-layer-active [data-node=n07]').focus();await page.keyboard.press('Enter');check('Keyboard Enter chooses an overlay anchor and preserves focus',await page.evaluate("diagramStudio.explorerState().focusId==='n07'&&document.activeElement.dataset.node==='n07'"))
   svg=await page.evaluate('diagramStudio.exportSheet()');check('Overlay SVG serializes without XML errors','overlay' in svg and await page.evaluate('(s)=>!new DOMParser().parseFromString(s,"image/svg+xml").querySelector("parsererror")',svg))
   (ROOT/'previews'/'overlay.svg').write_text(svg)
   await page.evaluate("diagramStudio.anchorComparison('n00')")
   await page.locator('[data-ex-opacity="2"]').fill('85')
   await page.locator('.ex-main-bar [data-ex-action=fit]').click();await page.screenshot(path=str(ROOT/'previews'/'overlay-desktop.png'))
   check('All comparison navigation leaves the editor untouched',await page.evaluate('JSON.stringify(diagramStudio.get())')==baseline)
   # Candidate-owned intent, no hidden persistent edits from overlays.
   await page.click('[data-ex-view=grid]');await page.evaluate("diagramStudio.anchorComparison('n00')")
   await page.locator('#ex-intent summary').click();await page.click('[data-ex-intent=start]:not([data-clear])');await page.select_option('[data-ex-placement=start]','top-left')
   result=await page.evaluate("diagramStudio.generateComparison({kind:'algorithms',algorithms:['tree','flow','stress'],maxIterations:320})")
   check('Intent travels to every regenerated candidate',result['ready']==3 and await page.evaluate("diagramStudio.getExperiment().candidates.every(c=>c.document.layout.intent.start.id==='n00')") and await page.evaluate('JSON.stringify(diagramStudio.get())')==baseline)
   winner=await page.evaluate('diagramStudio.getExperiment().candidates[1]');depth=await page.evaluate('diagramStudio.diagnostics().undoDepth')
   await page.click('[data-ex-cell="1"] [data-ex-action=apply]')
   check('Apply keeps exact candidate geometry and authored intent',await page.evaluate('diagramStudio.get().layout.nodes')==winner['document']['layout']['nodes'] and await page.evaluate('diagramStudio.get().layout.intent')==winner['document']['layout']['intent'])
   actual=await page.evaluate('diagramStudio.diagnostics().routes');check('Apply keeps the routes displayed in the candidate',all(next(x for x in actual if x['id']==r['id'])['points']==r['points'] for r in winner['routing']['routes']))
   check('Apply is one undo transaction',await page.evaluate('diagramStudio.diagnostics().undoDepth')==depth+1)
   await page.evaluate('diagramStudio.undo()');check('One undo restores the comparison baseline',await page.evaluate('JSON.stringify(diagramStudio.get())')==baseline)
   # Route experiment: same frames, same coordinates, independent parameters.
   await page.evaluate("diagramStudio.compare('routing')");await page.wait_for_function('!diagramStudio.explorerState().busy',timeout=120000)
   ex=await page.evaluate('diagramStudio.getExperiment()');check('Routing candidates keep node geometry identical',len(ex['candidates'])==6 and all(c['document']['layout']['nodes']==ex['baseline']['layout']['nodes'] for c in ex['candidates']))
   await page.screenshot(path=str(ROOT/'previews'/'routing-grid.png'))
   await page.click('[data-ex-view=overlay]');await page.screenshot(path=str(ROOT/'previews'/'routing-overlay.png'))
   # Cancellation and stale apply guard.
   await page.evaluate("(()=>{const d=diagramStudio.get();d.title='A newer edit';diagramStudio.set(d);})()")
   check('Stale candidate refuses to overwrite newer work',not await page.evaluate('diagramStudio.applyCandidate(0)'))
   await page.evaluate('diagramStudio.closeComparison()');check('Close keeps newer work and returns to Edit',await page.evaluate("diagramStudio.get().title==='A newer edit'&&diagramStudio.diagnostics().tool==='select'"))
   # A real two-axis layout parameter grid retains its row/column structure.
   await page.evaluate("diagramStudio.compare('layout')");await page.wait_for_function('!diagramStudio.explorerState().busy',timeout=120000)
   result=await page.evaluate("diagramStudio.generateComparison({kind:'parameters',algorithm:'layered',axisA:'nodeGap',valuesA:'12,24,48',axisB:'direction',valuesB:'RIGHT,DOWN',maxIterations:320})")
   check('Two-axis parameter grid generates six ready candidates',result['ready']==6)
   check('Parameter grid uses three columns and two rows without scrolling',await page.evaluate("(()=>{const g=document.getElementById('ex-grid');return g.style.getPropertyValue('--ex-cols')==='3'&&g.style.getPropertyValue('--ex-rows')==='2'&&g.scrollHeight<=g.clientHeight+1})()"))
   await page.screenshot(path=str(ROOT/'previews'/'layout-parameter-grid.png'))
   await page.evaluate('diagramStudio.closeComparison()')
   await page.evaluate("diagramStudio.loadSample('centered-branches')");await page.screenshot(path=str(ROOT/'previews'/'centered-branches.png'))
   await page.evaluate("diagramStudio.loadSample('guided-process')");await page.screenshot(path=str(ROOT/'previews'/'guided-feedback.png'))
   check('No uncaught browser errors',not errors,errors)
  except Exception as e:
   await page.screenshot(path=str(ROOT/'verification'/'failure.png'));results.append({'name':'run halted','status':'failed','error':str(e),'trace':traceback.format_exc(),'pageErrors':errors});raise
  finally:
   (ROOT/'verification'/'browser-results.json').write_text(json.dumps({'browser':browser.version,'mode':'native-file' if os.environ.get('STUDIO_NATIVE') else 'exact HTML injected','results':results,'pageErrors':errors},indent=2));await browser.close()
asyncio.run(main())
