#!/usr/bin/env node
/**
 * The drawing follows the page's color scheme, on the built packages, in Chromium, Firefox and
 * WebKit. One plain page holds a `<draft-diagram>` and a `<draft-editor>` of a file with no theme
 * line, a `<draft-diagram>` forced light with `color-scheme: light`, and one of a file with its own
 * `theme drafting` line. It checks: a light page draws light; setting `color-scheme: dark` on the
 * page draws the viewer and the editor dark, with no new render and no moved box; the forced and
 * the themed diagrams stay light; the editor's controls follow the page unless it sets its own
 * `data-theme`; with no `color-scheme` on the page, the system setting decides.
 * Screenshots go to tmp/proof-color-scheme/.
 *
 * Usage: pnpm runtime:build && pnpm editor:build && node scripts/prove-color-scheme.mjs [chromium,firefox,webkit]
 */
/* global viewer, editor, forced, themed -- page globals in evaluate() */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright-core';
import { sleep } from './lib/proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tmp/proof-color-scheme');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const pkg of ['runtime/dist/element.js', 'editor/dist/element.js', 'runtime/dist/host.css'])
  if (!fs.existsSync(path.join(root, 'packages', pkg)))
    throw Error(`packages/${pkg} is missing: run pnpm runtime:build && pnpm editor:build`);

