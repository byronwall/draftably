/* global window, document */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = resolve('.');
const out = resolve('out');
const htmlPath = resolve('interactive.html');
const html = await readFile(htmlPath, 'utf8');
const initUrl = html.match(/data-draftably-init="([^"]+)"/)?.[1];
if (!initUrl) throw new Error('No interactive initialization URL was generated.');
const initPath = resolve(out, `.${new URL(initUrl, 'https://draftably.invalid').pathname}`);
if (!initPath.startsWith(`${out}${sep}`))
  throw new Error('Initialization URL is outside the proof output.');
const initJson = await readFile(initPath, 'utf8');
const server = await createServer({
  root,
  configFile: false,
  publicDir: out,
  optimizeDeps: { exclude: ['@draftably/runtime'] },
  server: { host: '127.0.0.1', port: 0 },
  plugins: [
    {
      name: 'delayed-init-proof',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const pathname = request.url?.split('?')[0];
          if (pathname === '/redirect.json') {
            response.statusCode = 302;
            response.setHeader('location', 'https://example.invalid/init.json');
            response.end();
            return;
          }
          if (pathname !== '/slow.json') return next();
          setTimeout(() => {
            if (response.destroyed) return;
            response.setHeader('content-type', 'application/json');
            response.end(initJson);
          }, 350);
        });
      },
    },
  ],
});
const browser = await chromium.launch({ headless: true });
try {
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not open a TCP port.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(`${baseUrl}/interactive.html`);
  const staticImages = staticPage.locator('#root img');
  assert.equal(await staticImages.count(), 2, 'both static diagrams remain in the document');
  assert.equal(
    await staticImages.first().isVisible(),
    true,
    'static image renders with JavaScript disabled',
  );
  assert.ok(
    await staticImages.evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0),
    ),
    'all static SVG assets load with JavaScript disabled',
  );
  await staticPage.close();
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  const externalRequests = [];
  const pageErrors = [];
  page.on('console', message => console.log(`browser ${message.type()}: ${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== baseUrl) externalRequests.push(request.url());
  });
  const entryResponse = page.waitForResponse(
    response => new URL(response.url()).pathname === '/browser-entry.ts',
  );
  await page.goto(`${baseUrl}/interactive.html`);
  const transformedEntry = await (await entryResponse).text();
  assert.doesNotMatch(
    transformedEntry,
    /declare global|interface Window/,
    'Vite transforms the browser entry',
  );
  assert.equal(await page.title(), 'Interactive diagrams');
  assert.equal(await page.locator('link[rel="icon"]').count(), 1, 'page has a favicon');
  assert.equal(await page.locator('button', { hasText: 'Enhance diagrams' }).isVisible(), true);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'layout fits a desktop viewport',
  );
  const fallback = page.locator('#root img');
  const region = page.locator('#root [data-draftably-region]');
  assert.equal(await fallback.count(), 2, 'enhancement finds multiple diagrams');
  assert.equal(
    await fallback.first().isVisible(),
    true,
    'static image is visible before enhancement',
  );

  await page.getByRole('button', { name: 'Enhance diagrams' }).click();
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('#root img'));
    const diagrams = Array.from(document.querySelectorAll('#root [data-draftably-region] svg'));
    return images.length === 2 && images.every(image => image.hidden) && diagrams.length === 2;
  });
  assert.equal(
    await fallback.first().isVisible(),
    false,
    'viewers hide fallbacks only after commit',
  );
  await page.setViewportSize({ width: 960, height: 900 });
  assert.equal(await page.evaluate(() => window.innerWidth), 960);
  await page.screenshot({ path: resolve(out, 'interactive-enhanced.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'layout fits a narrow viewport',
  );
  await page.getByRole('button', { name: 'Restore static diagrams' }).click();
  assert.equal(await fallback.first().isVisible(), true, 'destroy restores each static image');
  assert.equal(await region.locator('svg').count(), 0, 'destroy removes all viewer content');

  await page.evaluate(() => {
    const figure = document.querySelector('#root figure').cloneNode(true);
    figure.id = 'failure-root';
    figure.querySelector('[data-draftably-policy]').dataset.draftablyPolicy = 'unconfigured';
    document.body.append(figure);
    window.failureHandle = window.startDraftDiagrams(figure);
  });
  await page.waitForFunction(() => window.draftablyDiagnostics.length > 0);
  assert.equal(
    await page.locator('#failure-root img').isVisible(),
    true,
    'policy failure keeps fallback',
  );
  await page.evaluate(() => window.failureHandle.destroy());

  const diagnosticCount = await page.evaluate(() => window.draftablyDiagnostics.length);
  const redirectRequest = page.waitForRequest(
    request => new URL(request.url()).pathname === '/redirect.json',
  );
  await page.evaluate(() => {
    const figure = document.querySelector('#root figure').cloneNode(true);
    figure.id = 'redirect-root';
    figure.querySelector('[data-draftably-init]').dataset.draftablyInit = '/redirect.json';
    document.body.append(figure);
    window.redirectHandle = window.startDraftDiagrams(figure);
  });
  await redirectRequest;
  await page.waitForFunction(count => window.draftablyDiagnostics.length > count, diagnosticCount);
  assert.equal(
    await page.locator('#redirect-root img').isVisible(),
    true,
    'redirect rejection keeps fallback',
  );
  assert.deepEqual(
    externalRequests,
    [],
    'same-origin init fetch never follows an external redirect',
  );
  await page.evaluate(() => window.redirectHandle.destroy());

  await page.route('**/*render.worker-*', async route => {
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.continue();
  });
  const workerRequest = page.waitForRequest(request =>
    new URL(request.url()).pathname.includes('render.worker-'),
  );
  await page.evaluate(() => {
    const figure = document.querySelector('#root figure').cloneNode(true);
    figure.id = 'late-update-root';
    document.body.append(figure);
    window.lateUpdateHandle = window.startDraftDiagrams(figure);
  });
  await workerRequest;
  await page.evaluate(() => window.lateUpdateHandle.destroy());
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator('#late-update-root img').isVisible(),
    true,
    'destroy during a real worker request restores the fallback',
  );
  assert.equal(await page.locator('#late-update-root [data-draftably-region] svg').count(), 0);
  await page.unroute('**/*render.worker-*');

  const request = page.waitForRequest(url => new URL(url.url()).pathname === '/slow.json');
  await page.evaluate(() => {
    const figure = document.querySelector('#root figure').cloneNode(true);
    figure.id = 'late-root';
    figure.querySelector('[data-draftably-init]').dataset.draftablyInit = '/slow.json';
    document.body.append(figure);
    window.lateHandle = window.startDraftDiagrams(figure);
  });
  await request;
  await page.evaluate(() => window.lateHandle.destroy());
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator('#late-root img').isVisible(),
    true,
    'late response keeps fallback visible',
  );
  assert.equal(await page.locator('#late-root [data-draftably-region] svg').count(), 0);
  await page.close();
  assert.deepEqual(
    pageErrors,
    [],
    'Vite must serve transformed client JavaScript without page errors',
  );
  console.log(
    `PASS real viewer client at ${baseUrl}: fallback, commit, errors, redirect rejection, destroy, and late work.`,
  );
  console.log(`Screenshot: ${resolve(out, 'interactive-enhanced.png')}`);
} finally {
  await browser.close();
  await server.close();
}
