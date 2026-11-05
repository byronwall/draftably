/* eslint @typescript-eslint/no-explicit-any: off */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const proof = path.join(root, 'tmp/viewer-proof');
const dirs = JSON.parse(await readFile(path.join(proof, 'consumers.json'), 'utf8')) as Record<
  string,
  string
>;
const roots = new Map([
  ['/nested/demo', path.join(proof, 'nested/demo')],
  ['/apps/react', path.join(dirs['react-viewer'], 'dist')],
  ['/apps/solid', path.join(dirs['solid-viewer'], 'dist')],
]);
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};
const csp = (query: URLSearchParams): string | undefined => {
  if (query.has('block-worker'))
    return "default-src 'self'; script-src 'self'; worker-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'";
  if (query.has('block-fonts'))
    return "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'";
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const route = [...roots].find(
    ([prefix]) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (!route) {
    console.log(`static route missing: ${url.pathname}`);
    response.writeHead(404).end();
    return;
  }
  const [prefix, base] = route;
  const relative =
    decodeURIComponent(url.pathname.slice(prefix.length)).replace(/^\//, '') || 'index.html';
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep)) {
    response.writeHead(404).end();
    return;
  }
  const policy = csp(url.searchParams);
  if (policy) response.setHeader('Content-Security-Policy', policy);
  try {
    response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch (error) {
    console.log(
      `static file missing: ${url.pathname} -> ${file}: ${error instanceof Error ? error.message : error}`,
    );
    response.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
const devServers: ReturnType<typeof spawn>[] = [];
try {
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(`${base}/nested/demo/`);
  const fallback = staticPage.locator('#static-fallback');
  assert.equal(await fallback.isVisible(), true);
  assert.ok(
    await fallback.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  );
  await staticPage.close();
  console.log('PASS static fallback: diagram stays visible without JavaScript');

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const pageErrors: string[] = [];
  page.on('console', message => console.log(`browser ${message.type()}: ${message.text()}`));
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request =>
    console.log(`request failed ${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.goto(`${base}/nested/demo/`);
  await page.waitForFunction(
    () =>
      /^(Rendered with the packed viewer\.|Initial render failed:)/.test(
        document.querySelector('#proof-status')?.textContent ?? '',
      ),
    { timeout: 15_000 },
  );
  const initialStatus = await page.locator('#proof-status').textContent();
  assert.equal(
    initialStatus,
    'Rendered with the packed viewer.',
    JSON.stringify(await page.evaluate(() => (window as any).viewerProof.initialResults)),
  );
  const ids = await page
    .locator('#first svg, #second svg')
    .evaluateAll(svgs => svgs.map(svg => svg.id));
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  assert.equal(await page.locator('svg title').first().textContent(), 'Browser proof');
  assert.ok(await page.locator('svg marker').count(), 'native arrowhead did not render');
  console.log('PASS nested packed browser: worker render, SVG vocabulary, and unique instance IDs');

  const narrowPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await narrowPage.goto(`${base}/nested/demo/`);
  await narrowPage.waitForFunction(
    () =>
      document.querySelector('#proof-status')?.textContent === 'Rendered with the packed viewer.',
  );
  const narrowViewport = narrowPage.locator('#first .draft-viewer__viewport');
  await narrowPage.evaluate(() =>
    (window as any).viewerProof.first.setCamera({ centerX: 0, centerY: 0, zoom: 0.3 }),
  );
  await narrowPage.locator('#first').getByRole('button', { name: 'Actual size' }).click();
  assert.equal(
    await narrowPage.evaluate(() => (window as any).viewerProof.first.getCamera().zoom),
    1,
  );
  const apiLabelHeight = await narrowPage
    .locator('#first svg text[font-size="13"]')
    .first()
    .evaluate(element => element.getBoundingClientRect().height);
  assert.ok(apiLabelHeight >= 12, `actual-size label height was ${apiLabelHeight}px`);
  const frameBeforeSelection = await narrowViewport.boundingBox();
  const storeBefore = await narrowPage.locator('#first svg [data-id="store"]').boundingBox();
  assert.ok(frameBeforeSelection && storeBefore);
  assert.ok(
    storeBefore.x > frameBeforeSelection.x + frameBeforeSelection.width ||
      storeBefore.x + storeBefore.width < frameBeforeSelection.x,
    'Store should start outside the visible viewport.',
  );
  await narrowPage.locator('#first').getByRole('button', { name: 'node: Store' }).click();
  const centered = await Promise.all([
    narrowViewport.boundingBox(),
    narrowPage.locator('#first svg [data-id="store"]').boundingBox(),
  ]);
  assert.ok(centered[0] && centered[1]);
  const frameCenter = centered[0].x + centered[0].width / 2;
  const storeCenter = centered[1].x + centered[1].width / 2;
  assert.ok(Math.abs(frameCenter - storeCenter) < 2, 'outline selection did not center Store');
  assert.ok(
    await narrowPage
      .locator('#first')
      .getByRole('button', { name: 'node: Store' })
      .evaluate(element => element === document.activeElement),
    'outline selection must keep keyboard focus on its button',
  );
  assert.equal(
    await narrowPage.evaluate(() => (window as any).viewerProof.first.getCamera().zoom),
    1,
  );
  await narrowPage.locator('#first').getByRole('button', { name: 'Fit diagram' }).click();
  assert.ok(
    (await narrowPage.evaluate(() => (window as any).viewerProof.first.getCamera().zoom)) < 1,
    'Fit diagram should restore the overview scale.',
  );
  await narrowPage.close();
  console.log(
    'PASS 390px inspection: actual-size labels, centered offscreen item, and fit overview',
  );

  const rapid = await page.evaluate(async () => {
    const api = (window as any).viewerProof;
    const old = api.update(api.source);
    const latest = api.update(api.other);
    return await Promise.all([old, latest]);
  });
  assert.equal(rapid[0].status, 'superseded');
  assert.equal(rapid[1].status, 'committed');
  assert.ok((await page.locator('#first svg').textContent())?.includes('Archive'));
  console.log('PASS rapid updates: stale worker output is discarded');

  const beforeError = await page.locator('#first svg').evaluate(element => {
    const copy = element.cloneNode(true) as SVGElement;
    copy.removeAttribute('style');
    return copy.outerHTML;
  });
  const invalid = await page.evaluate(() => (window as any).viewerProof.update('not a diagram'));
  assert.equal(invalid.status, 'error');
  assert.equal(
    await page.locator('#first svg').evaluate(element => {
      const copy = element.cloneNode(true) as SVGElement;
      copy.removeAttribute('style');
      return copy.outerHTML;
    }),
    beforeError,
  );
  assert.ok(await page.locator('#first .draft-viewer--stale').count());
  console.log('PASS invalid update: prior drawing remains visible with stale marker');

  const camera = { centerX: 48, centerY: 29, zoom: 0.3 };
  await page.evaluate(value => (window as any).viewerProof.first.setCamera(value), camera);
  const preserved = await page.evaluate(async () => {
    const api = (window as any).viewerProof;
    const result = await api.update(api.source);
    return { result, camera: api.first.getCamera() };
  });
  assert.equal(preserved.result.status, 'committed');
  assert.deepEqual(preserved.camera, camera);

  const heightBefore = (await page.locator('#first .draft-viewer__viewport').boundingBox())!.height;
  await page.locator('#first').evaluate(element => {
    (element as HTMLElement).style.blockSize = '34rem';
  });
  await page.waitForFunction(height => {
    const viewport = document.querySelector('#first .draft-viewer__viewport');
    return !!viewport && viewport.getBoundingClientRect().height > height + 50;
  }, heightBefore);
  assert.deepEqual(
    await page.evaluate(() => (window as any).viewerProof.first.getCamera()),
    camera,
  );
  console.log('PASS height-only resize: viewport grows and user camera stays in world units');

  await page.evaluate(() => (window as any).viewerProof.revealHidden());
  await page.waitForFunction(() => (window as any).viewerProof.hidden.getCamera().centerX > 0);
  console.log('PASS camera behavior: updates preserve world scale and hidden hosts fit when shown');

  await page.evaluate(() =>
    (window as any).viewerProof.first.setCamera({ centerX: 50, centerY: 30, zoom: 0.3 }),
  );
  const viewport = page.locator('#first .draft-viewer__viewport');
  await page.mouse.move(
    (await viewport.boundingBox())!.x + 100,
    (await viewport.boundingBox())!.y + 100,
  );
  const zoomBefore = await page.evaluate(() => (window as any).viewerProof.first.getCamera().zoom);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -120);
  const zoomAfter = await page.evaluate(() => (window as any).viewerProof.first.getCamera().zoom);
  assert.ok(zoomAfter > zoomBefore);
  assert.equal(await page.evaluate(() => window.scrollY), scrollBefore);
  const background = page.locator('#first svg > rect').first();
  const box = await background.boundingBox();
  assert.ok(box);
  const centerBefore = await page.evaluate(
    () => (window as any).viewerProof.first.getCamera().centerX,
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 10);
  await page.mouse.up();
  const centerAfter = await page.evaluate(
    () => (window as any).viewerProof.first.getCamera().centerX,
  );
  assert.notEqual(centerAfter, centerBefore);
  const link = page.locator('#first svg a[href]').first();
  const currentUrl = page.url();
  await link.click();
  assert.equal(await page.evaluate(() => (window as any).viewerProof.linkWasPrevented()), true);
  assert.equal(page.url(), currentUrl);
  console.log('PASS interaction: wheel zoom, background pan, and approved link cancellation');

  const destroyed = await page.evaluate(() => (window as any).viewerProof.remountAfterDestroy());
  assert.equal(destroyed.result.status, 'destroyed');
  assert.equal(destroyed.committed.status, 'committed');
  assert.equal(await page.locator('#first svg').count(), 1);
  console.log('PASS destroy during work and remount');
  assert.deepEqual(pageErrors, []);

  for (const [query, expected] of [
    ['block-worker', 'DRAFT_VIEWER_WORKER'],
    ['block-fonts', 'DRAFT_FONT_UNAVAILABLE'],
  ]) {
    const blocked = await browser.newPage();
    await blocked.goto(`${base}/nested/demo/?${query}`);
    await blocked.waitForFunction(() =>
      document.querySelector('#proof-status')?.textContent?.startsWith('Initial render failed:'),
    );
    const codes = await blocked.evaluate(() =>
      (window as any).viewerProof.initialResults.map(
        (result: any) => result.error?.diagnostics?.[0]?.code,
      ),
    );
    assert.ok(
      codes.every((code: string) => code === expected),
      `${query} returned ${codes}`,
    );
    assert.equal(await blocked.locator('#first svg').count(), 0);
    assert.equal(await blocked.locator('#static-fallback').isVisible(), true);
    assert.ok(
      await blocked
        .locator('#static-fallback')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    );
    await blocked.close();
    console.log(`PASS CSP ${query}: update fails and keeps the empty fallback host`);
  }

  for (const [name, port] of [
    ['react-viewer', '/apps/react/'],
    ['solid-viewer', '/apps/solid/'],
  ]) {
    const dir = dirs[name];
    const child = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '0'], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    devServers.push(child);
    let output = '';
    const ready = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${name} Vite server did not start: ${output}`)),
        20_000,
      );
      const onData = (chunk: Buffer) => {
        output += chunk.toString();
        const match = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(output);
        if (match) {
          clearTimeout(timer);
          resolve(`http://127.0.0.1:${match[1]}/`);
        }
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.once('error', error => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', code => {
        if (code && code !== 0) {
          clearTimeout(timer);
          reject(new Error(`${name} Vite exited ${code}: ${output}`));
        }
      });
    });
    const origin = await ready;
    const frameworkPage = await browser.newPage();
    const errors: string[] = [];
    frameworkPage.on('console', message =>
      console.log(`${name} ${message.type()}: ${message.text()}`),
    );
    frameworkPage.on('requestfailed', request =>
      console.log(`${name} request failed ${request.url()}: ${request.failure()?.errorText}`),
    );
    frameworkPage.on('pageerror', error => errors.push(error.message));
    await frameworkPage.goto(new URL(port, origin).href);
    await frameworkPage
      .waitForSelector('.draft-viewer__viewport svg', { timeout: 10_000 })
      .catch(async error => {
        console.log(
          `${name} document: ${await frameworkPage.locator('body').innerText()}; errors: ${errors.join('; ')}`,
        );
        throw error;
      });
    assert.equal(await frameworkPage.locator('svg title').textContent(), 'Checkout');
    const fallback = frameworkPage.locator('#static-fallback');
    await frameworkPage.waitForFunction(
      () => document.querySelector<HTMLImageElement>('#static-fallback')?.hidden,
    );
    await frameworkPage.getByRole('button', { name: 'Update source' }).click();
    await frameworkPage.waitForFunction(() =>
      document.querySelector('.draft-viewer__viewport svg')?.textContent?.includes('Archive'),
    );
    const handleKey = name === 'react-viewer' ? '__reactViewerHandles' : '__solidViewerHandles';
    const handlesBeforeUnmount = await frameworkPage.evaluate(
      key => (window as any)[key].length,
      handleKey,
    );
    if (name === 'react-viewer') {
      assert.ok(
        handlesBeforeUnmount >= 2,
        'React Strict Mode did not mount, clean up, and mount again',
      );
      const strictCleanup = await frameworkPage.evaluate(
        key => (window as any)[key][0].update(''),
        handleKey,
      );
      assert.equal(strictCleanup.status, 'destroyed');
    }
    await frameworkPage.getByRole('button', { name: 'Unmount viewer' }).click();
    await frameworkPage.waitForFunction(() => !document.querySelector('.draft-viewer__viewport'));
    assert.equal(await fallback.isVisible(), true);
    const lastHandleResult = await frameworkPage.evaluate(
      key => (window as any)[key].at(-1).update(''),
      handleKey,
    );
    assert.equal(lastHandleResult.status, 'destroyed');
    await frameworkPage.getByRole('button', { name: 'Mount viewer' }).click();
    await frameworkPage.waitForFunction(
      () => !!document.querySelector('.draft-viewer__viewport svg'),
    );
    await frameworkPage.waitForFunction(
      () => document.querySelector<HTMLImageElement>('#static-fallback')?.hidden,
    );
    assert.ok(await frameworkPage.evaluate(key => (window as any)[key].length > 1, handleKey));
    assert.deepEqual(errors, []);
    await frameworkPage.close();
    console.log(`PASS packed ${name} mount, update, cleanup, fallback, and remount`);
  }
} finally {
  for (const child of devServers) child.kill('SIGTERM');
  await browser.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
