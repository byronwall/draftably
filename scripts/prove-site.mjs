#!/usr/bin/env node
/**
 * The public site as a visitor reaches it (docs/intent/public-site/usability-audit-2026-10-29).
 *
 * Serves dist-site/ the way GitHub Pages does and drives it in Chromium with real clicks and keys:
 * the links between surfaces, narrow panes, docs overlays, New, Space and a Playground module that
 * fails to load. Direct URLs alone would miss most of these failures. Screenshots go to
 * tmp/proof-site/.
 *
 * Run `pnpm site:build` first. Usage: pnpm prove:site
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createProof, sleep, waitFor as wait } from './lib/proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist-site');
const proof = createProof(path.join(root, 'tmp/proof-site'));
const { check } = proof;
const BASE = '/draftably/';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

/** A file by path, a folder's index.html, or 404.html with a 404: what GitHub Pages does. */
const server = http.createServer((req, res) => {
  const route = decodeURIComponent(new URL(req.url, 'http://site').pathname);
  const send = (file, status = 200) => {
    res.writeHead(status, { 'content-type': TYPES[path.extname(file)] ?? 'text/plain' });
    fs.createReadStream(file).pipe(res);
  };
  const local = path.join(dist, route.slice(BASE.length - 1));
  const file = [local, path.join(local, 'index.html'), `${local}.html`].find(
    f => route.startsWith(BASE) && fs.existsSync(f) && fs.statSync(f).isFile(),
  );
  send(file ?? path.join(dist, '404.html'), file ? 200 : 404);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const site = `http://127.0.0.1:${server.address().port}${BASE}`;

const browser = await chromium.launch();
const open = async (url, viewport = { width: 1440, height: 900 }) => {
  // A new context each time: nothing kept in the browser leaks from one journey to the next.
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  proof.watch(page);
  page.on('dialog', d => d.accept());
  await page.goto(`${site}${url}`);
  return page;
};
const FILE = '[aria-label="File and examples"]';
const editorReady = page =>
  wait(page, () => !!document.querySelector('.canvas [data-id], .start'), 'the editor', 10000);
const focused = page =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('aria-label') || el?.textContent?.trim().slice(0, 40) || el?.tagName;
  });
const inside = (page, selector) =>
  page.evaluate(s => !!document.activeElement?.closest(s), selector);
const setSource = async (page, text) => {
  await page.click('.cm-content');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
};
const sourceText = page => page.evaluate(() => document.querySelector('.cm-content')?.textContent);

