#!/usr/bin/env node
// Run the `meld` CLI, rebuilding it first when any source file is newer than the build.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'dist-cli/main.js');

function newest(dir) {
  let latest = 0;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    latest = Math.max(latest, item.isDirectory() ? newest(full) : fs.statSync(full).mtimeMs);
  }
  return latest;
}

const built = fs.existsSync(entry) ? fs.statSync(entry).mtimeMs : 0;
if (built < newest(path.join(root, 'src'))) {
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules/vite/bin/vite.js'),
        'build',
        '--ssr',
        'src/cli/main.ts',
        '--outDir',
        'dist-cli',
        '--target',
        'node22',
        '--logLevel',
        'error',
      ],
      { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
    );
  } catch {
    console.error('The meld CLI failed to build.');
    process.exit(1);
  }
}
await import(pathToFileURL(entry).href);
