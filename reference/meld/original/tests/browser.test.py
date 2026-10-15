#!/usr/bin/env python3
"""Browser integration tests. Requires Python Playwright and a Chromium installation.
Set CHROMIUM_PATH to override /usr/bin/chromium. No external sites are contacted.
The test document is injected with set_content because this build environment's
managed Chromium blocks file:// navigation. Native file opening is not claimed tested.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, time, traceback, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'meld-diagram-lab.html').read_text()
RESULTS=[]
with sync_playwright() as p:
    exe=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')
    kwargs={'headless':True}
    if Path(exe).exists():kwargs['executable_path']=exe
    browser=p.chromium.launch(**kwargs)
    page=browser.new_page(viewport={'width':1600,'height':1000},accept_downloads=True)
    errors=[]; network=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url))
    page.set_content(HTML)
    page.wait_for_function('window.MeldLab && MeldLab.getState().valid')
    def evaluate(code,*args):return page.evaluate(code,*args)
    def reset(name='commerce'):
        evaluate('(name)=>MeldLab.setSource(MELD_EXAMPLES[name],"explore")',name)
        evaluate('MeldLab.select(null)')
    def check(name, fn):
        t=time.perf_counter()
        try:
            fn()
            RESULTS.append({'name':name,'passed':True,'ms':round((time.perf_counter()-t)*1000,1)})
            print('PASS',name)
        except Exception as e:
            RESULTS.append({'name':name,'passed':False,'error':str(e)})
            print('FAIL',name,str(e));traceback.print_exc()
    def eq(actual,expected):assert actual==expected,(actual,expected)
    check('Application starts with no errors',lambda:eq(evaluate('MeldLab.getState().valid'),True))
    check('No external requests on startup',lambda:eq(network,[]))
    check('Initial diagram contains 12 visible objects',lambda:eq(page.locator('#artboard [data-node]').count(),12))
    def views():
        reset();page.select_option('#view-select','card')
        eq(evaluate('MeldLab.getState().scene.view.mode'),'static')
        eq(page.locator('#artboard [data-node]').count(),3)
        assert page.locator('#zoom-in').is_disabled()
        assert evaluate('MeldLab.getState().scene.fit.scale*12 >= 11')
        page.screenshot(path=str(ROOT/'preview-card.png'),full_page=True)
        page.select_option('#view-select','brief');assert page.locator('#artboard [data-node]').count()>3
        page.select_option('#view-select','explore');eq(page.locator('#artboard [data-node]').count(),12)
    check('Named views change disclosure, modality and viewport',views)
    def collapse():
        reset();page.locator('#artboard [data-collapse="commerce"]').click()
        assert evaluate('MeldLab.getState().scene.collapsed.includes("commerce")')
        assert 'collapse=commerce' in evaluate('MeldLab.getState().source')
        page.locator('#artboard [data-collapse="commerce"]').click()
        assert not evaluate('MeldLab.getState().scene.collapsed.includes("commerce")')
    check('Collapse/expand writes view state into DSL',collapse)
    def pointer_drag():
        reset()
        loc=page.locator('#artboard [data-node="payments"] > rect').first
        b=loc.bounding_box();x=b['x']+b['width']/2;y=b['y']+b['height']/2
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+28,y+70,steps=10);page.mouse.up()
        hints=evaluate('MeldLab.getState().model.hints.filter(h=>h.id==="payments"&&h.view==="explore")')
        assert len(hints)==1,hints
        assert hints[0]['type'] in ('near','nudge'),hints
        eq(evaluate('MeldLab.getState().valid'),True)
    check('Real pointer drag round-trips a relative hint',pointer_drag)
    def pin_drag():
        reset();evaluate('MeldLab.select("payments")');page.select_option('#drag-mode','pin')
        assert evaluate('MeldLab.dragTo("payments",270,90)')
        h=evaluate('MeldLab.getState().model.hints.find(h=>h.type==="pin"&&h.id==="payments")')
        eq(h['x'],270);eq(h['y'],90)
        n=evaluate('MeldLab.getState().scene.nodes.find(n=>n.id==="payments")')
        eq(n['localX'],270);eq(n['localY'],90)
    check('Pin drag persists exact parent-local coordinates',pin_drag)
    def offset_drag():
        reset();evaluate('MeldLab.select("payments")');page.select_option('#drag-mode','offset')
        assert evaluate('MeldLab.dragTo("payments",232,36)')
        h=evaluate('MeldLab.getState().model.hints.find(h=>h.type==="nudge"&&h.id==="payments")')
        eq(h['dy'],36);before=evaluate('MeldLab.getState().scene.geometryKey')
        page.click('#render-btn');eq(evaluate('MeldLab.getState().scene.geometryKey'),before)
    check('Soft offset does not accumulate on rerender',offset_drag)
    def layout():
        reset();evaluate('MeldLab.select("workers")');page.select_option('#layout-algorithm','column')
        assert evaluate('MeldLab.getState().model.layouts.some(l=>l.scope==="workers"&&l.algorithm==="column"&&l.view==="explore")')
        ns=evaluate('MeldLab.getState().scene.nodes.filter(n=>n.parent==="workers")')
        eq(ns[0]['localX'],ns[1]['localX'])
        assert ns[0]['localY']!=ns[1]['localY']
    check('Container-specific layout changes write a view-local recipe',layout)
    def add():
        reset();evaluate('MeldLab.select("workers")');page.click('#add-btn')
        eq(evaluate('MeldLab.getState().model.nodes.find(n=>n.id==="component_1").parent'),'workers')
        assert evaluate('MeldLab.getState().model.hints.some(h=>h.type==="stay")')
        assert evaluate('MeldLab.getState().model.edges.some(e=>e.target==="component_1")')
        eq(evaluate('MeldLab.verify().equal'),True)
    check('Incremental add captures explicit stays and adds an edge',add)
    def reflow():
        reset();evaluate('MeldLab.select("workers"); MeldLab.dragTo("payments",240,30,"offset"); MeldLab.select("workers")')
        page.click('#reflow-btn')
        assert not evaluate('MeldLab.getState().model.hints.some(h=>h.id==="payments"&&h.type==="nudge"&&h.view==="explore")')
        assert evaluate('MeldLab.getState().model.hints.some(h=>h.type==="stay"&&h.id==="storage")')
    check('Local reflow removes local soft hints and records outside stays',reflow)
    def checkpoint():
        reset();g=evaluate('Meld.geometry(MeldLab.getState().scene)');page.click('#checkpoint-btn')
        eq(evaluate('MeldLab.getState().scene.checkpoint'),'replayed')
        eq(evaluate('Meld.geometry(MeldLab.getState().scene)'),g)
        source=evaluate('MeldLab.getState().source');page.click('#checkpoint-btn');eq(evaluate('MeldLab.getState().source'),source)
        page.click('#add-btn');eq(evaluate('MeldLab.getState().scene.checkpoint'),'stale')
    check('Exact checkpoint round-trip and invalidation',checkpoint)
    def viewport():
        reset();page.fill('#vp-width','640');page.fill('#vp-height','480');page.click('#size-apply')
        eq(evaluate('MeldLab.getState().scene.view.width'),640)
        assert 'width=640 height=480' in evaluate('MeldLab.getState().source')
        page.select_option('#viewport-mode','static');assert page.locator('#zoom-in').is_disabled()
    check('Viewport and modality edits are persisted source',viewport)
    def invalid():
        reset();before=evaluate('MeldLab.getState().scene.geometryKey')
        page.locator('#editor').fill('node a "A"\nedge bad a -> nonexistent')
        page.wait_for_timeout(550)
        assert page.locator('#errorbar').is_visible();assert page.locator('#add-btn').is_disabled()
        eq(evaluate('MeldLab.getState().scene.geometryKey'),before)
        reset();assert not page.locator('#errorbar').is_visible()
    check('Invalid edits retain last-good diagram and block mutations',invalid)
    def undo_redo():
        reset();before=evaluate('MeldLab.getState().source');page.click('#add-btn');after=evaluate('MeldLab.getState().source')
        assert before!=after;page.click('#undo-btn');eq(evaluate('MeldLab.getState().source'),before)
        page.click('#redo-btn');eq(evaluate('MeldLab.getState().source'),after)
    check('Undo/redo restores source authority',undo_redo)
    def rename():
        reset();order=evaluate('MeldLab.getState().model.nodes.map(n=>n.id)');evaluate('MeldLab.select("api")');page.fill('#node-label','Public API');page.locator('#node-label').press('Tab')
        eq(evaluate('MeldLab.getState().model.nodes.find(n=>n.id==="api").label'),'Public API')
        assert evaluate('MeldLab.getState().model.edges.some(e=>e.target==="api")')
        eq(evaluate('MeldLab.getState().model.nodes.map(n=>n.id)'),order)
    check('Rename preserves stable references',rename)
    def verify():
        reset();page.click('#verify-btn');eq(page.locator('#check-result').inner_text(),'20 / 20 identical')
    check('Verify compares complete geometry for 20 fresh compiles',verify)
    def svg():
        reset();text=evaluate('MeldLab.exportSVG()');root=ET.fromstring(text)
        eq(root.attrib['width'],'1100');eq(root.attrib['height'],'720')
        assert '<metadata>' in text
        assert '<script' not in text and '<foreignObject' not in text
        (ROOT/'examples'/'commerce-explore.svg').write_text(text)
        with page.expect_download() as info:page.click('#svg-export')
        d=info.value;assert d.suggested_filename.endswith('.svg')
        d.save_as(str(ROOT/'tests'/'downloaded.svg'))
    check('SVG export is standalone, parseable and downloadable',svg)
    def source_download():
        reset()
        with page.expect_download() as info:page.click('#dsl-export')
        d=info.value;d.save_as(str(ROOT/'tests'/'downloaded.meld'))
        eq((ROOT/'tests'/'downloaded.meld').read_text(),evaluate('MeldLab.getState().source'))
    check('DSL export contains current source verbatim',source_download)
    def project_import():
        reset();page.click('#add-btn');source=evaluate('MeldLab.getState().source')
        with page.expect_download() as info:page.click('#project-export')
        d=info.value;target=ROOT/'tests'/'downloaded.meld.json';d.save_as(str(target))
        reset('pipeline');page.locator('#file-input').set_input_files(str(target))
        page.wait_for_timeout(100);eq(evaluate('MeldLab.getState().source'),source)
    check('Project export/import round-trips source and history',project_import)
    def fresh_browser():
        reset();evaluate('MeldLab.dragTo("payments",250,60,"relative")');source=evaluate('MeldLab.getState().source');expected=evaluate('Meld.geometry(MeldLab.getState().scene)')
        second=browser.new_page();second.set_content(HTML);second.evaluate('(s)=>MeldLab.setSource(s)',source)
        eq(second.evaluate('Meld.geometry(MeldLab.getState().scene)'),expected);second.close()
    check('Fresh browser context reproduces an edited diagram from DSL alone',fresh_browser)
    def escaping():
        source='diagram "<img src=x onerror=alert(1)>"\nnode x "<script>alert(1)</script>"\nview explore "Escaping" width=640 height=400'
        assert evaluate('(s)=>MeldLab.setSource(s)',source)
        eq(page.locator('#artboard script').count(),0);eq(page.locator('#artboard img').count(),0)
        text=evaluate('MeldLab.exportSVG()');ET.fromstring(text);assert '&lt;script&gt;' in text
    check('User text is escaped in UI and SVG; DSL has no execution primitive',escaping)
    def mobile():
        reset();page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
        eq(evaluate('document.documentElement.scrollWidth<=window.innerWidth'),True)
        eq(evaluate('MeldLab.getState().valid'),True)
        page.screenshot(path=str(ROOT/'preview-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1600,'height':1000})
    check('Narrow browser layout has no horizontal page overflow',mobile)
    def screenshot():
        reset();evaluate('MeldLab.getState().dragMode="relative"; MeldLab.select(null); document.getElementById("toast").classList.remove("show")');page.wait_for_timeout(250);page.screenshot(path=str(ROOT/'preview.png'),full_page=True)
        page.select_option('#view-select','card');(ROOT/'examples'/'commerce-card.svg').write_text(evaluate('MeldLab.exportSVG()'))
        page.screenshot(path=str(ROOT/'preview-card.png'),full_page=True)
        page.select_option('#view-select','explore')
    check('Final example screenshots and static SVG artifacts',screenshot)
    def cross_runtime():
        golden=json.loads((ROOT/'tests'/'golden-geometry.json').read_text())
        for key,expected in golden.items():
            name,view=key.split(':')
            actual=evaluate('(args)=>Meld.geometry(Meld.compile(MELD_EXAMPLES[args[0]],args[1]))',[name,view])
            eq(actual,expected)
    check('Browser and Node agree exactly on every example/view geometry',cross_runtime)
    check('No runtime exceptions during integration tests',lambda:eq(errors,[]))
    report={'browser':browser.version,'runtime':'Chromium, document injected with set_content; managed file:// navigation blocked','testScope':'Browser UI and export tested. Native unmanaged file:// opening and other browsers are not verified here.','passed':sum(x['passed'] for x in RESULTS),'failed':sum(not x['passed'] for x in RESULTS),'pageErrors':errors,'networkRequests':network,'tests':RESULTS}
    (ROOT/'tests'/'browser-results.json').write_text(json.dumps(report,indent=2))
    browser.close()
    print(f"\n{report['passed']} passed, {report['failed']} failed.")
    if report['failed']:raise SystemExit(1)
