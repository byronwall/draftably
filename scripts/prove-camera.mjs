#!/usr/bin/env node
/**
 * One camera for both handles. Serves tests/browser/camera.html through Vite: a viewer and an
 * editor of one file, side by side at one size. Checks that both report `{ centerX, centerY,
 * zoom }`, frame the same items at the same world point and zoom, reveal with the least move,
 * share the zoom range, send at most one camera event per frame during a drag, and run a fit
 * asked for before the viewport had a size. Screenshots go to tmp/proof-camera/.
 *
 * Usage: pnpm prove:camera
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { createProof, sleep, waitFor } from './lib/proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proof = createProof(path.join(root, 'tmp/proof-camera'));
const { check } = proof;

const server = await createServer({ root, server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = `${server.resolvedUrls.local[0]}tests/browser/camera.html`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
proof.watch(page);

const near = (a, b, tolerance) =>
  Math.abs(a.centerX - b.centerX) <= tolerance &&
  Math.abs(a.centerY - b.centerY) <= tolerance &&
  Math.abs(a.zoom - b.zoom) <= 0.02 * a.zoom;
const fmt = c => `(${c.centerX.toFixed(1)}, ${c.centerY.toFixed(1)}) × ${c.zoom.toFixed(3)}`;

try {
  await page.goto(url);
  await page.evaluate(() => window.ready);
  await sleep(500);
  const shapes = await page.evaluate(() => [
    Object.keys(window.viewer.getCamera()).sort(),
    Object.keys(window.editor.getCamera()).sort(),
  ]);
  check(
    'both handles report { centerX, centerY, zoom }',
    shapes.every(k => k.join() === 'centerX,centerY,zoom'),
    JSON.stringify(shapes),
  );

  // Frame the same two items in both. The panes are the same size, so the cameras must match.
  const framed = await page.evaluate(() => {
    const r = [window.viewer.fit(['api', 'db']), window.editor.fit(['api', 'db'])];
    return { r, viewer: window.viewer.getCamera(), editor: window.editor.getCamera() };
  });
  check('fit(ids) moves both', framed.r.join() === 'moved,moved', framed.r.join());
  check(
    'fit(ids) frames the same world point at the same zoom in both',
    near(framed.viewer, framed.editor, 4),
    `viewer ${fmt(framed.viewer)}, editor ${fmt(framed.editor)}`,
  );
  await sleep(300);
  await page.screenshot({ path: path.join(proof.out, 'fit-api-db.png') });

  const again = await page.evaluate(() => [
    window.viewer.fit(['api', 'db']),
    window.editor.fit(['api', 'db']),
    window.viewer.fit(['nope']),
    window.editor.fit(['nope']),
  ]);
  check(
    'a repeated fit is unchanged; unknown ids are missing',
    again.join() === 'unchanged,unchanged,missing,missing',
    again.join(),
  );

  const revealed = await page.evaluate(() => {
    for (const h of [window.viewer, window.editor]) h.setCamera({ ...h.getCamera(), zoom: 1 });
    const before = [window.viewer.getCamera(), window.editor.getCamera()];
    const r = [window.viewer.reveal('worker'), window.editor.reveal('worker')];
    return { r, before, after: [window.viewer.getCamera(), window.editor.getCamera()] };
  });
  check(
    'reveal keeps the zoom when the item fits',
    revealed.after.every((c, i) => Math.abs(c.zoom - revealed.before[i].zoom) < 1e-6),
    revealed.r.join(),
  );
  // The viewer's viewport is shorter than the editor's canvas (toolbar and outline), so their
  // least moves differ; each must now hold the item, so a second reveal moves nothing.
  const twice = await page.evaluate(() => [
    window.viewer.reveal('worker'),
    window.editor.reveal('worker'),
  ]);
  check(
    'after reveal the item is in view: a second reveal is unchanged',
    twice.join() === 'unchanged,unchanged',
    `${twice.join()}; viewer ${fmt(revealed.after[0])}, editor ${fmt(revealed.after[1])}`,
  );

  // A group and an edge frame and reveal the same way in both.
  for (const id of ['back', 'e4']) {
    const both = await page.evaluate(id => {
      const r = [window.viewer.fit([id]), window.editor.fit([id])];
      return { r, viewer: window.viewer.getCamera(), editor: window.editor.getCamera() };
    }, id);
    check(
      `fit(['${id}']) frames the same camera in both`,
      both.r.every(x => x !== 'missing') && near(both.viewer, both.editor, 4),
      `${both.r.join()}; viewer ${fmt(both.viewer)}, editor ${fmt(both.editor)}`,
    );
    const shown = await page.evaluate(id => {
      for (const h of [window.viewer, window.editor])
        h.setCamera({ centerX: -2000, centerY: -2000, zoom: 1 });
      const r = [window.viewer.reveal(id), window.editor.reveal(id)];
      return [...r, window.viewer.reveal(id), window.editor.reveal(id)];
    }, id);
    check(
      `reveal('${id}') moves both, then holds`,
      shown.join() === 'moved,moved,unchanged,unchanged',
      shown.join(),
    );
  }

  const zooms = await page.evaluate(() =>
    [window.viewer, window.editor].map(h => {
      h.setCamera({ ...h.getCamera(), zoom: 0.03 });
      const low = h.getCamera().zoom;
      h.setCamera({ ...h.getCamera(), zoom: 50 });
      return [low, h.getCamera().zoom];
    }),
  );
  check(
    'both share the zoom range 0.02–8',
    zooms.every(([low, high]) => Math.abs(low - 0.03) < 1e-9 && high === 8),
    JSON.stringify(zooms),
  );

  // A drag pan in each: at most one camera event per animation frame, reason user.
  await page.evaluate(() => {
    window.viewer.fit();
    window.editor.fit();
  });
  await sleep(300);
  for (const side of ['viewer', 'editor']) {
    await page.evaluate(s => (window.events[s].length = 0), side);
    const box = await page
      .locator(side === 'viewer' ? '#viewer .draft-viewer__viewport' : '#editor')
      .boundingBox();
    const frames = await page.evaluate(() => {
      window.__frames = 0;
      const tick = () => {
        window.__frames++;
        if (window.__frames < 1e6) window.__raf = requestAnimationFrame(tick);
      };
      window.__raf = requestAnimationFrame(tick);
    });
    void frames;
    // Background at the left edge, in the fit's padding, clear of shapes and the outline.
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 20, y);
    await page.mouse.down({ button: side === 'editor' ? 'middle' : 'left' });
    for (let i = 1; i <= 30; i++) await page.mouse.move(box.x + 20 + i * 6, y - i * 3);
    await page.mouse.up({ button: side === 'editor' ? 'middle' : 'left' });
    await sleep(100);
    const got = await page.evaluate(s => {
      cancelAnimationFrame(window.__raf);
      return { events: window.events[s], frames: window.__frames };
    }, side);
    check(
      `${side}: a drag sends camera events, at most one per frame, reason user`,
      got.events.length > 1 &&
        got.events.length <= got.frames &&
        got.events.every(e => e.reason === 'user'),
      `${got.events.length} events in ${got.frames} frames`,
    );
  }
  await page.screenshot({ path: path.join(proof.out, 'after-pan.png') });

  // A viewer inside a hidden box: fit waits for a size, then runs.
  const pending = await page.evaluate(() => window.hidden.fit(['api']));
  check('fit before the viewport has a size returns pending', pending === 'pending', pending);
  await page.evaluate(() => {
    document.getElementById('hidden').style.display = 'block';
  });
  await waitFor(
    page,
    () => window.hidden.getCamera().zoom !== 1 || window.hidden.getCamera().centerX !== 0,
    'hidden fit',
  );
  check('the pending fit runs once the viewport has a size', true);
} catch (error) {
  check('proof ran to completion', false, error.message);
} finally {
  await proof.capture();
  await browser.close();
  await server.close();
  proof.finish(url);
}
