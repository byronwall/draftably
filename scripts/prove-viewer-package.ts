import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'tmp/viewer-proof');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const packed = JSON.parse(
  execFileSync(
    'pnpm',
    ['--dir', path.join(root, 'packages/runtime'), 'pack', '--json', '--pack-destination', out],
    { encoding: 'utf8' },
  ),
);
const archive = packed.filename as string;
const pkg = path.join(out, 'package');
mkdirSync(pkg);
execFileSync('tar', ['-xzf', archive, '-C', pkg, '--strip-components=1']);
const manifest = JSON.parse(readFileSync(path.join(pkg, 'package.json'), 'utf8'));
assert.equal(
  Object.keys(manifest.dependencies ?? {}).length,
  0,
  'runtime has no runtime dependencies',
);
assert.ok(manifest.exports['./viewer']);
assert.ok(manifest.exports['./viewer.css']);
assert.ok(manifest.exports['./element']);
for (const file of [
  'dist/index.js',
  'dist/viewer.js',
  'dist/viewer.css',
  'dist/element.js',
  'dist/fonts.css',
  'dist/types/src/runtime/viewer.d.ts',
])
  assert.ok(readFileSync(path.join(pkg, file)), `missing packed ${file}`);
function filesBelow(dir: string, prefix = ''): string[] {
  return readdirSync(path.join(pkg, dir), { withFileTypes: true }).flatMap(entry => {
    const name = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? filesBelow(path.posix.join(dir, entry.name), name) : [name];
  });
}
const workerAssets = filesBelow('dist').filter(name => /render\.worker.*\.js$/.test(name));
assert.ok(workerAssets.length, 'Vite did not emit the native worker JavaScript asset');
const viewerCode = filesBelow('dist')
  .filter(name => name.endsWith('.js') && !name.includes('render.worker'))
  .map(name => readFileSync(path.join(pkg, 'dist', name), 'utf8'))
  .join('\n');
assert.match(viewerCode, /new Worker\(new URL\(/);
assert.ok(
  workerAssets.some(name => viewerCode.includes(name)),
  'viewer entry does not reference an emitted worker',
);

const basic = mkdtempSync(path.join(os.tmpdir(), 'draftably-viewer-types-'));
writeFileSync(
  path.join(basic, 'package.json'),
  JSON.stringify({
    name: 'viewer-types-proof',
    private: true,
    type: 'module',
    dependencies: { '@draftably/runtime': `file:${archive}` },
  }),
);
execFileSync('pnpm', ['install', '--ignore-scripts'], {
  cwd: basic,
  stdio: 'inherit',
  env: { ...process.env, CI: '1' },
});
writeFileSync(
  path.join(basic, 'consumer.ts'),
  `
import { renderSvg } from '@draftably/runtime';
import { mountViewer, runtimeVersion, fontMetricsVersion, type ViewerHandle, type UpdateResult } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';
import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
const diagram: DraftDiagramElement = document.createElement('draft-diagram');
diagram.source = 'node a "A"';
diagram.options = { label: 'Typed element' };
void diagram.updateComplete;
void diagram.viewer;
const host = document.createElement('div');
const viewer: ViewerHandle = mountViewer(host, { render: { fonts: 'embed' } });
const result: Promise<UpdateResult> = viewer.update('node a "A"');
void renderSvg('node a "A"');
console.log(runtimeVersion, fontMetricsVersion, result);
`,
);
execFileSync(
  path.join(root, 'node_modules/.bin/tsc'),
  [
    '--noEmit',
    '--strict',
    '--target',
    'es2022',
    '--module',
    'nodenext',
    '--moduleResolution',
    'nodenext',
    'consumer.ts',
  ],
  { cwd: basic, stdio: 'inherit' },
);
const imported = execFileSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    `import assert from 'node:assert/strict';
  assert.equal(typeof document, 'undefined');
  const viewer = await import('@draftably/runtime/viewer');
  assert.equal(typeof viewer.mountViewer, 'function');
  assert.equal(typeof viewer.runtimeVersion, 'string');
  await import('@draftably/runtime/element');
  console.log('PASS SSR-safe viewer module import');`,
  ],
  { cwd: basic, encoding: 'utf8' },
);
console.log(imported.trim());

const consumers = [
  'vanilla-viewer',
  'viewer-proof',
  'react-viewer',
  'solid-viewer',
  'element-viewer',
];
const dirs: Record<string, string> = {};
for (const name of consumers) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `draftably-${name}-`));
  cpSync(path.join(root, 'integration-examples', name), dir, { recursive: true });
  const app = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  app.dependencies['@draftably/runtime'] = `file:${archive}`;
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(app, null, 2));
  execFileSync('pnpm', ['install', '--ignore-scripts'], {
    cwd: dir,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
  execFileSync('pnpm', ['run', 'build'], {
    cwd: dir,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
  dirs[name] = dir;
  console.log(`PASS packed ${name} consumer build`);
}
mkdirSync(path.join(out, 'nested'), { recursive: true });
cpSync(path.join(dirs['viewer-proof'], 'dist'), path.join(out, 'nested/demo'), { recursive: true });
writeFileSync(path.join(out, 'consumers.json'), JSON.stringify(dirs, null, 2));
console.log(`PASS packed viewer archive ${archive}; emitted worker ${workerAssets.join(', ')}`);
