#!/usr/bin/env node
/* global window, document -- page.evaluate callbacks run in the browser. */
/**
 * End-to-end proof for file-backed editing (docs/intent/diagram-dsl, first proof).
 *
 * Opens a copy of examples/checkout.draft through `pnpm draftably open`, drives the real editor in
 * Chromium (drag, pin, resize, undo/redo, camera), adds content to the file from outside,
 * restarts the server, and checks that the browser's geometry matches `draftably inspect` throughout.
 * Also checks invalid source and a stale save. Screenshots go to tmp/proof/.
 *
 * Run `pnpm build` first. Usage: pnpm prove:file
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = process.env.DRAFTABLY_BIN ?? path.join(root, 'scripts/draftably.mjs');
const example = process.env.DRAFTABLY_EXAMPLE ?? path.join(root, 'examples/checkout.draft');
const port = 5199;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-proof-'));
const file = path.join(dir, 'architecture.draft');
const out = path.join(root, 'tmp/proof');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(example, file);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const cli = (...args) =>
  execFileSync(process.execPath, [entry, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
const inspect = () => JSON.parse(cli('inspect', file, '--json'));
const read = () => fs.readFileSync(file, 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function start() {
  const child = spawn(
    process.execPath,
    [entry, 'open', file, '--port', String(port), '--no-open'],
    { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  return new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => String(chunk).includes('Viewer:') && resolve(child));
    child.once('exit', code => reject(Error(`draftably open exited with ${code}`)));
  });
}
const stop = child =>
  new Promise(resolve => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
  });

async function waitFor(page, test, label, timeout = 4000) {
  const until = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(test).catch(() => false)) return true;
    if (Date.now() > until) throw Error(`Timed out waiting for ${label}`);
    await sleep(50);
  }
}
/** Wait until the viewer reports the file saved and the file holds what the viewer shows. */
async function settled(page) {
  await waitFor(page, () => window.diagramStudio.fileState().status === 'saved', 'saved');
  const shown = await page.evaluate(() => window.diagramStudio.fileState().source);
  const until = Date.now() + 2000;
  while (read() !== shown && Date.now() < until) await sleep(50);
  return read() === shown;
}
const browserGeometry = page => page.evaluate(() => window.diagramStudio.fileGeometry());
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rect = (geometry, id) => geometry.nodes.find(n => n.id === id);
const center = box => [box.x + box.width / 2, box.y + box.height / 2];
const box = (page, id) => page.locator(`[data-id="${id}"]`).first().boundingBox();

/** Fit the view (camera only; the file does not change) and save a screenshot. */
async function shot(page, name) {
  await page.keyboard.press('1');
  await sleep(250);
  await page.screenshot({ path: path.join(out, name) });
}

async function drag(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(
      from[0] + ((to[0] - from[0]) * i) / 12,
      from[1] + ((to[1] - from[1]) * i) / 12,
    );
  await page.mouse.up();
}

