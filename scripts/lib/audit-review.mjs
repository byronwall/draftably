/**
 * The review page for `audit:compare --review`: before and after, side by side, for every render
 * whose drawing changed, grouped by shape bucket and sorted by weighted impact. Writes
 * `<out>/review.html` (with its drawings in `<out>/review/`) and `<out>/review.pdf`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const signed = (n, digits = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toFixed(digits);
const tone = n => (n > 0 ? 'worse' : n < 0 ? 'better' : 'same');

export async function writeReview(o) {
  const assets = path.join(o.outDir, 'review');
  fs.rmSync(assets, { recursive: true, force: true });
  fs.mkdirSync(assets, { recursive: true });
  const svgOf = (side, p) => {
    const f = path.join(o.outDir, side, p.set, p.head.slug, p.head.file.replace('.draft', '.svg'));
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : undefined;
  };

  // Every render whose drawing or defect index changed.
  const items = [];
  for (const p of o.moves) {
    if (!p.base || p.base.error || p.head.error) continue;
    const [before, after] = [svgOf('base', p), svgOf('head', p)];
    const d = +(p.head.defectIndex - p.base.defectIndex).toFixed(1);
    if (!d && before === after) continue;
    const id = `${p.set}-${p.head.slug}-${p.head.file.replace('.draft', '')}`;
    for (const [side, svg] of [
      ['base', before],
      ['head', after],
    ])
      if (svg) fs.writeFileSync(path.join(assets, `${id}.${side}.svg`), svg);
    const [kb, kh] = [o.kindsOf(p.base), o.kindsOf(p.head)];
    const kinds = [...new Set([...Object.keys(kb), ...Object.keys(kh)])]
      .map(k => ({ kind: k, d: (kh[k] ?? 0) - (kb[k] ?? 0) }))
      .filter(k => k.d)
      .sort((a, b) => b.d - a.d);
    const bucket = o.bucketOf(p.set, p.head);
    const weight = o.weightOf(p.set, p.key);
    items.push({
      ...p,
      id,
      d,
      from: p.base.defectIndex,
      to: p.head.defectIndex,
      bucket,
      weight,
      impact: d * weight,
      limit: o.limitOf(bucket),
      kinds,
      hasSvg: !!before && !!after,
    });
  }

  // Buckets in order of how often the shape occurs; within one, the largest weighted moves first.
  const buckets = new Map();
  for (const it of items) {
    if (!buckets.has(it.bucket)) buckets.set(it.bucket, []);
    buckets.get(it.bucket).push(it);
  }
  const order = [...buckets.keys()].sort((a, b) => o.shareOf(b) - o.shareOf(a));
  for (const list of buckets.values())
    list.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || Math.abs(b.d) - Math.abs(a.d));

  const pct = b => `${((100 * (o.population.buckets[b] ?? 0)) / o.population.total).toFixed(0)}%`;
  const net = list => list.reduce((s, it) => s + it.impact, 0);
  const maxShare = Math.max(...Object.values(o.population.buckets)) / o.population.total;

  const gateBlock = ([name, flag], g) => `
    <section class="gate">
      <h3>${esc(name)} <code>${esc(flag)}</code> <span class="verdict ${g.verdict === 'FAIL' ? 'worse' : 'better'}">${g.verdict}</span></h3>
      <div class="rules">${g.rows
        .map(([rule, result, evidence]) => {
          const parts = (evidence || '').split('; ').filter(Boolean);
          const shown =
            parts.slice(0, 3).join('; ') + (parts.length > 3 ? `; +${parts.length - 3} more` : '');
          return `<div class="rule"><span class="result r-${result}">${result}</span><span class="rule-name">${esc(rule)}</span>${shown ? `<span class="evidence">${esc(shown)}</span>` : ''}</div>`;
        })
        .join('')}</div>
    </section>`;

  const setRows = Object.entries(o.loaded)
    .map(([set, { base, head }]) => {
      const ok = l => l.filter(r => !r.error);
      const m = l => ok(l).reduce((s, r) => s + r.defectIndex, 0) / Math.max(1, ok(l).length);
      const wm = side => o.setMean(set, side);
      const moved = items.filter(it => it.set === set).length;
      return `<tr><td>${esc(set)}</td><td class="num">${ok(head).length}</td><td class="num">${moved}</td>
        <td class="num">${m(base).toFixed(2)} → ${m(head).toFixed(2)}</td><td class="num ${tone(+(m(head) - m(base)).toFixed(2))}">${signed(m(head) - m(base), 2)}</td>
        <td class="num">${wm('base').toFixed(2)} → ${wm('head').toFixed(2)}</td><td class="num ${tone(+(wm('head') - wm('base')).toFixed(2))}">${signed(wm('head') - wm('base'), 2)}</td></tr>`;
    })
    .join('');

  const bucketNav = order
    .map(b => {
      const list = buckets.get(b);
      const share = (o.population.buckets[b] ?? 0) / o.population.total;
      const n = net(list);
      return `<a class="bucket-row" href="#b-${esc(b)}"><span class="bucket-name">${esc(b)}</span>
        <span class="bar"><span style="width:${((100 * share) / maxShare).toFixed(1)}%"></span></span>
        <span class="num">${pct(b)}</span><span class="num">${list.filter(it => it.d).length}</span><span class="num">${list.filter(it => !it.d).length}</span>
        <span class="num ${tone(+n.toFixed(2))}">${signed(n, 2)}</span></a>`;
    })
    .join('');

  const card = it => `
    <article class="pair" id="${esc(it.id)}">
      <div class="meta">
        <div class="name">${esc(it.set)}/${esc(it.head.slug)} <span class="file">${esc(it.head.file.replace('.draft', ''))}</span></div>
        <div class="di"><span class="num">${it.from} → ${it.to}</span> <span class="num ${tone(it.d)}">${signed(it.d)}</span></div>
        <dl>
          <dt>Weighted</dt><dd class="num ${tone(+it.impact.toFixed(2))}">${signed(it.impact, 2)}</dd>
          <dt>Weight</dt><dd class="num">${it.weight.toFixed(2)}</dd>
          <dt>Limit</dt><dd class="num ${it.d > it.limit ? 'worse' : ''}">${it.limit.toFixed(1)}${it.d > it.limit ? ' · over' : ''}</dd>
          <dt>Size</dt><dd class="num">${it.head.nodes} boxes · ${it.head.edges} lines</dd>
        </dl>
        <ul class="kinds">${
          it.kinds.length
            ? it.kinds
                .map(
                  k =>
                    `<li class="${tone(k.d)}"><span class="num">${signed(k.d, 0)}</span> ${esc(k.kind)}</li>`,
                )
                .join('')
            : '<li class="same">Same issues; the drawing moved</li>'
        }</ul>
      </div>
      ${
        it.hasSvg
          ? `<figure><img src="review/${esc(it.id)}.base.svg" alt="Before"></figure><figure><img src="review/${esc(it.id)}.head.svg" alt="After"></figure>`
          : '<p class="missing">No drawing saved for this render.</p>'
      }
    </article>`;

  const moved = list => list.filter(it => it.d);
  const redrawn = list => list.filter(it => !it.d);
  const small = it => `
    <article class="small" id="${esc(it.id)}">
      <div class="name">${esc(it.set)}/${esc(it.head.slug)} <span class="file">${esc(it.head.file.replace('.draft', ''))}</span> <span class="num same">DI ${it.to}</span></div>
      ${
        it.hasSvg
          ? `<figure><img src="review/${esc(it.id)}.base.svg" alt="Before"></figure><figure><img src="review/${esc(it.id)}.head.svg" alt="After"></figure>`
          : ''
      }
    </article>`;
  const sections = order
    .map(b => {
      const list = buckets.get(b);
      const seen = o.population.buckets[b];
      return `<section class="bucket" id="b-${esc(b)}">
        <header>
          <h2>${esc(b)}</h2>
          <p>${seen ? `${pct(b)} of docs diagrams (${seen} of ${o.population.total})` : 'No docs diagram has this shape'} · ${moved(list).length} moved DI · ${redrawn(list).length} redrawn · net weighted <span class="${tone(+net(list).toFixed(2))}">${signed(net(list), 2)}</span> · limit ${o.limitOf(b).toFixed(1)} DI</p>
        </header>
        ${moved(list).length ? `<div class="cols"><span></span><span>Before</span><span>After</span></div>${moved(list).map(card).join('')}` : ''}
        ${
          redrawn(list).length
            ? `<h4>Redrawn with the same DI (${redrawn(list).length}) · before, after</h4><div class="redrawn">${redrawn(list).map(small).join('')}</div>`
            : ''
        }
      </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit review</title>
<style>
:root {
  --ink: #1b2433; --muted: #5d6675; --faint: #8a93a1; --line: #e4e7eb; --panel: #f7f8fa;
  --better: #1d7a4b; --worse: #b4321f; --warn: #a1620a; --link: #2d5fb3; --bar: #9db3d6;
  --mono: ui-monospace, "SF Mono", Menlo, monospace;
}
* { box-sizing: border-box; }
html { background: #fff; }
body { margin: 0; color: var(--ink); font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1680px; margin: 0 auto; padding: 20px 24px 40px; }
h1 { font-size: 20px; margin: 0; text-wrap: balance; }
h2 { font-size: 15px; margin: 0; font-family: var(--mono); font-weight: 600; }
h3 { font-size: 13px; margin: 0 0 6px; display: flex; gap: 8px; align-items: baseline; }
.sub { color: var(--muted); margin: 2px 0 16px; }
.num { font-variant-numeric: tabular-nums; }
.better { color: var(--better); } .worse { color: var(--worse); } .same { color: var(--faint); }
a { color: var(--link); text-decoration: none; }
.top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 420px; gap: 28px; align-items: start; }
.gate h3 code { font: 11px var(--mono); color: var(--faint); font-weight: 400; }
.gate .verdict { font-size: 12px; font-weight: 700; letter-spacing: .02em; }
.rules { display: grid; grid-template-columns: 44px minmax(0, 1fr); column-gap: 8px; row-gap: 3px; }
.rule { display: contents; }
.rule .result { font-weight: 600; font-size: 11px; padding-top: 1px; }
.r-PASS { color: var(--faint); } .r-FAIL { color: var(--worse); } .r-WARN { color: var(--warn); }
.rule .rule-name { overflow-wrap: anywhere; }
.rule .evidence { grid-column: 2; color: var(--muted); font-size: 12px; margin-bottom: 3px; overflow-wrap: anywhere; }
table { border-collapse: collapse; margin-top: 18px; }
th, td { text-align: left; padding: 3px 18px 3px 0; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { color: var(--muted); font-weight: 500; font-size: 12px; }
.buckets h3 { color: var(--muted); font-weight: 500; }
.bucket-row { display: grid; grid-template-columns: 116px minmax(40px, 1fr) 34px 56px 56px 50px; gap: 8px; align-items: center; color: var(--ink); padding: 1px 4px; border-radius: 4px; transition: background-color 140ms ease; }
.bucket-row .num { text-align: right; }
.bucket-row .bucket-name { font-family: var(--mono); font-size: 12px; }
@media (hover: hover) { .bucket-row:hover { background: var(--panel); } }
.bar { height: 6px; background: var(--panel); border-radius: 3px; overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--bar); }
.bucket-head { color: var(--faint); font-size: 11px; }
.bucket { margin-top: 30px; }
.bucket header { display: flex; gap: 14px; align-items: baseline; flex-wrap: wrap; border-bottom: 1px solid var(--ink); padding-bottom: 4px; }
.bucket header p { margin: 0; color: var(--muted); }
.cols, .pair { display: grid; grid-template-columns: 230px minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
.cols { color: var(--faint); font-size: 11px; padding: 6px 0 2px; }
.pair { padding: 10px 0; border-bottom: 1px solid var(--line); break-inside: avoid; }
.meta .name { font-weight: 600; overflow-wrap: anywhere; }
.meta .file { color: var(--muted); font-weight: 400; }
.meta .di { font-size: 15px; margin: 2px 0 4px; }
.meta .di .num + .num { font-weight: 600; }
dl { display: grid; grid-template-columns: 62px 1fr; margin: 0 0 6px; font-size: 12px; }
dt { color: var(--faint); } dd { margin: 0; }
.kinds { list-style: none; margin: 0; padding: 0; font-size: 12px; }
.kinds .num { display: inline-block; min-width: 22px; font-weight: 600; }
figure { margin: 0; height: 340px; background: var(--panel); border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 8px; }
figure img { max-width: 100%; max-height: 100%; object-fit: contain; }
.missing { grid-column: 2 / 4; color: var(--faint); }
.empty { color: var(--muted); margin-top: 30px; }
@media screen and (max-width: 900px) {
  .top { grid-template-columns: 1fr; }
  .cols { display: none; }
  .pair { grid-template-columns: 1fr; }
  figure { height: 240px; }
  table { display: block; overflow-x: auto; }
}
@page { size: 17in 11in; margin: 0.35in; }
h4 { margin: 14px 0 6px; font-size: 12px; font-weight: 500; color: var(--muted); }
.redrawn { display: grid; grid-template-columns: repeat(auto-fill, minmax(460px, 1fr)); gap: 10px 18px; }
.small { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; break-inside: avoid; }
.small .name { grid-column: 1 / 3; font-size: 12px; overflow-wrap: anywhere; }
.small figure { height: 150px; padding: 4px; }
@media print { main { max-width: none; padding: 0; } figure { height: 300px; } .small figure { height: 140px; } }
</style></head><body><main>
<h1>Audit review</h1>
<p class="sub">${esc(o.title)} · ${items.filter(it => it.d).length} renders moved DI, ${items.filter(it => !it.d).length} redrawn with the same DI · weights from ${o.population.total} docs diagrams measured ${esc(o.population.measured)}</p>
<div class="top">
  ${Object.entries(o.gates)
    .map(([name, g]) =>
      gateBlock(name === 'flat' ? ['Flat gate', '--gate=flat'] : ['Weighted gate', '--gate'], g),
    )
    .join('')}
  <section class="buckets">
    <h3>Buckets by share of docs diagrams</h3>
    <div class="bucket-row bucket-head"><span>Bucket</span><span>Share</span><span class="num">%</span><span class="num">DI moved</span><span class="num">Redrawn</span><span class="num">Net w.</span></div>
    ${bucketNav}
  </section>
</div>
<table><thead><tr><th>Set</th><th>Renders</th><th>Changed</th><th>Mean DI</th><th>Δ</th><th>Weighted mean DI</th><th>Δw</th></tr></thead><tbody>${setRows}</tbody></table>
${sections || '<p class="empty">No render changed.</p>'}
</main></body></html>`;
  const htmlFile = path.join(o.outDir, 'review.html');
  fs.writeFileSync(htmlFile, html);
  const pdfFile = path.join(o.outDir, 'review.pdf');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    await page.pdf({ path: pdfFile, preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
  return [htmlFile, pdfFile];
}