const journeys = {
  async 'landing links reach the editor and carry edits'() {
    const page = await open('');
    await page.click('text=Open the editor');
    await editorReady(page);
    check('U01 the landing link shows the editor at once', await page.isVisible('.canvas, .start'));
    await page.goBack();
    await wait(page, () => !!document.querySelector('.live'), 'the landing page');
    check('U01 Back returns to the landing page', true);

    await page.waitForSelector('.live-source textarea');
    await page.fill(
      '.live-source textarea',
      'diagram "Landing edit" version=1\nnode a "My edit"\n',
    );
    await sleep(700);
    await page.click('.live-open');
    await editorReady(page);
    await wait(page, () => document.body.textContent.includes('My edit'), 'the edited node');
    check('U03 the landing demo carries edited source', true);
    await page.context().close();
  },

  async 'narrow Playground'() {
    for (const width of [390, 768]) {
      const page = await open('play', { width, height: 844 });
      await page.waitForSelector('.play-body');
      if (await page.isVisible('.play-tabs')) await page.click('.play-tabs >> text=Source');
      await sleep(200);
      const w = await page.evaluate(() => document.querySelector('.play-source').offsetWidth);
      check(`U02 the source pane is usable at ${width}px`, w > 200, `${w}px wide`);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      check(`F08 no sideways scroll at ${width}px`, over <= 0, `${over}px over`);
      const names = await page.evaluate(() => ({
        github: document.querySelector('.site-nav-gh')?.getAttribute('aria-label'),
        theme: document.querySelector('.play-source select')?.getAttribute('aria-label'),
      }));
      check(`U08 names stay at ${width}px`, names.github === 'GitHub' && names.theme === 'Theme');
      await page.context().close();
    }
  },

  async 'Playground keeps work and refuses a mixed export'() {
    const page = await open('play');
    await page.waitForSelector('.cm-content');
    await setSource(page, 'diagram "Audit keep" version=1\nnode keep "Keep this work"\n');
    await wait(page, () => /#s=/.test(location.hash), 'the source hash');
    await page.click('.site-nav >> text=Docs');
    await page.waitForSelector('.docs-search-button');
    await page.click('.site-nav >> text=Playground');
    await page.waitForSelector('.cm-content');
    await sleep(300);
    check('U06 the nav returns to the same work', (await sourceText(page)).includes('Audit keep'));

    await setSource(page, 'diagram "Audit keep" version=1\nnode keep "Keep"\nkeep -> nothing\n');
    await sleep(700);
    await page.click('.play-actions .menu-wrap > .tool');
    const blocked = await page.evaluate(() =>
      [...document.querySelectorAll('#download-menu button')]
        .filter(b => /svg|png/i.test(b.textContent))
        .every(b => b.disabled || b.getAttribute('aria-disabled') === 'true'),
    );
    check('F04 image export is blocked while the source has errors', blocked);
    await page.context().close();
  },

  async 'native keys in the editor'() {
    const page = await open('app/?example=checkout');
    await editorReady(page);
    const held = () => page.evaluate(() => !!document.querySelector('.space-held'));
    const tabToFile = async () => {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        if ((await focused(page)) === 'File and examples') return;
      }
    };
    await tabToFile();
    await page.keyboard.down('Space');
    check('#306 Space on a focused button starts no pan', !(await held()));
    await page.keyboard.up('Space');
    await page.waitForSelector('.popover');
    check('#306 Space opens the File menu', true);
    await page.keyboard.press('Escape');

    await page.click('.canvas', { position: { x: 5, y: 5 } });
    await page.keyboard.down('Space');
    check('#306 Space on the canvas holds the pan', await held());
    await page.keyboard.up('Space');
    check('#306 keyup releases the pan', !(await held()));

    await page.click('[role="toolbar"] button');
    await page.keyboard.down('Space');
    check('#306 Space still pans after a toolbar click', await held());
    await page.keyboard.up('Space');
    await page.context().close();
  },

  async 'New from an example'() {
    const page = await open('app/?example=checkout');
    await editorReady(page);
    const opened = page.url();
    await page.click(FILE);
    await page.click('.popover >> text="New diagram"');
    await page.waitForURL(url => url.href !== opened, { timeout: 5000 });
    await editorReady(page);
    check('#305 File › New leaves the example URL', !page.url().includes('example=checkout'));
    const status = await page.locator('.in-example').textContent();
    check('#305 the blank draft is not called an example', !/example/i.test(status), status);
    const bar = await page.locator('.example-bar').textContent();
    check('#305 the bar says draft', /Draft/.test(bar) && !/example/i.test(bar), bar.slice(0, 80));
    check('#305 the tab title drops the example', !/example|checkout/i.test(await page.title()));
    await page.fill('.title-input', 'Audit new draft');
    await page.keyboard.press('Enter');
    await sleep(800);
    await page.reload();
    await editorReady(page);
    const kept = await page.inputValue('.title-input');
    check('#305 the new draft survives a reload', kept === 'Audit new draft', kept);
    await page.screenshot({ path: path.join(proof.out, 'new-draft.png') });
    await page.context().close();

    const start = await open('app/?example=checkout');
    await editorReady(start);
    await start.click(FILE);
    await start.click('.popover >> text=/New, open or example/');
    await start.waitForSelector('.start-dialog');
    const hint = await start.locator('.start-new').textContent();
    check('#305 the start dialog says what New does', /blank draft/.test(hint), hint.slice(0, 80));
    await start.click('.start-new button');
    await start.waitForURL(url => url.search.includes('new'), { timeout: 5000 });
    await editorReady(start);
    check('#305 the start dialog opens the same draft', !start.url().includes('checkout'));
    await start.context().close();

    // The browser copy stays the promised path outside an example.
    const copy = await open('app/');
    await editorReady(copy);
    await copy.click('.start-new button');
    const ok = copy.locator(
      'dialog button:has-text("New diagram"), .dialog button:has-text("New diagram")',
    );
    if (await ok.count()) await ok.first().click();
    await sleep(300);
    await copy.fill('.title-input', 'Browser copy');
    await copy.keyboard.press('Enter');
    await sleep(800);
    await copy.reload();
    await copy.waitForSelector('.title-input');
    await sleep(300);
    check(
      '#305 a browser copy survives a reload',
      (await copy.inputValue('.title-input')) === 'Browser copy',
    );
    await copy.context().close();
  },

  async 'docs overlays'() {
    const page = await open('docs/cells');
    await page.waitForSelector('.docs-search-button');
    await page.focus('.docs-search-button');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.search input');
    check('F06 search focuses its input', await inside(page, '.search'));
    const modal = await page.evaluate(
      () => !!document.querySelector('dialog.search-backdrop:modal'),
    );
    check('F06 search is a modal dialog', modal);
    for (const [state, text] of [
      ['empty', ''],
      ['results', 'swim'],
      ['no-results', 'zzzqq'],
    ]) {
      await page.fill('.search input', text);
      let held = true;
      for (const keys of ['Shift+Tab', 'Shift+Tab', 'Tab', 'Tab', 'Tab', 'Tab']) {
        await page.keyboard.press(keys);
        // The page behind is inert, so focus can only rest in the dialog or leave the document.
        held &&= await page.evaluate(
          () =>
            !document.activeElement ||
            document.activeElement === document.body ||
            !!document.activeElement.closest('dialog'),
        );
      }
      check(`F06 Tab stays in search (${state})`, held, await focused(page));
      await page.focus('.search input');
    }
    await page.fill('.search input', 'zzzqq');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await sleep(100);
    check(
      'F06 a sample button keeps Enter',
      (await page.inputValue('.search input')) !== 'zzzqq',
      await page.inputValue('.search input'),
    );
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await sleep(100);
    check('F06 Escape closes search from any control', !(await page.isVisible('.search')));
    check('F06 focus returns to the search button', (await focused(page)) === 'Search docs');

    await page.click('.doc-example-bar >> text=Expand');
    await page.waitForSelector('.zoom');
    check('U05 focus enters the expanded drawing', await inside(page, '.zoom'));
    let held = true;
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      held &&= await inside(page, '.zoom');
    }
    check('U05 Tab stays in the expanded drawing', held);
    const transform = () => page.locator('.zoom-paper').getAttribute('style');
    const fitted = await transform();
    await page.keyboard.press('+');
    await page.keyboard.press('ArrowLeft');
    check('U05 keys zoom and pan the drawing', (await transform()) !== fitted);
    await page.keyboard.press('Escape');
    check('U05 Escape closes the expanded drawing', !(await page.isVisible('.zoom')));
    check('U05 focus returns to the opener', (await focused(page)) === 'Expand');
    await page.context().close();
  },

  async 'the Playground fits examples and names them after Undo'() {
    const page = await open('play');
    await page.waitForSelector('.cm-content');
    const pick = async name => {
      await page.click('.picker-button');
      await page.fill('.picker-search', name);
      await page.keyboard.press('Enter');
      await sleep(900);
    };
    const clipped = () =>
      page.evaluate(() => {
        const frame = document.querySelector('.play-diagram').getBoundingClientRect();
        const box = document.querySelector('.play-diagram svg').getBoundingClientRect();
        return box.left < frame.left - 1 || box.right > frame.right + 1;
      });
    await pick('Sign-in');
    await pick('Kubernetes');
    check('U04 a large example opens inside its frame', !(await clipped()));
    await pick('TCP');
    await pick('Order lifecycle');
    check('U04 a wide example opens inside its frame', !(await clipped()));

    await page.click('.cm-content');
    await page.keyboard.press('ControlOrMeta+z');
    await sleep(500);
    const shown = await page.locator('.picker-button').textContent();
    check('F14 Undo restores the picker name', !/Order lifecycle/.test(shown), shown);
    await page.context().close();
  },

  async 'a docs edit reaches the Playground'() {
    const page = await open('docs/cells');
    const example = page.locator('.doc-example').first();
    const source = await example.locator('textarea').inputValue();
    await example.locator('textarea').fill(`# Docs edit\n${source}`);
    await sleep(500);
    await example.locator('.doc-example-play').click();
    await page.waitForSelector('.cm-content');
    check('the edited docs source arrives', (await sourceText(page)).includes('# Docs edit'));
    await page.context().close();
  },

  async 'an exported image opens again'() {
    const page = await open('play');
    await page.waitForSelector('.cm-content');
    await setSource(page, 'diagram "Round trip" version=1\nnode kept "Kept in the image"\n');
    await sleep(700);
    for (const kind of ['SVG', 'PNG']) {
      await page.click('.play-actions .menu-wrap > .tool');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click(`#download-menu button:has-text("${kind}")`),
      ]);
      const file = path.join(proof.out, `round-trip.${kind.toLowerCase()}`);
      await download.saveAs(file);
      await setSource(page, 'diagram "Other" version=1\nnode other "Other"\n');
      await sleep(500);
      await page.click('.picker-button');
      await page.setInputFiles('.picker-file input', file);
      await sleep(700);
      const text = await sourceText(page);
      check(`${kind} opens with its source`, text.includes('Kept in the image'), text.slice(0, 50));
    }
    await page.context().close();
  },

  async 'a stale drawing says so when expanded'() {
    const page = await open('docs/cells');
    const example = page.locator('.doc-example').first();
    const source = await example.locator('textarea').inputValue();
    await example.locator('textarea').fill(`${source}\nnope -> nothing\n`);
    await page.waitForSelector('.doc-drawing-error');
    await example.locator('.doc-example-bar >> text=Expand').click();
    await page.waitForSelector('.zoom');
    const said = await page.locator('.zoom').textContent();
    check('#308 the overlay names the last valid drawing', /last valid/i.test(said));
    check('#308 the overlay gives the error line', /line \d+/i.test(said));
    await page.screenshot({ path: path.join(proof.out, 'stale-zoom.png') });
    await page.keyboard.press('Escape');
    await example.locator('textarea').fill(source);
    await page.waitForFunction(() => !document.querySelector('.doc-drawing-error'));
    await example.locator('.doc-example-bar >> text=Expand').click();
    await page.waitForSelector('.zoom');
    const after = await page.locator('.zoom').textContent();
    check('#308 the notice clears after repair', !/last valid/i.test(after));
    await page.context().close();
  },

  async 'a Playground module that fails to load'() {
    const module = /Playground-[^/]*\.js/;
    const failed = async page => {
      await page.waitForSelector('.load-failed');
      await page.unroute(module);
      await page.screenshot({ path: path.join(proof.out, 'load-failed.png') });
      await page.click('.load-failed button');
      await page.waitForSelector('.cm-content');
    };

    const docs = await open('docs/cells');
    const example = docs.locator('.doc-example').first();
    const source = await example.locator('textarea').inputValue();
    await example.locator('textarea').fill(`# Kept through the failure\n${source}`);
    await sleep(500);
    await docs.route(module, r => r.abort());
    await example.locator('.doc-example-play').click();
    await failed(docs);
    check('#304 Reload keeps a docs edit', (await sourceText(docs)).includes('Kept through'));
    await docs.context().close();

    const home = await open('');
    await home.route(module, r => r.abort());
    await home.setInputFiles('.hero-reopen input[type="file"]', {
      name: 'dropped.draft',
      mimeType: 'text/plain',
      buffer: Buffer.from('diagram "Dropped" version=1\nnode a "From a file"\n'),
    });
    await failed(home);
    check('#304 Reload keeps a reopened file', (await sourceText(home)).includes('From a file'));
    await home.context().close();
  },

  async 'search answers tasks'() {
    const page = await open('docs');
    await page.waitForSelector('.docs-search-button');
    for (const query of ['reopen', 'export png', 'save diagram']) {
      await page.click('.docs-search-button');
      await page.fill('.search input', query);
      const first = await page.locator('.search-hit-title').first().textContent();
      check(`F11 "${query}" leads to a task`, /sav|export|reopen|open/i.test(first), first);
      await page.click('.search-backdrop', { position: { x: 4, y: 4 } });
    }
    await page.context().close();
  },

  async 'the editor links back to the site'() {
    const page = await open('app/?example=checkout');
    await editorReady(page);
    await page.click(FILE);
    const menu = await page.locator('.popover').textContent();
    check('U09 the File menu reaches the docs', /Docs/.test(menu), menu.slice(0, 80));
    check('U09 the File menu reaches the Playground', /Playground/.test(menu));
    await page.context().close();
  },
};

const only = process.argv[2];
for (const [name, run] of Object.entries(journeys)) {
  if (only && !name.includes(only)) continue;
  try {
    await run();
  } catch (error) {
    check(`${name} finished`, false, error.message.split('\n').slice(0, 3).join(' '));
    await Promise.all(browser.contexts().map(c => c.close()));
  }
}
await proof.capture();
await browser.close();
server.close();
proof.finish(dist);
