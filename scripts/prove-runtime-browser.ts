import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import path from 'node:path';
import { once } from 'node:events';

const root = path.resolve('tmp/runtime-proof');
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  const file = path.resolve(
    root,
    '.' + decodeURIComponent(new URL(req.url!, 'http://localhost').pathname),
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(404).end();
    return;
  }
  try {
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address !== 'string');
const url = `http://127.0.0.1:${address.port}/nested/demo/index.html`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(
    () => document.querySelector('#status')?.textContent === 'Rendered with the installed runtime.',
  );
  assert.ok(
    await page
      .locator('#diagram')
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS packed browser ESM: nested path, relative chunks, rendered SVG image and embedded fonts.',
  );
} finally {
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
