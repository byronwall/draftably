/**
 * Compiles the framework recipes in `site/docs/pages/frameworks.md` from the packed packages, so a
 * recipe that stops compiling fails CI.
 *
 *   pnpm runtime:build && pnpm editor:build && pnpm frameworks:build
 *   pnpm prove:recipes [react solid vue svelte plain]
 *
 * Every fenced block whose first line names a file (`// src/App.tsx`, `<!-- src/App.vue -->`,
 * `/* src/theme.css *\/`) is written into a fresh Vite app: the blocks in "Recipes" go into every
 * app, and each framework's section adds its own. The script then installs the packed packages,
 * type-checks (tsc, vue-tsc or svelte-check), builds, calls the recipe's server `render()`, and
 * loads the built page in Chromium: the diagram and the editor must reach `status="ready"`, the
 * body must be assigned, and the console must stay clean. Screenshots go to `tmp/recipes/`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'tmp/recipes');
const docs = readFileSync(path.join(root, 'site/docs/pages/frameworks.md'), 'utf8');

interface Recipe {
  section: string;
  /** The wrapper package, if any. */
  wrapper?: string;
  deps: Record<string, string>;
  dev: Record<string, string>;
  check: string[];
  /** Mount element id for the generated index.html, and its entry. */
  mount?: { id: string; entry: string };
  tsconfig: Record<string, unknown>;
  server: string;
}

const vite = { vite: '6.4.5', typescript: '5.9.3' };
const RECIPES: Record<string, Recipe> = {
  react: {
    section: 'React',
    wrapper: 'react',
    deps: { react: '19.2.0', 'react-dom': '19.2.0' },
    dev: {
      ...vite,
      '@vitejs/plugin-react': '4.7.0',
      '@types/react': '^19.2.0',
      '@types/react-dom': '^19.2.0',
    },
    check: ['tsc', '--noEmit'],
    mount: { id: 'root', entry: '/src/main.tsx' },
    tsconfig: { jsx: 'react-jsx' },
    server: '/src/server.tsx',
  },
  solid: {
    section: 'Solid',
    wrapper: 'solid',
    deps: { 'solid-js': '1.9.9' },
    dev: { ...vite, 'vite-plugin-solid': '2.11.15' },
    check: ['tsc', '--noEmit'],
    mount: { id: 'root', entry: '/src/main.tsx' },
    tsconfig: { jsx: 'preserve', jsxImportSource: 'solid-js' },
    server: '/src/server.tsx',
  },
  vue: {
    section: 'Vue',
    wrapper: 'vue',
    deps: { vue: '3.5.22' },
    dev: { ...vite, '@vitejs/plugin-vue': '5.2.4', 'vue-tsc': '3.3.14' },
    check: ['vue-tsc', '--noEmit'],
    mount: { id: 'app', entry: '/src/main.ts' },
    tsconfig: {},
    server: '/src/server.ts',
  },
  svelte: {
    section: 'Svelte',
    wrapper: 'svelte',
    deps: { svelte: '5.57.3' },
    dev: { ...vite, '@sveltejs/vite-plugin-svelte': '5.1.1', 'svelte-check': '4.7.8' },
    check: ['svelte-check', '--fail-on-warnings'],
    mount: { id: 'app', entry: '/src/main.ts' },
    tsconfig: {},
    server: '/src/server.ts',
  },
  plain: {
    section: 'Plain HTML',
    deps: {},
    dev: vite,
    check: ['tsc', '--noEmit'],
    tsconfig: {},
    server: '/src/server.ts',
  },
};

/** The files a section names in its fenced blocks. */
function files(section: string): Map<string, string> {
  const start = docs.indexOf(`\n## ${section}\n`);
  if (start < 0) throw new Error(`frameworks.md has no "## ${section}" section`);
  const end = docs.indexOf('\n## ', start + 1);
  const text = docs.slice(start, end < 0 ? undefined : end);
  const found = new Map<string, string>();
  for (const [, body] of text.matchAll(/```[\w-]*\n([\s\S]*?)```/g)) {
    const name = body.match(/^(?:\/\/ |\/\* |<!-- )([\w./-]+)(?: \*\/| -->)?\n/)?.[1];
    if (name) found.set(name, body);
  }
  if (!found.size) throw new Error(`"## ${section}" names no files`);
  return found;
}

