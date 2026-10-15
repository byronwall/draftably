#!/usr/bin/env python3
"""Generate a self-contained research HTML from the Markdown report.
Requires mistune only for rebuilding the report, not for running the app.
"""
from pathlib import Path
import re, html, json
import mistune
ROOT=Path(__file__).resolve().parent
sources=[
('Mermaid: layout engines','https://mermaid.js.org/config/layouts.html'),
('Mermaid: flowchart syntax, subgraphs and collapse','https://mermaid.js.org/syntax/flowchart.html'),
('D2: layout engine comparison','https://d2lang.com/tour/layouts/'),
('D2: positions','https://d2lang.com/tour/positions/'),
('D2: grid diagrams','https://d2lang.com/tour/grid-diagrams/'),
('D2: Oracle / API','https://d2lang.com/tour/api/'),
('D2 author announcement: TALA is open-source, September 7, 2026','https://d2lang.com/blog/tala-is-open-source/'),
('D2 blog: nonprofit transition, September 5, 2026','https://d2lang.com/blog/'),
('Reladraw repository and README','https://github.com/reladraw/reladraw'),
('Reladraw syntax reference','https://raw.githubusercontent.com/reladraw/reladraw/main/SYNTAX.md'),
('Reladraw: Hacker News discussion','https://news.ycombinator.com/item?id=49858513'),
('Structurizr: DSL and compiled JSON file types','https://docs.structurizr.com/workspaces/file-types'),
('LikeC4: model-based views','https://likec4.dev/dsl/views/'),
('LikeC4: Draw.io round-trip integration','https://likec4.dev/tooling/drawio/'),
('LikeC4: CLI and layout-drift validation','https://likec4.dev/tooling/cli/'),
('ELK: layered layout reference','https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html'),
('elkjs: JavaScript layout library, limitations and Worker integration','https://github.com/kieler/elkjs'),
('ELK: randomSeed option','https://eclipse.dev/elk/reference/options/org-eclipse-elk-randomSeed.html'),
('WebCoLa: constraint-based graph layout','https://ialab.it.monash.edu/webcola/'),
('yFiles: Partial Layout demonstration and description','https://www.yfiles.com/demos/layout/partial/'),
('Graphviz: dot layout and controls','https://graphviz.org/docs/layouts/dot/'),
('Graphviz: engine-specific pin attribute','https://graphviz.org/docs/attrs/pin/'),
('PlantUML: layout engines and controls','https://plantuml.com/layout-engines'),
('Pikchr: documentation and purpose','https://pikchr.org/home/doc/trunk/homepage.md'),
('Bluefish: relations and partial layout specification','https://bluefishjs.org/learn/what-is-bluefish.html'),
('Penrose: Style language and separation of concerns','https://penrose.cs.cmu.edu/docs/ref/style/overview'),
('Penrose: constraints and objectives','https://penrose.cs.cmu.edu/docs/ref/constraints'),
('Badros, Borning and Stuckey: Cassowary constraint solving (paper)','https://constraints.cs.washington.edu/solvers/cassowary-tochi.pdf'),
('Adaptagrams: libavoid routing overview','https://www.adaptagrams.org/documentation/libavoid.html'),
('Penrose: experimental interactivity','https://penrose.cs.cmu.edu/docs/ref/Interactivity'),
]
source_html='\n'.join(f'<p id="ref-{i}"><span class="ref-number">[{i}]</span> <a href="{html.escape(url,quote=True)}" target="_blank" rel="noopener noreferrer">{html.escape(title)}</a></p>' for i,(title,url) in enumerate(sources,1))
md=(ROOT/'research.md').read_text().replace('<!-- SOURCES -->',source_html)
# Persist human-readable Markdown with references as well.
(ROOT/'research.md').write_text(md)
renderer=mistune.create_markdown(escape=False,plugins=['table'])
body=renderer(md)
body=re.sub(r'^<h1>.*?</h1>\s*', '', body, count=1, flags=re.S)
body=re.sub(r'(?<![\w"/-])\[(\d+)\]',lambda m:f'<a class="cite" href="#ref-{m[1]}">[{m[1]}]</a>',body)
# Do not nest a link in the reference number itself.
body=re.sub(r'<span class="ref-number"><a class="cite" href="#ref-(\d+)">\[(\d+)\]</a></span>',r'<span class="ref-number">[\2]</span>',body)
heads=[]
def heading(m):
 level,title=m.group(1),m.group(2);plain=re.sub('<[^>]+>','',title);slug=re.sub('[^a-z0-9]+','-',plain.lower()).strip('-');
 if level=='2':heads.append((slug,plain))
 return f'<h{level} id="{slug}">{title}</h{level}>'