let server = await start();
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
try {
  await page.goto(`http://127.0.0.1:${port}/`);
  await waitFor(page, () => !!window.diagramStudio?.fileState, 'viewer');
  check('opened file matches draftably inspect', same(await browserGeometry(page), inspect()));

  // 1. Resize a group from its corner, making room below its row.
  const services = await box(page, 'services');
  await page.mouse.click(services.x + 90, services.y + 10);
  const corner = await page.locator('[data-resize="se"]').first().boundingBox();
  await drag(page, center(corner), [center(corner)[0] + 40, center(corner)[1] + 110]);
  check('resize saved', await settled(page));
  check(
    'resize wrote a requested group size',
    /^layout services row gap=56 min-width=\d+ min-height=\d+$/m.test(read()),
  );

  // 2. Drag a sibling inside the group: a relative preference, not coordinates.
  const orders = await box(page, 'orders'),
    payments = await box(page, 'payments');
  await drag(page, center(payments), [
    orders.x + orders.width / 2,
    orders.y + orders.height + 30 + payments.height / 2,
  ]);
  check('drag saved', await settled(page));
  check(
    'drag wrote a relative preference',
    /^near payments orders side=below gap=\d+/m.test(read()),
  );

  // 3. Pin another object.
  await page.mouse.click(...center(await box(page, 'api')));
  await page.keyboard.press('p');
  check('pin saved', await settled(page));
  check('pin wrote parent-local coordinates', /^pin api x=\d+ y=\d+$/m.test(read()));

  // 4. The camera is not part of the file.
  const bytes = read();
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, -400);
  await page.mouse.wheel(300, 0);
  await sleep(500);
  check('camera movement leaves the file unchanged', read() === bytes);

  // 5. Undo and redo write source.
  await page.keyboard.press('Meta+z');
  await settled(page);
  const undone = !/^pin api/m.test(read());
  await page.keyboard.press('Meta+Shift+z');
  await settled(page);
  check('undo and redo rewrite the file', undone && read() === bytes);

  const refined = inspect();
  check('refined file matches draftably inspect', same(await browserGeometry(page), refined));
  await shot(page, 'proof-1-refined.png');

  // 6. An agent adds a connected node to the same group.
  fs.appendFileSync(
    file,
    'node fraud "Fraud check" in=services\nedge score payments -> fraud "score"\n',
  );
  await waitFor(
    page,
    () => window.diagramStudio.fileGeometry().nodes.some(n => n.id === 'fraud'),
    'fraud',
  );
  const added = inspect(),
    text = read();
  check('external addition is visible', same(await browserGeometry(page), added));
  check(
    'comments and content survive',
    text.includes('# Customer-facing entry points.') && text.includes('# charges cards'),
  );
  const o = rect(added, 'orders'),
    p = rect(added, 'payments');
  const near = /^near payments orders side=below gap=(\d+)(?: offset=(-?\d+))?$/m.exec(text);
  check(
    'relative preference still holds',
    !!near &&
      p.y === o.y + o.h + Number(near[1]) &&
      p.x + p.w / 2 === o.x + o.w / 2 + Number(near[2] ?? 0),
  );
  const pin = /^pin api x=(\d+) y=(\d+)$/m.exec(text),
    platform = rect(added, 'platform'),
    api = rect(added, 'api');
  check(
    'pin holds in its group',
    !!pin &&
      api.x === platform.x + 24 + Number(pin[1]) &&
      api.y === platform.y + 48 + Number(pin[2]),
  );
  const steady = ['clients', 'web', 'mobile'].filter(
    id => !same(rect(refined, id), rect(added, id)),
  );
  check('distant region stays put', steady.length === 0, steady.join(', '));
  const notes = await page.evaluate(() => window.diagramStudio.fileState().diagnostics);
  const moved = ['platform', 'db'].filter(id => !same(rect(refined, id), rect(added, id)));
  check(
    'unavoidable movement is diagnosed',
    moved.every(id => notes.some(n => n.code === 'relaxed' && n.ids.includes(id))),
    moved.length ? `moved: ${moved.join(', ')}` : 'nothing else moved',
  );
  await shot(page, 'proof-2-external-add.png');
  await page.locator('.file-notes button').click();
  await page.screenshot({ path: path.join(out, 'proof-2-notes.png') });
  await page.locator('.file-notes button').click();

  // 7. Restart: a fresh process and a fresh page draw the same thing.
  await stop(server);
  server = await start();
  await page.reload();
  await waitFor(page, () => window.diagramStudio?.fileState().status === 'saved', 'reload');
  check(
    'restart reproduces geometry',
    same(await browserGeometry(page), added) && same(inspect(), added),
  );
  await shot(page, 'proof-3-restart.png');

  // 8. Invalid source keeps the last drawing and pauses writes.
  const valid = read();
  fs.appendFileSync(file, 'edge broken api -> nowhere\n');
  await waitFor(page, () => !!document.querySelector('.file-banner'), 'error banner');
  await page.mouse.click(...center(await box(page, 'db')));
  await page.keyboard.press('p');
  await sleep(300);
  check(
    'invalid source keeps the last drawing and is not overwritten',
    same(await browserGeometry(page), added) && read().endsWith('edge broken api -> nowhere\n'),
  );
  await shot(page, 'proof-4-invalid.png');
  fs.writeFileSync(file + '.tmp', valid);
  fs.renameSync(file + '.tmp', file);
  await waitFor(page, () => !document.querySelector('.file-banner'), 'banner cleared');

  // 9. A stale save is refused; the agent's change wins until the user decides.
  await page.mouse.click(...center(await box(page, 'db')));
  fs.appendFileSync(file, 'node audit "Audit log"\n');
  await page.keyboard.press('p');
  await waitFor(
    page,
    () => /changed on disk before/.test(document.querySelector('.file-banner')?.textContent ?? ''),
    'conflict',
    3000,
  ).catch(() => false);
  const conflict = await page.locator('.file-banner').isVisible();
  check(
    'stale save is refused and the newer file is kept',
    conflict && read().includes('node audit') && !/^pin db/m.test(read()),
  );
  await shot(page, 'proof-5-conflict.png');
  if (conflict) await page.getByRole('button', { name: 'Keep file' }).click();
} catch (error) {
  check('proof ran to completion', false, error.message);
} finally {
  await browser.close();
  await stop(server);
}

const failed = results.filter(r => !r.ok).length;
console.log(
  `\n${results.length - failed}/${results.length} checks passed. Screenshots: tmp/proof/`,
);
console.log(`Final file: ${file}`);
process.exitCode = failed ? 1 : 0;