const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css' };
function serve(dir: string): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((req, res) => {
    let file = path.join(dir, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
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

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'packs'), { recursive: true });
const pack = (dir: string) =>
  path.join(
    out,
    'packs',
    JSON.parse(
      execFileSync('pnpm', ['pack', '--json', '--pack-destination', path.join(out, 'packs')], {
        cwd: path.join(root, 'packages', dir),
        encoding: 'utf8',
      }),
    )
      .filename.split('/')
      .pop(),
  );
const runtime = pack('runtime');
const editor = pack('editor');
const shared = files('Recipes');

const only = process.argv.slice(2);
const browser = await chromium.launch();
const failures: string[] = [];
for (const name of only.length ? only : Object.keys(RECIPES)) {
  const recipe = RECIPES[name];
  const app = path.join(out, name);
  const step = { now: 'write' };
  try {
    mkdirSync(app, { recursive: true });
    for (const [file, body] of [...shared, ...files(recipe.section)]) {
      mkdirSync(path.dirname(path.join(app, file)), { recursive: true });
      writeFileSync(path.join(app, file), body);
    }
    const deps: Record<string, string> = {
      ...recipe.deps,
      '@draftably/runtime': `file:${runtime}`,
      '@draftably/editor': `file:${editor}`,
    };
    if (recipe.wrapper) deps[`@draftably/${recipe.wrapper}`] = `file:${pack(recipe.wrapper)}`;
    writeFileSync(
      path.join(app, 'package.json'),
      JSON.stringify(
        {
          name: `recipe-${name}`,
          private: true,
          type: 'module',
          dependencies: deps,
          devDependencies: recipe.dev,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      path.join(app, 'pnpm-workspace.yaml'),
      `packages: []\noverrides:\n  '@draftably/runtime': 'file:${runtime}'\n  '@draftably/editor': 'file:${editor}'\nallowBuilds:\n  esbuild: true\n`,
    );
    writeFileSync(
      path.join(app, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            isolatedModules: true,
            types: ['vite/client'],
            ...recipe.tsconfig,
          },
          include: ['src', 'vite.config.ts'],
        },
        null,
        2,
      ),
    );
    if (recipe.mount && !existsSync(path.join(app, 'index.html')))
      writeFileSync(
        path.join(app, 'index.html'),
        `<!doctype html>\n<html lang="en"><head><meta charset="utf-8" /><title>${name}</title></head>\n<body><div id="${recipe.mount.id}"></div><script type="module" src="${recipe.mount.entry}"></script></body></html>\n`,
      );
    const run = (...args: string[]) =>
      execFileSync('pnpm', args, { cwd: app, stdio: 'pipe', encoding: 'utf8' });
    step.now = 'install';
    run('install');
    step.now = 'type check';
    run('exec', ...recipe.check);
    step.now = 'build';
    run('exec', 'vite', 'build');
    step.now = 'server render';
    writeFileSync(
      path.join(app, 'ssr.mjs'),
      `process.env.NODE_ENV = 'production';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
const html = await (await vite.ssrLoadModule(${JSON.stringify(recipe.server)})).render();
await vite.close();
process.stdout.write(html);`,
    );
    const html = execFileSync('node', ['ssr.mjs'], { cwd: app, encoding: 'utf8' });
    if (!/<draft-diagram[\s\S]*<svg/.test(html)) throw new Error('server HTML has no diagram SVG');

    step.now = 'browser';
    const server = await serve(path.join(app, 'dist'));
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    const errors: string[] = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(server.url);
    await page.waitForFunction(
      () =>
        document.querySelector('draft-diagram')?.getAttribute('status') === 'ready' &&
        document.querySelector('draft-editor')?.getAttribute('status') === 'ready',
      undefined,
      { timeout: 20000 },
    );
    const state = await page.evaluate(() => {
      const el = document.querySelector('draft-diagram')!;
      const slot = el.shadowRoot!.querySelector(
        '[data-draft-anchor="body:api"] slot',
      ) as HTMLSlotElement;
      return {
        body: slot?.assignedElements().length === 1,
        dark: getComputedStyle(document.querySelector('.app')!).backgroundColor,
        editorTheme: document.querySelector('draft-editor')!.getAttribute('data-theme'),
      };
    });
    await page.locator('.card input').fill('ok');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    await page.close();
    server.close();
    if (!state.body) throw new Error('the body on api is not assigned');
    if (state.dark !== 'rgb(2, 6, 23)' || state.editorTheme !== 'dark')
      throw new Error(`the dark theme is not applied: ${JSON.stringify(state)}`);
    if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);
    console.log(
      `PASS ${name}: type check, build, server render, diagram and editor ready, body, dark theme`,
    );
  } catch (error) {
    const e = error as Error & { stdout?: string; stderr?: string };
    failures.push(name);
    console.log(
      `FAIL ${name} (${step.now}): ${e.message.split('\n')[0]}\n${`${e.stdout ?? ''}${e.stderr ?? ''}`.slice(-3000)}`,
    );
  }
}
await browser.close();
if (failures.length) process.exit(1);
