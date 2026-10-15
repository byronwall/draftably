#!/usr/bin/env node
/* global document, FontFace -- page.evaluate callbacks run in the browser. */
/**
 * Generate `src/model/font-metrics.json`: advance widths for the bundled diagram fonts.
 *
 * Loads each font file in Chromium and measures every character of the supported set with canvas
 * text metrics at 1000px. The compiler, the viewer and the CLI wrap text with this table, so a run
 * is needed only when a font file or the character set changes.
 *
 * Usage: node scripts/font-metrics.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = path.join(root, 'src/assets/fonts');
const FACES = {
  'sans-500': 'inter-latin-500-normal.woff2',
  'sans-600': 'inter-latin-600-normal.woff2',
  'serif-600': 'source-serif-4-latin-600-normal.woff2',
  'mono-500': 'jetbrains-mono-latin-500-normal.woff2',
};
let chars = '';
for (let c = 32; c < 127; c++) chars += String.fromCharCode(c);
for (let c = 160; c < 256; c++) chars += String.fromCharCode(c);
chars += '‘’“”–—…•→←×≤≥≠·€';

const browser = await chromium.launch();
const page = await browser.newPage();
const out = {};
for (const [id, file] of Object.entries(FACES)) {
  const data = fs.readFileSync(path.join(fonts, file)).toString('base64');
  out[id] = await page.evaluate(
    async ({ id, data, chars }) => {
      const face = new FontFace('metric-' + id, `url(data:font/woff2;base64,${data})`);
      await face.load();
      document.fonts.add(face);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `1000px "metric-${id}"`;
      const advances = {};
      for (const char of chars) advances[char] = Math.round(ctx.measureText(char).width);
      // Characters outside the set measure as the widest capital, so unknown text never fits
      // where it would overflow.
      const fallback = Math.max(advances.M, advances.W);
      return { unitsPerEm: 1000, fallback, advances };
    },
    { id, data, chars },
  );
}
await browser.close();
fs.writeFileSync(path.join(root, 'src/model/font-metrics.json'), JSON.stringify(out) + '\n');
console.log(`Wrote metrics for ${Object.keys(out).length} faces, ${[...chars].length} characters.`);
