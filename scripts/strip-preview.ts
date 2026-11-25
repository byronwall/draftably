/**
 * Write a standalone page to tune the source strip live: pick an example, drag the module size
 * and opacity, and see the band at real size with a decode check after JPEG or WebP.
 *
 *   node scripts/strip-preview.ts [--out tmp/strip-preview/index.html]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const out = args.includes('--out')
  ? args[args.indexOf('--out') + 1]
  : 'tmp/strip-preview/index.html';
const names = fs
  .readdirSync(path.join(root, 'examples'))
  .filter(f => f.endsWith('.draft'))
  .sort();
const examples = names.map(f => ({
  name: f.replace('.draft', ''),
  source: fs.readFileSync(path.join(root, 'examples', f), 'utf8'),
  svg: execFileSync(
    process.execPath,
    [path.join(root, 'scripts/draftably.mjs'), 'inspect', path.join('examples', f), '--svg'],
    { encoding: 'utf8', maxBuffer: 1 << 26 },
  ),
}));
const strip = stripTypeScriptTypes(
  fs.readFileSync(path.join(root, 'src/model/strip.ts'), 'utf8'),
).replace(/^export /gm, '');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Source strip preview</title>
<style>
:root{--bg:#fff;--fg:#1b2433;--muted:#5b6474;--line:#d9dde3}
body{margin:0;font:14px/1.4 system-ui,sans-serif;background:var(--bg);color:var(--fg)}
body.dark{--bg:#1e1f22;--fg:#e6e6e6;--muted:#a0a4ab;--line:#3a3c40}
header{position:sticky;top:0;z-index:1;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center}
label{display:flex;gap:6px;align-items:center;color:var(--muted)}
output{color:var(--fg);font-variant-numeric:tabular-nums;min-width:3.5em}
main{padding:16px;overflow-x:auto}
#stage.fit img{max-width:100%;height:auto}
#stage img{display:block;max-width:none;border:1px solid var(--line)}
#status{font-variant-numeric:tabular-nums}
.ok{color:#2a8a4a}.bad{color:#c0392b}
</style></head><body>
<header>
<label>Example <select id="ex">${examples.map((e, i) => `<option value="${i}"${e.name === 'checkout' ? ' selected' : ''}>${e.name}</option>`).join('')}</select></label>
<label>Module <input id="m" type="range" min="1" max="4" step="0.25" value="2"><output id="mv"></output></label>
<label>Opacity <input id="o" type="range" min="0.01" max="0.4" step="0.01" value="0.05"><output id="ov"></output></label>
<label>Parity <select id="p"><option selected>0.2</option><option>0.25</option><option>0.33</option><option>0.5</option></select></label>
<label>Shown at <select id="z"><option value="fit">Fit to width (chat preview)</option><option value="1" selected>1x (as pasted at CSS size)</option><option value="0.5">0.5x</option><option value="0.63">0.63x</option><option value="0.75">0.75x</option><option value="1.5">1.5x</option><option value="2">2x (full export pixels)</option></select></label>
<label>Re-encode <select id="t"><option value="image/png">PNG</option><option value="image/jpeg|0.85">JPEG 85</option><option value="image/jpeg|0.6">JPEG 60</option><option value="image/webp|0.75">WebP 75</option></select></label>
<label><input id="dark" type="checkbox"> Dark page</label>
<span id="status"></span>
</header>
<main><div id="stage"></div></main>
<script type="module">
${strip}
const examples = ${JSON.stringify(examples).replace(/</g, '\\u003c')};
const $ = id => document.getElementById(id);
let run = 0;
async function draw() {
  const me = ++run;
  const e = examples[+$('ex').value];
  const m = +$('m').value, opacity = +$('o').value, parity = +$('p').value, fit = $('z').value === 'fit', zoom = fit ? 1 : +$('z').value;
  $('mv').textContent = m + ' px';
  $('ov').textContent = Math.round(opacity * 100) + '%';
  document.body.classList.toggle('dark', $('dark').checked);
  const ink = /<text[^>]* fill="(#[0-9A-Fa-f]{6})"/.exec(e.svg)?.[1] ?? '#1B2433';
  const { svg, grid } = await addSourceStrip(e.svg, e.source, { module: m, parity, ink, opacity });
  const size = /width="([\\d.]+)" height="([\\d.]+)"/.exec(svg);
  const w = Math.ceil(+size[1]), h = Math.ceil(+size[2]);
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  // Resize to the shown scale, re-encode, and decode from those pixels.
  const s = document.createElement('canvas');
  s.width = Math.round(w * zoom); s.height = Math.round(h * zoom);
  const sx = s.getContext('2d');
  sx.imageSmoothingQuality = 'high';
  sx.drawImage(c, 0, 0, s.width, s.height);
  const [type, q] = $('t').value.split('|');
  const blob = await new Promise(r => s.toBlob(r, type, q ? +q : undefined));
  const back = await createImageBitmap(blob);
  sx.clearRect(0, 0, s.width, s.height);
  sx.drawImage(back, 0, 0);
  const read = await decodeStrip(sx.getImageData(0, 0, s.width, s.height), parity);
  if (me !== run) return;
  const shown = new Image();
  shown.src = URL.createObjectURL(blob);
  $('stage').classList.toggle('fit', fit);
  $('stage').replaceChildren(shown);
  const raw = new TextEncoder().encode(e.source).length;
  const ok = read.source === e.source;
  $('status').innerHTML = \`band \${grid.rows * m} CSS px (\${grid.cols}×\${grid.rows}) · source \${raw} B · image \${(blob.size / 1024).toFixed(0)} KB · <b class="\${ok ? 'ok' : 'bad'}">\${ok ? 'decodes' : 'fails: ' + read.why}</b>\`;
}
for (const id of ['ex', 'm', 'o', 'p', 'z', 't', 'dark']) $(id).addEventListener('input', draw);
draw();
</script></body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(path.resolve(out), (html.length / 1e6).toFixed(1) + ' MB');
