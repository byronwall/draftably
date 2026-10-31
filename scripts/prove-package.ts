import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = path.join(root, 'packages/cli');
const out = path.join(root, 'tmp/cli-dist');
fs.mkdirSync(out, { recursive: true });
const packed = JSON.parse(
  execFileSync('pnpm', ['--dir', pkg, 'pack', '--json', '--pack-destination', out], {
    cwd: root,
    encoding: 'utf8',
  }),
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-install-'));
fs.writeFileSync(
  path.join(dir, 'package.json'),
  JSON.stringify({ name: 'install-proof', private: true }),
);
execFileSync('pnpm', ['--dir', dir, 'add', '--offline', '--ignore-scripts', packed.filename], {
  cwd: dir,
  stdio: 'inherit',
});
const installed = path.join(dir, 'node_modules/draftably');
const bin = path.join(dir, 'node_modules/.bin/draftably');
const entry = path.join(installed, 'dist/cli/main.js');
const file = path.join(dir, 'checkout.draft');
fs.copyFileSync(path.join(installed, 'examples/checkout.draft'), file);
const run = (...args: string[]) =>
  execFileSync(bin, args, { cwd: dir, encoding: 'utf8', timeout: 10000 });
assert.match(run('--help'), /Usage: draftably/);
assert.match(run('check', file), /OK:/);
const first = run('inspect', file, '--json');
assert.equal(run('inspect', file, '--json'), first);
assert.match(run('inspect', file, '--svg'), /<svg/);
assert.match(run('docs'), /node_modules\/draftably\/DSL\.md/);
assert.match(run('docs', 'legend'), /^### Legend/);
run('skill', 'install');
assert.ok(fs.existsSync(path.join(dir, '.claude/skills/draftably/SKILL.md')));
assert.equal(spawnSync(bin, ['skill', 'install'], { cwd: dir, timeout: 10000 }).status, 1);
run('skill', 'install', '--force', '--dir', '.agents/skills');
assert.ok(fs.existsSync(path.join(dir, '.agents/skills/draftably/SKILL.md')));
run('format', file, '--write');
const formatted = fs.readFileSync(file, 'utf8');
run('format', file, '--write');
assert.equal(fs.readFileSync(file, 'utf8'), formatted);
// Without a file, `open` serves the folder's start page; a missing file is still an error.
assert.equal(spawnSync(bin, ['open', 'missing.draft'], { cwd: dir, timeout: 10000 }).status, 1);
assert.equal(
  spawnSync(bin, ['open', file, '--port', '-1'], { cwd: dir, timeout: 10000 }).status,
  1,
);

// Import through the installed package so parser workers and runtime dependencies are exercised.
for (const [name, source] of [
  ['proof.mmd', 'flowchart LR\nA[API] -->|reads| B[Store]\n'],
  ['proof.d2', 'a: API\nb: Store\na -> b: reads\n'],
] as const) {
  const input = path.join(dir, name),
    output = path.join(dir, name + '.draft');
  fs.writeFileSync(input, source);
  execFileSync(bin, ['import', input, '--output', output], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, DRAFTABLY_NO_UPDATE_CHECK: '1' },
  });
  assert.match(run('check', output), /2 nodes, 0 groups, 1 connections/);
  assert.equal(fs.readFileSync(input, 'utf8'), source);
  fs.unlinkSync(input);
  fs.unlinkSync(output);
}

const probe = net.createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = (probe.address() as net.AddressInfo).port;
await new Promise<void>(resolve => probe.close(() => resolve()));
const server = spawn(bin, ['open', file, '--port', String(port), '--no-open'], { cwd: dir });
let output = '';
let errors = '';
server.stderr.on('data', chunk => {
  errors += chunk;
});
try {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`CLI startup timed out: ${errors}`)), 10000);
    server.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('Viewer:')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once('exit', code => {
      clearTimeout(timer);
      reject(Error(`CLI exited ${code}: ${errors}`));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.equal(
    spawnSync(bin, ['open', file, '--port', String(port), '--no-open'], {
      cwd: dir,
      timeout: 10000,
    }).status,
    1,
    'An occupied port must exit without leaving watchers running.',
  );
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /assets/);
  for (const asset of fs.readdirSync(path.join(installed, 'dist/assets'))) {
    assert.equal((await fetch(`${base}/assets/${asset}`)).status, 200, asset);
  }
  // The CLI must not expose sibling directories or crash on a malformed URL.
  assert.equal((await fetch(`${base}/..%2fexamples/checkout.draft`)).status, 404);
  assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
  // The served folder lists the file, and each file's session is selected with ?file=.
  const listing = await (await fetch(`${base}/api/workspace`)).json();
  assert.deepEqual(
    listing.files.map((f: { path: string }) => f.path),
    ['checkout.draft'],
  );
  const api = (route: string) => `${base}/api/${route}?file=checkout.draft`;
  const session = await (await fetch(api('session'))).json();
  assert.equal(session.source, formatted);
  const updated = formatted + '\nnode audit "Audit log"\n';
  const saved = await fetch(api('source'), {
    method: 'PUT',
    body: JSON.stringify({ source: updated, base: session.revision }),
  });
  assert.equal(saved.status, 200);
  assert.equal(fs.readFileSync(file, 'utf8'), updated);
  const stale = await fetch(api('source'), {
    method: 'PUT',
    body: JSON.stringify({ source: formatted, base: session.revision }),
  });
  assert.equal(stale.status, 409);
  assert.equal(fs.readFileSync(file, 'utf8'), updated);
  assert.match(run('check', file), /7 nodes/);
} finally {
  if (server.exitCode === null) {
    const stopped = once(server, 'exit');
    server.kill('SIGTERM');
    await stopped;
  }
}
console.log(
  `PASS fresh install: executable, format, inspect, viewer assets, save and conflict.\nInstalled at ${dir}`,
);
if (process.argv.includes('--browser')) {
  execFileSync(process.execPath, [path.join(root, 'scripts/prove-file-session.mjs')], {
    cwd: dir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DRAFTABLY_BIN: entry,
      DRAFTABLY_EXAMPLE: path.join(installed, 'examples/checkout.draft'),
    },
  });
}
console.log(`Archive: ${packed.filename}`);
