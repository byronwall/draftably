/**
 * Installs the packed runtime and framework packages into the React, Solid, Vue and Svelte
 * examples, then proves each one end to end: a production build, a server render that already
 * holds every diagram as SVG, and a browser page where three diagrams draw, one updates and one
 * is removed, and two editors where a drag in one changes only its own source, all without
 * console errors. Run `pnpm runtime:build && pnpm editor:build && pnpm frameworks:build` first.
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
const editor = pack('editor');
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
  manifest.dependencies['@draftably/editor'] = `file:${editor}`;
  writeFileSync(path.join(app, 'package.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(
    path.join(app, 'pnpm-workspace.yaml'),
    `packages: []\noverrides:\n  '@draftably/runtime': 'file:${runtime}'\n  '@draftably/editor': 'file:${editor}'\nallowBuilds:\n  esbuild: true\n`,
  );
  const errors: string[] = [];
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
    assert.equal(html.match(/<draft-editor/g)?.length, 2, `${fw}: SSR keeps two editor elements`);

    // Browser: three viewers draw, the first updates, the last unmounts.
    const server = await serve(path.join(app, 'dist'));
    const page = await browser.newPage();
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
    const outlines = await page.evaluate(() =>
      [...document.querySelectorAll('draft-diagram')].map(
        el => el.shadowRoot?.querySelector('.draft-viewer__outline')?.clientHeight ?? 0,
      ),
    );
    assert.ok(outlines[0] > 20, `${fw}: outline="visible" shows the first outline`);
    assert.ok(outlines[1] <= 1, `${fw}: the default outline is visually hidden`);
    assert.ok(before[1].includes('Beta worker'), `${fw}: second diagram shows its own source`);
    // The host contract: status, the element from the wrapper, live options, event props.
    const contract = () =>
      page.evaluate(() => {
        const els = [...document.querySelectorAll('draft-diagram')];
        const w = window as { __first?: Element; __events?: Record<string, number> };
        return {
          status: els.map(el => el.getAttribute('status')),
          first: w.__first === els[0],
          toolbar: (els[1].shadowRoot!.querySelector('.draft-viewer__toolbar') as HTMLElement)
            .hidden,
          camera: w.__events?.camera ?? 0,
        };
      });
    // Camera events come on the next animation frame; editors report ready after their first draw.
    await page
      .waitForFunction(
        () => ((window as { __events?: Record<string, number> }).__events?.camera ?? 0) >= 3,
        undefined,
        { timeout: 5000 },
      )
      .catch(() => {});
    const parity = await contract();
    assert.deepEqual(parity.status, ['ready', 'ready', 'ready'], `${fw}: status="ready"`);
    assert.ok(parity.first, `${fw}: the wrapper gives the element (ref, expose or bind)`);
    assert.ok(parity.toolbar, `${fw}: options reach the element`);
    assert.ok(parity.camera >= 3, `${fw}: the camera event prop fires`);
    await page.evaluate(() => {
      (window as { __second?: unknown }).__second =
        document.querySelectorAll('draft-diagram')[1].viewer;
    });
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
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelectorAll('draft-diagram')[1].viewer ===
          (window as { __second?: unknown }).__second,
      ),
      `${fw}: a new options object with the same values does not re-mount`,
    );
    await page.click('#remove');
    await page.waitForFunction(() => document.querySelectorAll('draft-diagram').length === 2);
    const updates = await page.evaluate(() => (window as { __updates?: string[] }).__updates ?? []);
    assert.ok(
      updates.filter(s => s === 'committed').length >= 4,
      `${fw}: onUpdate reports commits`,
    );
    // Editors: a drag in the first one changes its source only.
    const box = page.locator('draft-editor').nth(0).locator('[data-kind="node"][data-id="web"]');
    await box.waitFor({ timeout: 20000 });
    await page
      .locator('draft-editor')
      .nth(1)
      .locator('[data-kind="node"][data-id="queue"]')
      .waitFor();
    await box.scrollIntoViewIfNeeded();
    // The editor fits its view after the first draw; drag once the box stops moving.
    let b = (await box.boundingBox())!;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      const next = (await box.boundingBox())!;
      if (next.x === b.x && next.y === b.y && next.width === b.width) break;
      b = next;
    }
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 90, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(
      () => ((window as { __changes?: string[][] }).__changes?.[0].length ?? 0) > 0,
      undefined,
      { timeout: 10000 },
    );
    const changes = await page.evaluate(() => (window as { __changes?: string[][] }).__changes!);
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll('draft-editor')].every(
            el => el.getAttribute('status') === 'ready',
          ),
        undefined,
        { timeout: 10000 },
      )
      .catch(() => {});
    const editorState = await page.evaluate(() => ({
      status: [...document.querySelectorAll('draft-editor')].map(el => el.getAttribute('status')),
      interact: (window as { __events?: Record<string, number> }).__events?.interact ?? 0,
    }));
    assert.deepEqual(editorState.status, ['ready', 'ready'], `${fw}: editor status="ready"`);
    assert.ok(editorState.interact > 0, `${fw}: an editor callback option runs`);
    assert.equal(changes[1].length, 0, `${fw}: the second editor reports no change`);
    assert.match(
      changes[0].at(-1)!,
      /node web "Alpha web"/,
      `${fw}: the first editor's source stays its own`,
    );
    const sources = await page.evaluate(() =>
      [...document.querySelectorAll('draft-editor')].map(el => el.source),
    );
    assert.notEqual(sources[0], sources[1], `${fw}: each editor holds its own source`);
    assert.equal(sources[0], changes[0].at(-1), `${fw}: the editor holds the source it reported`);
    await page.screenshot({ path: path.join(out, `${fw}.png`), fullPage: true });
    assert.deepEqual(errors, [], `${fw}: no console errors`);
    await page.close();
    server.close();
    console.log(
      `PASS ${fw}: build, SSR (3 SVGs, 2 editors), 3 live diagrams, status, element access, options without re-mount, camera event prop, update, remove, onUpdate, editor drag and options`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = (error as { stdout?: string; stderr?: string }).stderr ?? '';
    failures.push(fw);
    console.log(
      `FAIL ${fw}: ${message}\n${detail.slice(-2000)}\npage errors: ${errors.join('\n')}`,
    );
  }
}
await browser.close();
if (failures.length) process.exit(1);
