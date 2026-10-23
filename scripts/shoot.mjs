#!/usr/bin/env node
/**
 * Screenshots for PRs and visual checks, using the repository's Playwright and an installed
 * Playwright Chromium.
 *
 *   pnpm shoot <target> <out.png> [--size 1440x900] [--wait 500]
 *   pnpm shoot --sheet <out.png> [--cols N] [Label::]<target> [Label::]<target> ...
 *
 * A target is a URL, a `.draft` file (drawn with `draftably inspect --svg`), or an SVG, PNG or
 * HTML file. `--sheet` lays the targets out as a labeled contact sheet, one card per target;
 * `--cols` fixes the number of columns (by default as many 420px columns as fit).
 * Without `--size`, a file target is captured at its own size and a URL at 1440x900.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = `Usage:
  pnpm shoot <target> <out.png> [--size WxH] [--wait ms]
  pnpm shoot --sheet <out.png> [--cols N] [Label::]<target> ...`;

const args = process.argv.slice(2);
const option = name => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const [, value] = args.splice(i, 2);
  return value;
};
const sheet = args.includes('--sheet') ? (args.splice(args.indexOf('--sheet'), 1), true) : false;
const size = option('--size');
const wait = Number(option('--wait') ?? 300);
const cols = option('--cols');
if (args.length < 2 || args.some(a => a.startsWith('--'))) {
  console.error(usage);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-shoot-'));
const escape = text => text.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

/** A URL a page can load for this target. `.draft` files are compiled to SVG first. */
function urlFor(target) {
  if (/^https?:\/\//.test(target)) return target;
  const file = path.resolve(target);
  if (!fs.existsSync(file)) throw Error(`No such file: ${target}`);
  if (!file.endsWith('.draft')) return pathToFileURL(file).href;
  const svg = execFileSync(
    process.execPath,
    [path.join(root, 'scripts/draftably.mjs'), 'inspect', file, '--svg'],
    { encoding: 'utf8' },
  );
  const out = path.join(tmp, `${path.basename(file, '.draft')}-${Date.now()}.svg`);
  fs.writeFileSync(out, svg);
  return pathToFileURL(out).href;
}

const browser = await chromium.launch();
try {
  if (sheet) {
    const [out, ...items] = args;
    const cards = items.map(item => {
      const [label, target] = item.includes('::') ? item.split('::') : [path.basename(item), item];
      return `<figure><figcaption>${escape(label)}</figcaption><img src="${urlFor(target)}"></figure>`;
    });
    const html = path.join(tmp, 'sheet.html');
    fs.writeFileSync(
      html,
      `<!doctype html><style>
        body { margin: 0; padding: 16px; background: #fff; font: 13px system-ui, sans-serif;
               display: grid; gap: 16px;
               grid-template-columns: ${cols ? `repeat(${Number(cols)}, 1fr)` : 'repeat(auto-fill, minmax(420px, 1fr))'};
               align-items: start; }
        figure { margin: 0; border: 1px solid #d5d9e0; border-radius: 6px; overflow: hidden; }
        figcaption { padding: 6px 10px; border-bottom: 1px solid #d5d9e0; font-weight: 600; }
        img { display: block; width: 100%; height: auto; }
      </style>${cards.join('')}`,
    );
    const w = size ? Number(size.split('x')[0]) : 1400;
    const page = await browser.newPage({
      viewport: { width: w, height: 200 },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`Wrote ${out} (${items.length} cards)`);
  } else {
    const [target, out] = args;
    const url = urlFor(target);
    const [w, h] = (size ?? '1440x900').split('x').map(Number);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    // Without an explicit size, an image is cropped to itself and a page is captured whole.
    const image =
      !size && /\.(svg|png)$/.test(url) ? (url.endsWith('.svg') ? ':root' : 'img') : null;
    if (image) await page.locator(image).first().screenshot({ path: out });
    else await page.screenshot({ path: out, fullPage: !size && url.startsWith('file:') });
    console.log(`Wrote ${out}`);
  }
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
