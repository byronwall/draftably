/**
 * Prove the source strip: draw each example with its strip, rasterize it in Chrome at scale 2,
 * then resize and recompress it in the page (PNG, JPEG, WebP) and decode the strip from pixels.
 *
 *   node scripts/prove-strip.ts [example.draft…] [--out tmp/strip]
 *
 * Prints one table row per setting: how many images decode under each transform.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { addSourceStrip, type decodeStrip } from '../src/model/strip.ts';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args.splice(outAt, 2)[1] : 'tmp/strip';
const setAt = args.indexOf('--set');
const only = setAt >= 0 ? args.splice(setAt, 2)[1] : '';
const files = args.length
  ? args
  : fs
      .readdirSync(path.join(root, 'examples'))
      .filter(f => f.endsWith('.draft'))
      .map(f => path.join('examples', f));

const MODULES = only ? [Number(only.split(':')[0])] : [1, 1.5, 2, 3];
const OPACITY = only ? [Number(only.split(':')[1])] : [0.06, 0.1, 0.16, 0.25, 0.4];
const PARITY = only.split(':')[2] ? Number(only.split(':')[2]) : 0.25;
const TRANSFORMS = [
  { name: 'png 2x', scale: 2, type: 'image/png' },
  { name: 'png 1x', scale: 1, type: 'image/png' },
  { name: 'jpeg85 1x', scale: 1, type: 'image/jpeg', q: 0.85 },
  { name: 'jpeg60 1x', scale: 1, type: 'image/jpeg', q: 0.6 },
  { name: 'webp75 1x', scale: 1, type: 'image/webp', q: 0.75 },
  { name: 'jpeg70 1.5x', scale: 1.5, type: 'image/jpeg', q: 0.7 },
  { name: 'png .75x', scale: 0.75, type: 'image/png' },
  { name: 'jpeg80 .75x', scale: 0.75, type: 'image/jpeg', q: 0.8 },
  { name: 'png .5x', scale: 0.5, type: 'image/png' },
];

const decoder =
  stripTypeScriptTypes(fs.readFileSync(path.join(root, 'src/model/strip.ts'), 'utf8')).replace(
    /^export /gm,
    '',
  ) + '\nwindow.__strip = { decodeStrip };';

const cli = (file: string) =>
  execFileSync(
    process.execPath,
    [path.join(root, 'scripts/draftably.mjs'), 'inspect', file, '--svg'],
    {
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    },
  );

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-mock-keychain', '--password-store=basic'],
});
const lab = await (await browser.newContext()).newPage();
await lab.setContent('<!doctype html><meta charset="utf-8">');
await lab.addScriptTag({ content: decoder, type: 'module' });
await lab.waitForFunction(() => 'strip' in window || '__strip' in window);

const svgs = files.map(f => ({
  name: path.basename(f, '.draft'),
  source: fs.readFileSync(f, 'utf8'),
  svg: cli(f),
}));
const rows: string[] = [];
for (const m of MODULES)
  for (const opacity of OPACITY) {
    const pass = TRANSFORMS.map(() => 0);
    const notes: string[] = [];
    let bandPx = 0;
    for (const d of svgs) {
      const ink = /<text[^>]* fill="(#[0-9A-Fa-f]{6})"/.exec(d.svg)?.[1] ?? '#1B2433';
      const { svg, grid } = await addSourceStrip(d.svg, d.source, {
        module: m,
        parity: PARITY,
        ink,
        opacity,
      });
      bandPx = Math.max(bandPx, grid.rows * m);
      const size = /width="([\d.]+)" height="([\d.]+)"/.exec(svg)!;
      const w = Math.ceil(Number(size[1]));
      const h = Math.ceil(Number(size[2]));
      type Read = { ok: boolean; why?: string; fixed?: number; bytes: number; png?: string };
      const results: Read[] = await lab.evaluate(
        async ({ svg, w, h, transforms, source, want, parity }) => {
          const el = new Image();
          el.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          await el.decode();
          const base = document.createElement('canvas');
          base.width = w * 2;
          base.height = h * 2;
          base.getContext('2d')!.drawImage(el, 0, 0, base.width, base.height);
          const img = await createImageBitmap(base);
          const res: Read[] = [{ ok: true, bytes: 0, png: base.toDataURL('image/png') }];
          for (const t of transforms) {
            const c = document.createElement('canvas');
            c.width = Math.round(w * t.scale);
            c.height = Math.round(h * t.scale);
            const ctx = c.getContext('2d')!;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, c.width, c.height);
            const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), t.type, t.q));
            const back = await createImageBitmap(blob);
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.drawImage(back, 0, 0);
            const px = ctx.getImageData(0, 0, c.width, c.height);
            const read = await (
              window as unknown as { __strip: { decodeStrip: typeof decodeStrip } }
            ).__strip.decodeStrip(px, parity);
            const g = read.grid;
            let bad = -1;
            if (g && g.cols === want.cols && g.rows === want.rows) {
              bad = 0;
              for (let i = 0; i < g.on.length; i++) if (g.on[i] !== +want.on[i]) bad++;
            }
            res.push({
              ok: read.source === source,
              why:
                read.why +
                (g ? ` grid ${g.cols}x${g.rows} want ${want.cols}x${want.rows} bad ${bad}` : ''),
              fixed: read.fixed,
              bytes: blob.size,
            });
          }
          return res;
        },
        {
          svg,
          parity: PARITY,
          w,
          h,
          transforms: TRANSFORMS,
          source: d.source,
          want: { cols: grid.cols, rows: grid.rows, on: Array.from(grid.on).join('') },
        },
      );
      const first = results.shift()!;
      if (files.length <= 3 || d.name === 'checkout')
        fs.writeFileSync(
          path.join(out, `${d.name}-m${m}-o${opacity}.png`),
          Buffer.from(first.png!.split(',')[1], 'base64'),
        );
      results.forEach((r, i) => {
        if (r.ok) pass[i]++;
        else notes.push(`${d.name} ${TRANSFORMS[i].name}: ${r.why}`);
      });
    }
    const row = `| ${m} | ${opacity} | ${bandPx} | ${pass.map(p => `${p}/${svgs.length}`).join(' | ')} |`;
    rows.push(row);
    console.log(row, notes.length ? `\n    ${notes.join('\n    ')}` : '');
  }
await browser.close();
const head = `| module px | opacity | max band px | ${TRANSFORMS.map(t => t.name).join(' | ')} |\n|${' --- |'.repeat(TRANSFORMS.length + 3)}`;
fs.writeFileSync(path.join(out, 'results.md'), `${head}\n${rows.join('\n')}\n`);
console.log(`\n${head}\n${rows.join('\n')}`);
