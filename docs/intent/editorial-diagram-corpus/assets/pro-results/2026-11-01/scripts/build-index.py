#!/usr/bin/env python3
"""Build a local reading index for the real study images; this is not a diagram renderer."""
from pathlib import Path
import csv
import html
import json

root = Path(__file__).resolve().parents[1]
esc = html.escape
efforts = {(r['id'], r['stage']): r for r in csv.DictReader((root / 'effort.csv').open())}
cards = []
for p in sorted((root / 'corpus').glob('*/item.json'), key=lambda p: json.loads(p.read_text())['id']):
    d = json.loads(p.read_text())
    v = json.loads((p.parent / 'review.json').read_text())
    folder = p.parent.relative_to(root).as_posix()
    original = next(p.parent.glob('reference.*')).name
    stage = v['stages']['v2']
    effort = efforts[(d['id'], 'v2')]
    tags = ', '.join(d['patterns'])
    search = esc(' '.join([d['id'], d['title'], d['publisher'], tags]).lower(), quote=True)
    links = [('Original', original), ('Attribution', 'source.md'), ('Audit', 'audit.md'),
             ('Full comparison', 'comparison.png'), ('Detail comparison', 'details/comparison.png')]
    links += [(f'{s} source', f'{s}.draft') for s in ('v0','v1','v2')]
    links += [(f'{s} SVG', f'{s}.svg') for s in ('v0','v1','v2')]
    badge = '<span class="held">Confirmation case</span>' if d.get('confirmation_case') else ''
    link_html = ''.join(f'<a href="{folder}/{path}">{label}</a>' for label,path in links)
    cards.append(f'''<article data-search="{search}" data-held="{str(bool(d.get('confirmation_case'))).lower()}">
      <header><div class="eyebrow">{esc(d['id'])} · {esc(d['publisher'])} {badge}</div>
      <h2>{esc(d['title'])}</h2><p class="tags">{esc(tags)}</p></header>
      <a class="picture" href="{folder}/comparison.png"><img loading="lazy" src="{folder}/comparison.png" alt="{esc(d['id'])}: actual reference, frozen default, final native attempt"></a>
      <div class="body"><div class="scores"><span>Quality <b>{stage['quality']}/5</b></span><span>Fidelity <b>{stage['fidelity']}/5</b></span><span>Semantics <b>{stage['semantic']}/5</b></span><span>v2 <b>{effort['non_comment_lines']} lines · {effort['pins']} pins</b></span></div>
      <p><strong>Default readability: {esc(v['v0_readability_vs_reference'])}.</strong> {esc(v.get('reason',''))}</p>
      <p class="residual">{esc(' '.join(v.get('residuals',[])[:2]))}</p>
      <details><summary>Detail view · {esc(json.loads((p.parent/'detail-selection.json').read_text())['focus'])}</summary>
      <a href="{folder}/details/comparison.png"><img loading="lazy" src="{folder}/details/comparison.png" alt="Labeled detail crops for {esc(d['id'])}"></a></details>
      <nav>{link_html}</nav></div></article>''')

page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Draftably · Editorial corpus</title><style>
:root{color-scheme:light;--ink:#172d3b;--muted:#506272;--line:#d9e0e5;--accent:#b6462c}
*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:var(--ink);font:16px/1.6 system-ui,sans-serif}
.mast{padding:44px max(24px,calc((100vw - 1400px)/2));background:var(--ink);color:white}.mast p{max-width:920px;color:#e1e7ec}
h1{font:clamp(30px,4vw,56px)/1.15 Georgia,serif;margin:12px 0 22px}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.mast a{color:white;text-underline-offset:4px;margin-right:20px}.controls{position:sticky;top:0;z-index:2;background:#f5f3eff5;padding:14px max(24px,calc((100vw - 1400px)/2));border-bottom:1px solid var(--line);display:flex;gap:18px;align-items:center;flex-wrap:wrap}
input[type=search]{font:inherit;padding:10px 14px;border:1px solid #9aabb7;border-radius:5px;flex:1;min-width:240px}label{font-size:14px}main{max-width:1448px;margin:auto;padding:24px}
article{background:white;border:1px solid var(--line);border-radius:10px;margin-bottom:32px;overflow:hidden}article header{padding:22px 26px 10px}h2{font:28px/1.25 Georgia,serif;margin:8px 0}.tags{color:var(--muted);font-size:13px;margin:0}
.held{margin-left:10px;color:var(--accent);letter-spacing:0}.picture{display:block;border-block:1px solid var(--line)}img{display:block;width:100%;height:auto}.body{padding:20px 26px}.scores{display:flex;flex-wrap:wrap;gap:12px 26px;font-size:14px}.scores b{margin-left:6px}.residual{color:var(--muted)}
nav{display:flex;gap:10px 18px;flex-wrap:wrap;margin-top:16px;font-size:13px}a{color:#164d78}summary{cursor:pointer;padding:12px 0;font-weight:600;font-size:14px}details{border-top:1px solid var(--line)}[hidden]{display:none!important}.foot{max-width:1400px;margin:20px auto 60px;padding:0 24px;font-size:13px;color:var(--muted)}
@media print{.controls{display:none}.mast{background:white;color:var(--ink);padding:20px}.mast p,.mast a{color:var(--ink)}article{break-inside:avoid}details{display:none}}
</style><body><div class="mast"><div class="eyebrow">Fixed-baseline visual capability study · 2 November 2026</div>
<h1>Thirty editorial diagrams.<br>Ninety native attempts.</h1>
<p>Actual source images, frozen defaults, and bounded refinements. Quality, fidelity, semantics and authoring cost stay separate. Every native image comes from Draftably's unchanged baseline renderer.</p>
<nav><a href="report.md">Main report</a><a href="gap-audit.md">Gap audit</a><a href="implementation-plan.md">Implementation plan</a><a href="effort-audit.md">Effort audit</a><a href="coverage.md">Coverage</a><a href="README.md">Rerun & evidence</a></nav></div>
<div class="controls"><input type="search" id="search" placeholder="Find a case, publisher or pattern" aria-label="Filter corpus"><label><input type="checkbox" id="held"> Confirmation cases only</label><span id="count">30 cases</span></div>
<main>''' + '\n'.join(cards) + '''</main><div class="foot">This index reads local study assets and needs no network. Original third-party images retain their recorded attribution and permission status. Full comparisons retain the entire image; labeled detail crops are supplementary. Ratings are visual judgments, not measured comprehension or pixel error.</div>
<script>const input=document.querySelector('#search'),held=document.querySelector('#held'),cards=[...document.querySelectorAll('article')];function filter(){const q=input.value.toLowerCase().trim();let n=0;for(const c of cards){c.hidden=!(c.dataset.search.includes(q)&&(!held.checked||c.dataset.held==='true'));if(!c.hidden)n++;}document.querySelector('#count').textContent=n+' cases';}input.addEventListener('input',filter);held.addEventListener('change',filter);</script></body></html>'''
(root / 'index.html').write_text(page)
print(f'Wrote local reading index for {len(cards)} cases.')
