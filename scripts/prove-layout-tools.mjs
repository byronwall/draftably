#!/usr/bin/env node
/* global window, document -- page.evaluate callbacks run in the browser. */
/**
 * End-to-end proof for the layout tools in file mode (docs/intent/layout-in-files).
 *
 * Opens a copy of examples/order-pipeline.draft through `pnpm draftably open` and drives the real
 * editor in Chromium: apply a Compare candidate (a layout recipe), run Improve, keep a timeline
 * step, paint with the brush (positions), add content from outside, and restart. After each step
 * the browser's geometry must match `draftably inspect` of the saved file. Screenshots go to
 * tmp/proof-layout/.
 *
 * Run `pnpm build` first. Usage: pnpm prove:layout
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 5198;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-layout-proof-'));
const file = path.join(dir, 'pipeline.draft');
const out = path.join(root, 'tmp/proof-layout');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'examples/order-pipeline.draft'), file);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const cli = (...args) =>
  execFileSync(process.execPath, [path.join(root, 'scripts/draftably.mjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
const inspect = () => JSON.parse(cli('inspect', file, '--json'));
const read = () => fs.readFileSync(file, 'utf8');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stays = text => (text.match(/^stay /gm) ?? []).length;

function start() {
  const child = spawn(
    process.execPath,
    [path.join(root, 'scripts/draftably.mjs'), 'open', file, '--port', String(port), '--no-open'],
    { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] },
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

async function waitFor(page, test, label, timeout = 30000) {
  const until = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(test).catch(() => false)) return true;
    if (Date.now() > until) throw Error(`Timed out waiting for ${label}`);
    await sleep(50);
  }
}
/** Wait until a new revision is laid out, saved, and on disk. */
async function settled(page, previous) {
  const until = Date.now() + 15000;
  while (read() === previous && Date.now() < until) await sleep(50);
  await waitFor(
    page,
    () => {
      const state = window.diagramStudio.fileState();
      return state.status === 'saved' && !state.compiling;
    },
    'saved',
  );
  const shown = await page.evaluate(() => window.diagramStudio.fileState().source);
  return read() !== previous && read() === shown;
}
const browserGeometry = page => page.evaluate(() => window.diagramStudio.fileGeometry());
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const matches = async (page, name) =>
  check(`${name}: viewer matches draftably inspect`, same(await browserGeometry(page), inspect()));

async function shot(page, name) {
  await page.keyboard.press('1');
  await sleep(250);
  await page.screenshot({ path: path.join(out, name) });
}

let server = await start();
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
try {
  await page.goto(`http://127.0.0.1:${port}/?file=${path.basename(file)}`);
  await waitFor(page, () => !!window.diagramStudio?.fileState, 'viewer');
  await matches(page, 'opened file');

  // 1. Compare: apply the layered candidate. The file gets a layout recipe.
  let before = read();
  await page.keyboard.press('Alt+e');
  await waitFor(page, () => /\d+ of \d+ ready/.test(document.body.innerText), 'candidates');
  await page.screenshot({ path: path.join(out, 'layout-1-compare.png') });
  await page.getByRole('button', { name: 'Apply' }).nth(1).click();
  check('compare apply saved', await settled(page, before));
  check('compare wrote a recipe', /^layout root engine=layered$/m.test(read()));
  await matches(page, 'recipe');
  await shot(page, 'layout-2-recipe.png');

  // 2. Improve: a bounded pass, saved as positions.
  before = read();
  await page.keyboard.press('l');
  check('improve saved', await settled(page, before));
  check('improve wrote positions', stays(read()) > 0, `${stays(read())} stays`);
  await matches(page, 'improve');

  // 3. Timeline: record, scrub to the middle, keep that step.
  before = read();
  await page.keyboard.press('Alt+t');
  await waitFor(page, () => !!document.querySelector('.timeline-deck input[type=range]'), 'deck');
  await waitFor(
    page,
    () => Number(document.querySelector('.timeline-deck input[type=range]').max) > 2,
    'recorded steps',
  );
  await page.evaluate(() => {
    const slider = document.querySelector('.timeline-deck input[type=range]');
    slider.value = String(Math.round(Number(slider.max) / 2));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);
  await page.screenshot({ path: path.join(out, 'layout-3-timeline.png') });
  await page.getByRole('button', { name: /Keep & edit/ }).click();
  check('timeline step saved', await settled(page, before));
  check('timeline step wrote positions', read() !== before && stays(read()) > 0);
  await matches(page, 'timeline step');

  // 4. Brush: one stroke across the middle of the drawing.
  before = read();
  await page.keyboard.press('1');
  await page.keyboard.press('w');
  const canvas = await page.locator('.canvas').boundingBox();
  const y = canvas.y + canvas.height / 2;
  await page.mouse.move(canvas.x + canvas.width * 0.3, y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++)
    await page.mouse.move(canvas.x + canvas.width * (0.3 + i * 0.02), y);
  await page.mouse.up();
  check('brush stroke saved', await settled(page, before));
  await page.keyboard.press('w');
  await matches(page, 'brush');

  // 5. An agent adds a step; the saved arrangement holds and the new node fits in.
  const arranged = inspect();
  fs.appendFileSync(file, 'node audit "Audit trail" color=violet\nedge e13 ledger -> audit\n');
  await waitFor(
    page,
    () => window.diagramStudio.fileGeometry().nodes.some(n => n.id === 'audit'),
    'audit',
  );
  await waitFor(page, () => !window.diagramStudio.fileState().compiling, 'laid out');
  await matches(page, 'external addition');
  const added = inspect();
  const held = ['intake', 'web', 'partner', 'gateway'].filter(
    id =>
      !same(
        arranged.nodes.find(n => n.id === id),
        added.nodes.find(n => n.id === id),
      ),
  );
  check('distant arranged region stays put', held.length === 0, held.join(', '));
  await shot(page, 'layout-4-external-add.png');

  // 6. Restart: a fresh process and page draw the same thing.
  await stop(server);
  server = await start();
  await page.reload();
  await waitFor(page, () => window.diagramStudio?.fileState().status === 'saved', 'reload');
  await waitFor(page, () => !window.diagramStudio.fileState().compiling, 'laid out');
  check('restart reproduces geometry', same(await browserGeometry(page), added));
} catch (error) {
  check('proof ran to completion', false, error.message);
} finally {
  await browser.close();
  await stop(server);
}

const failed = results.filter(r => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed. Screenshots: tmp/proof-layout/`,
);
console.log(`Final file: ${file}`);
process.exit(failed.length ? 1 : 0);
