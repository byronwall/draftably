/**
 * Installs the packed runtime and framework packages into the React, Solid, Vue and Svelte
 * examples, then proves each one end to end: a production build, a server render that already
 * holds every diagram as SVG, and a browser page where three diagrams draw, one updates and one
 * is removed without console errors. Run `pnpm runtime:build && pnpm frameworks:build` first.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'tmp/frameworks');
const only = process.argv.slice(2);
const FRAMEWORKS = (only.length ? only : ['react', 'solid', 'vue', 'svelte']) as string[];
rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'packs'), { recursive: true });

const pack = (dir: string) =>
  JSON.parse(
    execFileSync('pnpm', ['pack', '--json', '--pack-destination', path.join(out, 'packs')], {
      cwd: path.join(root, 'packages', dir),
      encoding: 'utf8',
    }),
  ).filename as string;
const runtime = pack('runtime');
cpSync(path.join(root, 'integration-examples/frameworks'), path.join(out, 'apps'), {
  recursive: true,
});

const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css' };
function serve(dir: string): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let file = path.join(dir, decodeURIComponent(url.pathname));
    if (!existsSync(file) || file.endsWith('/')) file = path.join(dir, 'index.html');
    res.setHeader('content-type', types[path.extname(file)] ?? 'text/html');
    res.end(readFileSync(file));
  });
  return new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${port}/`, close: () => server.close() });
    }),
  );
}

const browser = await chromium.launch();
const failures: string[] = [];
for (const fw of FRAMEWORKS) {
  const app = path.join(out, 'apps', fw);
  const tarball = pack(fw);
  const manifest = JSON.parse(readFileSync(path.join(app, 'package.json'), 'utf8'));
  manifest.dependencies[`@draftably/${fw}`] = `file:${tarball}`;
  manifest.dependencies['@draftably/runtime'] = `file:${runtime}`;
  writeFileSync(path.join(app, 'package.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(
    path.join(app, 'pnpm-workspace.yaml'),
    `packages: []\noverrides:\n  '@draftably/runtime': 'file:${runtime}'\nallowBuilds:\n  esbuild: true\n`,
  );
  const run = (...args: string[]) =>
    execFileSync('pnpm', args, { cwd: app, stdio: 'pipe', encoding: 'utf8' });
  try {
    run('install');
    run('exec', 'vite', 'build');

    // Server render: every diagram is already in the HTML as SVG, before any JavaScript runs.
    const entry = existsSync(path.join(app, 'src/entry-server.tsx'))
      ? '/src/entry-server.tsx'
      : '/src/entry-server.ts';
    writeFileSync(
      path.join(app, 'ssr-check.mjs'),
      `import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const html = await (await vite.ssrLoadModule(${JSON.stringify(entry)})).render();
await vite.close();
process.stdout.write(html);`,
    );
    const html = execFileSync('node', ['ssr-check.mjs'], { cwd: app, encoding: 'utf8' });
    assert.equal(html.match(/<draft-diagram/g)?.length, 3, `${fw}: SSR draws three elements`);
    assert.equal(html.match(/<svg/g)?.length, 3, `${fw}: SSR holds three static SVGs`);
    assert.match(html, /Gamma user/, `${fw}: SSR SVG holds the diagram's text`);

    // Browser: three viewers draw, the first updates, the last unmounts.
    const server = await serve(path.join(app, 'dist'));
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(server.url);
    const drawn = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('draft-diagram')].map(
          el =>
            el.shadowRoot?.querySelector('.draft-diagram__viewer:not([hidden]) svg')?.textContent ??
            '',
        ),
      );
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('draft-diagram')].filter(el =>
          el.shadowRoot?.querySelector('.draft-diagram__viewer:not([hidden]) svg'),
        ).length === 3,
      undefined,
      { timeout: 20000 },
    );
    const before = await drawn();
    assert.ok(before[1].includes('Beta worker'), `${fw}: second diagram shows its own source`);
    await page.click('#update');
    await page.waitForFunction(
      () =>
        document
          .querySelector('draft-diagram')
          ?.shadowRoot?.querySelector('svg')
          ?.textContent?.includes('Updated API'),
      undefined,
      { timeout: 10000 },
    );
    const after = await drawn();
    assert.equal(after[1], before[1], `${fw}: updating the first diagram leaves the second alone`);
    await page.click('#remove');
    await page.waitForFunction(() => document.querySelectorAll('draft-diagram').length === 2);
    const updates = await page.evaluate(() => (window as { __updates?: string[] }).__updates ?? []);
    assert.ok(
      updates.filter(s => s === 'committed').length >= 4,
      `${fw}: onUpdate reports commits`,
    );
    await page.screenshot({ path: path.join(out, `${fw}.png`), fullPage: true });
    assert.deepEqual(errors, [], `${fw}: no console errors`);
    await page.close();
    server.close();
    console.log(`PASS ${fw}: build, SSR (3 SVGs), 3 live diagrams, update, remove, onUpdate`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = (error as { stdout?: string; stderr?: string }).stderr ?? '';
    failures.push(fw);
    console.log(`FAIL ${fw}: ${message}\n${detail.slice(-2000)}`);
  }
}
await browser.close();
if (failures.length) process.exit(1);
