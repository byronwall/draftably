import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { chromium } from 'playwright-core';
import type { DraftDiagramElement } from '../src/runtime/element.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const consumers = JSON.parse(
  await readFile(path.join(root, 'tmp/viewer-proof/consumers.json'), 'utf8'),
);
const consumer = consumers['element-viewer'] as string;
assert.ok(consumer, 'Run pnpm viewer:pack-check first.');
const output = path.resolve(consumer, 'dist');
const runtime = path.resolve(consumer, 'node_modules/@draftably/runtime/dist');
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/manual/upgrade.html') {
    response.setHeader('Content-Type', 'text/html');
    response.setHeader(
      'Content-Security-Policy',
      "script-src 'self'; style-src 'self' 'nonce-proof-nonce'; worker-src 'self'; font-src 'self' data:",
    );
    response.end(
      `<link rel="icon" href="data:,"><draft-diagram source='node old "Attribute"'></draft-diagram><script type="module" src="/manual/upgrade.js"></script>`,
    );
    return;
  }
  if (url.pathname === '/manual/upgrade.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(`const diagram = document.querySelector('draft-diagram');
diagram.source = 'diagram "Upgraded property" version=1\\nnode api "API"';
diagram.options = { render: { styleNonce: 'proof-nonce' } };
import('/runtime/element.js');`);
    return;
  }
  const prefix = url.pathname.startsWith('/runtime/') ? '/runtime/' : '/manual/';
  if (!url.pathname.startsWith(prefix)) return void response.writeHead(404).end();
  const directory = prefix === '/runtime/' ? runtime : output;
  const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
  const file = path.resolve(directory, relative);
  if (!file.startsWith(directory + path.sep)) return void response.writeHead(404).end();
  if (url.searchParams.has('blocked'))
    response.setHeader('Content-Security-Policy', "worker-src 'none'");
  try {
    response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address !== 'string');
const url = `http://127.0.0.1:${address.port}/manual/`;
const browser = await chromium.launch();
let dev: ReturnType<typeof spawn> | undefined;
try {
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(url);
  assert.equal(await staticPage.locator('#diagram img').isVisible(), true);
  assert.ok(
    await staticPage
      .locator('#diagram img')
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  );
  await staticPage.close();
  console.log('PASS element static image without JavaScript');

  const upgrade = await browser.newPage();
  const upgradeErrors: string[] = [];
  upgrade.on('console', message => {
    if (message.type() === 'error') upgradeErrors.push(message.text());
  });
  await upgrade.goto(`${url}upgrade.html`);
  await upgrade.locator('draft-diagram svg').waitFor();
  assert.equal(await upgrade.locator('draft-diagram svg title').textContent(), 'Upgraded property');
  assert.equal(
    await upgrade.locator('draft-diagram').evaluate(element => getComputedStyle(element).height),
    '416px',
  );
  assert.deepEqual(upgradeErrors, []);
  await upgrade.close();
  console.log('PASS no-bundler import, pre-definition properties, and nonce-only styles');

  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.locator('#diagram svg').waitFor();
  await page.locator('#second svg').waitFor();
  assert.equal(await page.locator('#diagram svg title').textContent(), 'Checkout');
  assert.notEqual(
    await page.locator('#diagram svg').getAttribute('id'),
    await page.locator('#second svg').getAttribute('id'),
  );
  assert.equal(await page.locator('#diagram img').isVisible(), false);
  const height = await page
    .locator('#diagram')
    .evaluate(element => element.getBoundingClientRect().height);
  assert.ok(height >= 400, `Default element height was ${height}`);
  console.log(
    'PASS nested deployment, two instances, bundled styles, default height, and real worker',
  );

  await page.getByRole('button', { name: 'Update source', exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector('#diagram')
      ?.shadowRoot?.querySelector('svg')
      ?.textContent?.includes('Archive'),
  );
  await page.getByRole('button', { name: 'Try invalid source' }).click();
  await page.locator('#diagram .draft-viewer--stale').waitFor();
  assert.ok((await page.locator('#diagram svg').textContent())?.includes('Archive'));
  assert.equal(await page.locator('#diagram img').isVisible(), false);
  console.log('PASS reactive source and last good drawing after invalid update');

  await page.getByRole('button', { name: 'Remove diagram', exact: true }).click();
  assert.equal(await page.locator('#diagram').count(), 0);
  await page.getByRole('button', { name: 'Add diagram', exact: true }).click();
  await page.locator('#diagram svg').waitFor();
  const interrupted = await page.evaluate(async () => {
    const diagram = document.querySelector<DraftDiagramElement>('#diagram')!;
    const parent = diagram.parentElement!;
    const old = diagram.viewer!;
    diagram.source = 'diagram "Retired" version=1\nnode a "Old"';
    const pending = diagram.updateComplete;
    diagram.remove();
    diagram.source = 'diagram "Latest" version=1\nnode a "Current"';
    parent.append(diagram);
    return {
      prior: await pending,
      current: (await diagram.updateComplete)?.status,
      retired: (await old.update('node a "Old"')).status,
    };
  });
  assert.equal(interrupted.prior?.status, 'destroyed');
  assert.equal(interrupted.current, 'committed');
  assert.equal(interrupted.retired, 'destroyed');
  assert.equal(await page.locator('#diagram svg title').textContent(), 'Latest');
  console.log('PASS removal, reconnection, destroyed worker handle, and late-result isolation');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#diagram').getByRole('button', { name: 'Actual size' }).click();
  assert.equal(
    await page.evaluate(
      () => document.querySelector<DraftDiagramElement>('#diagram')!.viewer!.getCamera().zoom,
    ),
    1,
  );
  const viewport = page.locator('#diagram .draft-viewer__viewport');
  await viewport.focus();
  await page.keyboard.press('+');
  assert.ok(
    (await page.evaluate(
      () => document.querySelector<DraftDiagramElement>('#diagram')!.viewer!.getCamera().zoom,
    )) > 1,
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.addStyleTag({
    content: 'svg { width: 1px !important; } button { font-size: 2px !important; }',
  });
  assert.ok((await page.locator('#diagram svg').boundingBox())!.width > 100);
  assert.deepEqual(errors, []);
  await page.close();
  console.log('PASS 390px keyboard controls and isolation from host CSS');

  const blocked = await browser.newPage();
  await blocked.goto(`${url}?blocked`);
  assert.equal(
    (
      await blocked.evaluate(
        async () => await document.querySelector<DraftDiagramElement>('#diagram')!.updateComplete,
      )
    )?.status,
    'error',
  );
  assert.equal(await blocked.locator('#diagram img').isVisible(), true);
  assert.equal(await blocked.locator('#diagram svg').count(), 0);
  await blocked.close();
  console.log('PASS blocked worker keeps the fallback image');

  dev = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '0'], {
    cwd: consumer,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const devUrl = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Vite startup timed out: ${output}`)), 20_000);
    const data = (chunk: Buffer) => {
      output += stripVTControlCharacters(chunk.toString());
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    dev!.stdout!.on('data', data);
    dev!.stderr!.on('data', data);
    dev!.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    dev!.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Vite exited ${code}: ${output}`));
    });
  });
  const development = await browser.newPage();
  await development.goto(devUrl);
  await development.locator('#diagram svg').waitFor();
  assert.equal(await development.locator('#diagram svg title').textContent(), 'Checkout');
  await development.close();
  console.log('PASS installed element in Vite development and default production build');
} finally {
  dev?.kill('SIGTERM');
  await browser.close();
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
