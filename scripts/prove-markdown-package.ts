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
const out = path.join(root, 'tmp/markdown-package-proof');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const pack = (directory: string) =>
  JSON.parse(
    execFileSync(
      'pnpm',
      ['--dir', path.join(root, directory), 'pack', '--json', '--pack-destination', out],
      {
        encoding: 'utf8',
      },
    ),
  ).filename as string;
const runtimeArchive = pack('packages/runtime');
const markdownArchive = pack('packages/markdown');
for (const entry of ['index.js', 'remark.js', 'markdown-it.js']) {
  const contents = readFileSync(path.join(root, 'packages/markdown/dist', entry), 'utf8');
  assert.doesNotMatch(contents, /@draftably\/runtime\/viewer|mountViewer/);
}
assert.match(
  readFileSync(path.join(root, 'packages/markdown/dist/client.js'), 'utf8'),
  /@draftably\/runtime\/viewer/,
);
assert.doesNotMatch(
  readFileSync(path.join(root, 'packages/markdown/dist/client.js'), 'utf8'),
  /node:(?:crypto|fs|path|url|worker_threads)/,
);
const consumer = mkdtempSync(path.join(os.tmpdir(), 'draftably-markdown-'));
const store = path.join(out, 'store');
writeFileSync(
  path.join(consumer, 'package.json'),
  JSON.stringify(
    {
      name: 'draftably-markdown-proof',
      private: true,
      type: 'module',
      dependencies: {
        '@draftably/markdown': `file:${markdownArchive}`,
        '@draftably/runtime': `file:${runtimeArchive}`,
        '@mdx-js/mdx': '3.1.1',
        '@types/markdown-it': '14.1.2',
        'markdown-it': '14.1.0',
        'playwright-core': '1.64.0',
        'rehype-stringify': '10.0.1',
        'remark-parse': '11.0.0',
        'remark-rehype': '11.1.2',
        unified: '11.0.5',
        typescript: '5.8.3',
        vite: '6.4.3',
      },
    },
    null,
    2,
  ),
);
writeFileSync(
  path.join(consumer, 'pnpm-workspace.yaml'),
  `overrides:\n  '@draftably/runtime': 'file:${runtimeArchive}'\n`,
);
execFileSync('pnpm', ['install', '--ignore-scripts', '--store-dir', store], {
  cwd: consumer,
  env: { ...process.env, CI: '1' },
  stdio: 'inherit',
});
const fixture = path.join(root, 'integration-examples/unified');
cpSync(path.join(fixture, 'content'), path.join(consumer, 'content'), { recursive: true });
for (const file of [
  'prove.mjs',
  'interactive.mjs',
  'interactive-browser.mjs',
  'attach-client.ts',
  'browser-entry.ts',
  'consumer.ts',
  'favicon.svg',
]) {
  cpSync(path.join(fixture, file), path.join(consumer, file));
}
const proof = execFileSync(process.execPath, ['prove.mjs'], { cwd: consumer, encoding: 'utf8' });
const interactiveProof = execFileSync(process.execPath, ['interactive.mjs'], {
  cwd: consumer,
  encoding: 'utf8',
});
writeFileSync(path.join(out, 'proof.log'), proof + interactiveProof);
console.log(proof);
console.log(interactiveProof);

execFileSync(
  path.join(consumer, 'node_modules/.bin/tsc'),
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
  { cwd: consumer, stdio: 'inherit' },
);

const output = path.join(consumer, 'out');
const assets = path.join(output, 'diagrams');
const html = readFileSync(path.join(output, 'page.html'), 'utf8');
assert.match(html, /<figure>/);
const svgFiles = readdirSync(assets).filter(name => name.endsWith('.svg'));
assert.ok(svgFiles.length >= 4);
assert.ok(readFileSync(path.join(assets, svgFiles[0]), 'utf8').includes('<svg'));
const proofInfo = {
  runtimeArchive,
  markdownArchive,
  consumer,
  html: path.join(output, 'page.html'),
  assetDirectory: assets,
  screenshotTarget: path.join(assets, svgFiles[0]),
};
writeFileSync(path.join(out, 'consumer.json'), JSON.stringify(proofInfo, null, 2));
console.log(`PASS public TypeScript imports. HTML: ${proofInfo.html}`);