const source = fs.readFileSync(path.join(root, 'examples/checkout.draft'), 'utf8');
if (/^\s*theme\s/m.test(source)) throw Error('examples/checkout.draft must have no theme line.');
const themedSource = `theme drafting\n${source}`;

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Color scheme</title>
<link rel="stylesheet" href="/packages/runtime/dist/host.css">
<style>
  body { margin: 0; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  html.dark { color-scheme: dark; background: #0b0d10; }
  draft-diagram, draft-editor { height: 360px; }
  #forced { color-scheme: light; }
</style></head>
<body>
<draft-diagram id="viewer"></draft-diagram>
<draft-editor id="editor"></draft-editor>
<draft-diagram id="forced"></draft-diagram>
<draft-diagram id="themed"></draft-diagram>
<script type="module">
  const link = document.querySelector('link[rel=stylesheet]');
  if (!link.sheet) await new Promise(r => link.addEventListener('load', r, { once: true }));
  window.renders = 0;
  viewer.addEventListener('draft-render', () => window.renders++);
  for (const el of [viewer, forced, themed]) el.options = { toolbar: false };
  viewer.source = ${JSON.stringify(source)};
  forced.source = ${JSON.stringify(source)};
  themed.source = ${JSON.stringify(themedSource)};
  editor.source = ${JSON.stringify(source)};
  await import('/packages/runtime/dist/element.js');
  await import('/packages/editor/dist/element.js');
  await Promise.all([viewer, editor, forced, themed].map(el => el.updateComplete));
  await Promise.all([viewer.viewer.ready, forced.viewer.ready, themed.viewer.ready, editor.editor.ready]);
  window.ready = true;
</script>
</body></html>`;

const types = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/') return (res.setHeader('content-type', 'text/html'), res.end(page));
  const file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(path.join(root, 'packages')) || !fs.existsSync(file))
    return ((res.statusCode = 404), res.end());
  res.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

/** Canvas colors: the default theme's, and its dark variant's. */
const LIGHT = 'rgb(247, 247, 244)',
  DARK = 'rgb(22, 25, 30)';
/** The editor's own `--bg`, light and dark. */
const UI_LIGHT = '#f4f4f1',
  UI_DARK = '#16171a';
const engines = { chromium, firefox, webkit };
const only = process.argv[2]?.split(',') ?? Object.keys(engines);
const failures = [];

for (const name of only) {
  const browser = await engines[name].launch(
    name === 'chromium' ? { args: ['--use-mock-keychain', '--password-store=basic'] } : {},
  );
  const context = await browser.newContext({
    viewport: { width: 1280, height: 820 },
    colorScheme: 'light',
  });
  const tab = await context.newPage();
  const logs = [];
  tab.on('console', m => m.type() === 'error' && logs.push(m.text()));
  tab.on('pageerror', e => logs.push(`pageerror: ${e.message}`));
  const check = (label, ok, info) => {
    if (!ok) failures.push(`${name}: ${label}`);
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${name} ${label}${info === undefined ? '' : ` — ${JSON.stringify(info)}`}`,
    );
  };
  const frames = () =>
    tab.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  /** Each element's canvas color, the viewer's render count, and the boxes it drew. */
  const read = () =>
    tab.evaluate(() => {
      const canvas = el => {
        const svg = el.shadowRoot.querySelector('.draft-viewer__viewport > svg');
        return getComputedStyle(svg.querySelector(':scope > rect')).fill;
      };
      const stage = editor.shadowRoot.querySelector('.stage');
      const ui = editor.shadowRoot.querySelector('.draft-editor');
      return {
        viewer: canvas(viewer),
        editor: getComputedStyle(stage).backgroundColor,
        controls: getComputedStyle(ui).getPropertyValue('--bg').trim(),
        forced: canvas(forced),
        themed: canvas(themed),
        renders: window.renders,
        svg: viewer.shadowRoot.querySelector('.draft-viewer__viewport > svg'),
        boxes: JSON.stringify([viewer.viewer.geometry().nodes, editor.editor.geometry().nodes]),
      };
    });
  try {
    await tab.goto(base);
    await tab.waitForFunction(() => window.ready, null, { timeout: 30000 });
    await sleep(300);
    const light = await read();
    check(
      'a light page draws the viewer and the editor light',
      light.viewer === LIGHT &&
        light.editor === LIGHT &&
        light.forced === LIGHT &&
        light.controls === UI_LIGHT,
      { ...light, boxes: undefined },
    );
    await tab.screenshot({ path: path.join(out, `${name}-light.png`) });
    const svgBefore = await tab.evaluateHandle(() =>
      viewer.shadowRoot.querySelector('.draft-viewer__viewport > svg'),
    );

    // The page turns dark: a class flip that sets color-scheme.
    await tab.evaluate(() => document.documentElement.classList.add('dark'));
    await frames();
    await sleep(200);
    const dark = await read();
    const sameSvg = await tab.evaluate(
      before => before === viewer.shadowRoot.querySelector('.draft-viewer__viewport > svg'),
      svgBefore,
    );
    check(
      'color-scheme: dark on the page draws the viewer and the editor dark',
      dark.viewer === DARK && dark.editor === DARK,
      { viewer: dark.viewer, editor: dark.editor },
    );
    check(
      'the switch draws nothing again and moves no box',
      dark.renders === light.renders && sameSvg && dark.boxes === light.boxes,
      { renders: [light.renders, dark.renders], sameSvg },
    );
    check(
      "the editor's controls follow the page, with no data-theme",
      dark.controls === UI_DARK,
      dark.controls,
    );
    // An explicit data-theme wins over the page, and removing it follows the page again.
    const own = await tab.evaluate(async () => {
      const bg = () =>
        getComputedStyle(editor.shadowRoot.querySelector('.draft-editor'))
          .getPropertyValue('--bg')
          .trim();
      editor.dataset.theme = 'light';
      const light = bg();
      delete editor.dataset.theme;
      return { light, back: bg() };
    });
    check(
      'data-theme="light" on the editor keeps its controls light on a dark page',
      own.light === UI_LIGHT && own.back === UI_DARK,
      own,
    );
    await tab.screenshot({
      path: path.join(out, `${name}-editor-dark.png`),
      clip: await tab.evaluate(() => {
        const r = editor.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    });
    check(
      'color-scheme: light on the element stays light on a dark page',
      dark.forced === LIGHT,
      dark.forced,
    );
    check('a file with its own theme line stays light on a dark page', dark.themed === LIGHT);
    await tab.screenshot({ path: path.join(out, `${name}-dark.png`) });

    // Back to light, live.
    await tab.evaluate(() => document.documentElement.classList.remove('dark'));
    await frames();
    await sleep(200);
    const back = await read();
    check(
      'removing the class draws light again',
      back.viewer === LIGHT && back.editor === LIGHT,
      back.viewer,
    );

    // No color-scheme on the page: the system setting decides.
    await tab.emulateMedia({ colorScheme: 'dark' });
    await frames();
    await sleep(200);
    const system = await read();
    check(
      'with no color-scheme on the page, a dark system setting draws dark',
      system.viewer === DARK && system.editor === DARK && system.forced === LIGHT,
      { viewer: system.viewer, editor: system.editor, forced: system.forced },
    );
  } catch (e) {
    check('ran to completion', false, String(e.message).split('\n')[0]);
    await tab.screenshot({ path: path.join(out, `${name}-failure.png`) }).catch(() => {});
  }
  if (logs.length) console.log(`${name} console: ${logs.slice(0, 5).join(' | ')}`);
  await browser.close();
}
server.close();
if (failures.length) {
  console.log(`\nFAILED:\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
