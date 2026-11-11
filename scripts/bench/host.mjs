#!/usr/bin/env node
/**
 * Host contract budgets (docs/intent/host-contract/plan.md, "Performance"): the built
 * `@draftably/runtime` element on plain pages in Chromium, with no bundler.
 *
 *   pnpm bench:host [--runs 5] [--out tmp/bench/host.json] [--strict]
 *   node scripts/bench/host.mjs --serve   (prints the page URL; add ?n=2&dark for the dark tokens)
 *
 * Each row prints median and p95 over the runs, the budget, and ✓ or ✗. Cold loads run with a 4×
 * CPU throttle. The exit code is 0 whatever the times, unless `--strict` is passed.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'packages/runtime/dist');
const opt = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const runs = Number(opt('runs', 5));
const out = path.resolve(root, opt('out', 'tmp/bench/host.json'));
const strict = process.argv.includes('--strict');
if (!fs.existsSync(path.join(dist, 'element.js'))) throw Error('Run pnpm runtime:build first.');

const source = fs.readFileSync(path.join(root, 'scripts/bench/diagrams/xl-triggers.draft'), 'utf8');
const nodes = source.match(/^node /gm).length;
/** 200 nodes in ten rows of twenty, each joined to the next: the geometry() row. */
const big = [
  'diagram "Big" version=1',
  ...Array.from({ length: 200 }, (_, i) => `node n${i} "Node ${i}"`),
  ...Array.from({ length: 199 }, (_, i) => `edge e${i} n${i} -> n${i + 1}`),
].join('\n');

/** A plain page: `n` elements of the 28-box file, each a label of its own. */
const page = query => `<!doctype html><meta charset="utf-8"><title>host bench</title>
<style>body{margin:0}draft-diagram{height:240px}</style>
<style media="${new URLSearchParams(query).has('dark') ? 'all' : 'not all'}">
body{background:#020617}draft-diagram{--draft-bg:#0f172a;--draft-ink:#e2e8f0;--draft-border:#334155;--draft-focus:#38bdf8}
</style>
<script type="module">
const q = new URLSearchParams(${JSON.stringify(query)});
const n = Number(q.get('n') ?? 1);
const source = q.has('big') ? ${JSON.stringify(big)} : ${JSON.stringify(source)};
window.__long = 0;
new PerformanceObserver(list => {
  for (const e of list.getEntries()) window.__long = Math.max(window.__long, e.duration);
}).observe({ type: 'longtask', buffered: true });
window.committed = el =>
  new Promise(resolve => {
    const on = e => {
      if (e.detail.status !== 'committed') return;
      el.removeEventListener('draft-update', on);
      resolve(performance.now());
    };
    el.addEventListener('draft-update', on);
  });
window.add = () => {
  const el = document.createElement('draft-diagram');
  if (q.has('big')) el.options = { execution: { mode: 'worker', timeoutMs: 120000 } };
  el.source = source;
  document.body.append(el);
  return el;
};
/** The first update of an element, whatever its status. */
window.settled = el =>
  new Promise(resolve =>
    el.addEventListener(
      'draft-update',
      e => resolve({ status: e.detail.status, t: performance.now() }),
      { once: true },
    ),
  );
window.loaded = import('/dist/element.js');
const first = q.has('empty') ? [] : Array.from({ length: n }, window.add).map(window.settled);
window.firstUpdates = Promise.all(first);
window.firstCommit = q.has('empty')
  ? undefined
  : window.firstUpdates.then(all => Math.max(...all.map(u => u.t)));
</script>`;

