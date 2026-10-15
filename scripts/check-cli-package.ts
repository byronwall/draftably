import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = resolve('packages/cli');
const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
assert.equal(pkg.private, false, 'CLI is not ready to publish. See docs/RELEASING.md.');
assert.ok(pkg.scripts?.build, 'Add the CLI build script before publishing.');
assert.ok(pkg.scripts?.test, 'Add the CLI smoke test before publishing.');
assert.ok(pkg.repository?.url, 'Set the actual GitHub repository URL before publishing.');
assert.ok(pkg.bin && Object.keys(pkg.bin).length, 'Add the built CLI bin entry.');

for (const entry of Object.values(pkg.bin) as string[]) {
  const source = readFileSync(resolve(dir, entry), 'utf8');
  assert.ok(source.startsWith('#!/usr/bin/env node\n'), `${entry} needs a Node shebang.`);
  const result = spawnSync(process.execPath, [resolve(dir, entry), '--help'], {
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, `${entry} --help failed: ${result.error || result.stderr}`);
}
console.log('CLI entry points passed. Pack and test the archive before release.');