body=re.sub(r'<h([23])>(.*?)</h\1>',heading,body)
toc=''.join(f'<a href="#{s}">{html.escape(t)}</a>' for s,t in heads)
css='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f5f4ef;color:#29342a;font:16px/1.75 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}a{color:#9d4b2e;text-decoration:none}a:hover{text-decoration:underline}header{background:#233026;color:#f9f8ef;padding:50px max(30px,calc((100vw - 1280px)/2));border-bottom:5px solid #b65a37}header .kicker{font-size:12px;text-transform:uppercase;letter-spacing:3px;color:#b9c7af}header h1{font-size:clamp(30px,4vw,52px);line-height:1.12;letter-spacing:-1.8px;font-weight:550;max-width:900px;margin:18px 0}header p{color:#b9c7af;max-width:800px;margin:0}header .links{display:flex;gap:18px;margin-top:22px;font-size:13px}header a{color:#f3d7b4}.layout{max-width:1280px;margin:0 auto;padding:44px 25px;display:grid;grid-template-columns:220px minmax(0,1fr);gap:55px}nav{position:sticky;top:24px;align-self:start;max-height:90vh;overflow:auto}nav .label{font-size:10px;letter-spacing:2px;color:#84917e;font-weight:700;margin-bottom:15px}nav a{display:block;color:#6e7a66;font-size:12px;line-height:1.55;padding:7px 0;border-bottom:1px solid #e2e6db}article{min-width:0}article>h1:first-child{display:none}article>h2:first-of-type{margin-top:0;font-size:21px;color:#6e7a66}h2{font-size:29px;line-height:1.25;font-weight:570;letter-spacing:-.6px;margin:55px 0 20px;padding-top:15px;border-top:1px solid #daddd1;scroll-margin-top:20px}h3{font-size:19px;line-height:1.4;font-weight:630;margin:30px 0 12px;scroll-margin-top:20px}p{margin:0 0 19px}strong{font-weight:650}code{font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;background:#e9ece2;padding:2px 5px;border-radius:3px}pre{background:#243127;color:#dbe8d2;border-radius:9px;padding:24px;overflow:auto;margin:25px 0;font-size:12px}pre code{background:none;color:inherit;padding:0;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12.5px;line-height:1.6;margin:25px 0;display:table}th{text-align:left;background:#dfe6d7;padding:12px;border:1px solid #d4dccb;color:#35452e;font-size:11px;text-transform:uppercase;letter-spacing:.8px}td{padding:13px 12px;border:1px solid #dce1d4;vertical-align:top}tr:nth-child(even){background:#edf0e7}table code{font-size:11px;white-space:normal}td:first-child{min-width:130px}.cite{font:10px ui-monospace,monospace;vertical-align:super;padding-left:1px;white-space:nowrap}.ref-number{color:#8e9b83;font:12px ui-monospace,monospace}p[id^=ref-]{font-size:13px;line-height:1.6;margin:0;padding:9px 0;border-bottom:1px solid #e2e6d9;scroll-margin-top:20px}footer{border-top:1px solid #dce2d2;padding:24px;text-align:center;color:#8a967f;font-size:11px}@media(max-width:950px){.layout{display:block;padding:25px 20px}nav{position:static;display:none}table{font-size:11px}td,th{padding:8px}h2{font-size:24px}header{padding:35px 22px}body{font-size:15px}}@media print{body{background:#fff;color:#000;font-size:10pt}header{background:#fff;color:#000;padding:20px;border-bottom:1px solid #000}header p,header .kicker{color:#555}header .links,nav{display:none}.layout{display:block;max-width:none;padding:10px}h2{page-break-after:avoid;font-size:19pt}h3{page-break-after:avoid}pre,table{page-break-inside:avoid}a{color:inherit}pre{background:#f1f1f1;color:#000}td,th{font-size:9pt}footer{font-size:8pt}}'''
text=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diagrams as intent — research and prototype</title><style>{css}</style></head><body><header><div class="kicker">Meld / research dossier / September 28, 2026</div><h1>Diagrams as intent,<br>not just coordinates.</h1><p>A source-backed authoring model for responsive views, iterative layout, nested groups, and repeatable output.</p><div class="links"><a href="meld-diagram-lab.html">Open the prototype ↗</a><a href="README.md">Prototype notes</a><a href="DSL.md">Language reference</a></div></header><div class="layout"><nav><div class="label">IN THIS REPORT</div>{toc}</nav><article>{body}</article></div><footer>Original analysis and prototype. Primary sources are linked inline. No third-party layout engine is bundled.</footer></body></html>'''
(ROOT/'research.html').write_text(text)
(ROOT/'research-sources.json').write_text(json.dumps([{'id':i,'title':t,'url':u,'accessed':'2026-09-28'} for i,(t,u) in enumerate(sources,1)],indent=2))
print('Report word count:',len(re.sub('<[^>]+>',' ',md).split()))
print('Research HTML bytes:',len(text.encode()))