const types = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/page.html') {
    res.setHeader('content-type', 'text/html');
    return res.end(page(url.search));
  }
  const file = path.join(dist, decodeURIComponent(url.pathname.replace(/^\/dist\//, '')));
  if (!file.startsWith(dist) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
  res.setHeader('cache-control', 'max-age=3600');
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
if (process.argv.includes('--serve')) {
  console.log(base);
  await new Promise(() => {});
}

const browser = await chromium.launch();
const sorted = xs => [...xs].sort((a, b) => a - b);
const median = xs => sorted(xs)[Math.floor(xs.length / 2)];
const p95 = xs => sorted(xs)[Math.min(xs.length - 1, Math.ceil(xs.length * 0.95) - 1)];
const rows = [];
const row = (area, budget, measured, ok) => {
  rows.push({ area, budget, measured, ok });
  console.error(`${ok ? '✓' : '✗'} ${area}: ${measured} (budget ${budget})`);
};
const ms = xs => `${Math.round(median(xs))} ms median, ${Math.round(p95(xs))} ms p95`;

async function open(query, { throttle = 1, context } = {}) {
  const ctx = context ?? (await browser.newContext());
  const tab = await ctx.newPage();
  const cdp = await ctx.newCDPSession(tab);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const scripts = [],
    workers = [];
  tab.on('request', r => {
    if (r.url().endsWith('.js')) scripts.push(r.url());
  });
  tab.on('worker', w => workers.push(w.url()));
  await tab.goto(`${base}/page.html?${query}`);
  return { ctx, tab, cdp, scripts, workers };
}

// Main-thread JS on a viewer-only page, gzip -9, before and through the first commit.
{
  const { ctx, tab, scripts, workers } = await open('n=1');
  await tab.evaluate(() => window.firstCommit);
  const worker = new Set(workers);
  const main = [...new Set(scripts)].filter(u => !worker.has(u));
  const kb =
    main.reduce((sum, u) => {
      const file = path.join(dist, new URL(u).pathname.replace(/^\/dist\//, ''));
      return sum + zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
    }, 0) / 1024;
  const editor = scripts.some(u => /editor/.test(u));
  row(
    'Main-thread JS, viewer-only page',
    '≤ 40 KB gz; no editor request',
    `${kb.toFixed(1)} KB gz in ${main.length} files; editor request: ${editor ? 'yes' : 'no'}`,
    kb <= 40 && !editor,
  );
  await ctx.close();
}

// First diagram: navigation to the committed update, cold (4× CPU) and warm (cached, no throttle).
{
  const cold = [],
    warm = [];
  for (let i = 0; i < runs; i++) {
    const first = await open('n=1', { throttle: 4 });
    cold.push(await first.tab.evaluate(() => window.firstCommit));
    await first.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await first.tab.reload();
    warm.push(await first.tab.evaluate(() => window.firstCommit));
    await first.ctx.close();
  }
  row(`First diagram, ${nodes}-box file, cold (4× CPU)`, '≤ 1 s', ms(cold), median(cold) <= 1000);
  row(`First diagram, ${nodes}-box file, warm`, '≤ 300 ms', ms(warm), median(warm) <= 300);
}

// Source update to commit, on a page that already drew the file.
{
  const { ctx, tab } = await open('n=1');
  await tab.evaluate(() => window.firstCommit);
  const times = [];
  for (let i = 0; i < Math.max(runs, 10); i++)
    times.push(
      await tab.evaluate(async i => {
        const el = document.querySelector('draft-diagram');
        const done = window.committed(el);
        const t = performance.now();
        el.source = el.source.replace(/"[^"]*"/, `"Update ${i}"`);
        return (await done) - t;
      }, i),
    );
  row(`Source update to commit, ${nodes} boxes`, '≤ 200 ms', ms(times), median(times) <= 200);
  await ctx.close();
}

// 20 instances, then 20 updates each: workers, stylesheets, fonts and long tasks.
const pool = Math.max(1, Math.min(4, os.cpus().length - 1));
{
  const { ctx, tab, workers } = await open('n=20');
  const first = await tab.evaluate(() => window.firstUpdates);
  const committed = first.filter(u => u.status === 'committed').length;
  row(
    `20 instances of the ${nodes}-box file`,
    'every diagram commits; no timeouts',
    `${committed}/20 committed; last at ${Math.round(Math.max(...first.map(u => u.t)))} ms`,
    committed === 20,
  );
  await tab.evaluate(async () => {
    const els = [...document.querySelectorAll('draft-diagram')];
    for (let round = 0; round < 20; round++)
      await Promise.all(
        els.map((el, i) => {
          const done = window.committed(el);
          el.source = el.source.replace(/"[^"]*"/, `"R${round} ${i}"`);
          return done;
        }),
      );
  });
  const page = await tab.evaluate(() => {
    const els = [...document.querySelectorAll('draft-diagram')];
    const sheets = new Set();
    let styles = 0;
    for (const el of els) {
      for (const s of el.shadowRoot.adoptedStyleSheets) sheets.add(s);
      styles += el.shadowRoot.querySelectorAll(':scope > style').length;
    }
    return { sheets: sheets.size + styles, fonts: document.fonts.size, long: window.__long };
  });
  row(
    'Workers, 20 instances × 20 updates',
    `≤ min(4, cores − 1) = ${pool} render workers per page`,
    `${workers.length} created`,
    workers.length <= pool,
  );
  row(
    '20 instances: stylesheets, fonts, long tasks',
    '1 sheet; 1 font set; no long task over 200 ms',
    `${page.sheets} sheets; ${page.fonts} font faces; longest task ${Math.round(page.long)} ms`,
    page.sheets === 1 && page.long <= 200,
  );
  await ctx.close();
}

// geometry() at 200 nodes: one object per revision, read in well under 1 ms.
{
  const { ctx, tab } = await open('n=1&big');
  await tab.evaluate(() => window.firstUpdates);
  const g = await tab.evaluate(() => {
    const viewer = document.querySelector('draft-diagram').viewer;
    const first = viewer.geometry();
    const t = performance.now();
    let same = true;
    for (let i = 0; i < 1000; i++) same &&= viewer.geometry() === first;
    return {
      ms: (performance.now() - t) / 1000,
      same,
      nodes: Object.keys(first?.nodes ?? {}).length,
    };
  });
  row(
    'geometry() at 200 nodes',
    '≤ 1 ms; the same object for one revision',
    `${g.ms.toFixed(4)} ms per call; ${g.nodes} nodes; same object: ${g.same ? 'yes' : 'no'}`,
    g.ms <= 1 && g.same && g.nodes === 200,
  );
  await ctx.close();
}

// Mount and destroy 50 times: heap, workers, fonts and listeners back at baseline.
{
  const { ctx, tab, cdp } = await open('empty');
  await tab.waitForFunction(() => customElements.get('draft-diagram'));
  const measure = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize;
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'document' });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
      objectId: result.objectId,
    });
    const fonts = await tab.evaluate(() => document.fonts.size);
    return { heap, listeners: listeners.length, fonts, workers: tab.workers().length };
  };
  const cycle = () =>
    tab.evaluate(async () => {
      const el = window.add();
      await window.committed(el);
      el.remove();
    });
  // Warm the JIT and caches first: the heap grows about 10 % over the first 25 cycles, then holds.
  for (let i = 0; i < 25; i++) await cycle();
  await tab.waitForTimeout(500);
  const before = await measure();
  for (let i = 0; i < 50; i++) await cycle();
  await tab.waitForTimeout(500);
  const after = await measure();
  const growth = (after.heap - before.heap) / before.heap;
  row(
    'Mount and destroy, 50 cycles',
    'heap within 5 %; listeners, workers, fonts at baseline',
    `heap ${Math.round(before.heap / 1024)}→${Math.round(after.heap / 1024)} KB (${(growth * 100).toFixed(1)} %); listeners ${before.listeners}→${after.listeners}; workers ${before.workers}→${after.workers}; fonts ${before.fonts}→${after.fonts}`,
    growth <= 0.05 &&
      after.listeners <= before.listeners &&
      after.workers <= before.workers &&
      after.fonts <= before.fonts,
  );
  await ctx.close();
}

await browser.close();
server.close();
const machine = `${os.cpus()[0].model}, ${os.cpus().length} cores, ${os.platform()} ${os.release()}`;
const table = [
  `Host contract budgets, ${runs} runs, ${machine}:`,
  '',
  '| Area | Budget | Measured | |',
  '| --- | --- | --- | --- |',
  ...rows.map(r => `| ${r.area} | ${r.budget} | ${r.measured} | ${r.ok ? '✓' : '✗'} |`),
].join('\n');
console.log(table);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ machine, runs, rows }, null, 2));
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
if (strict && rows.some(r => !r.ok)) process.exit(1);
