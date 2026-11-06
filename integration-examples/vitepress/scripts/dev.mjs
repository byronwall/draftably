import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dependencies, prepare } from './prepare.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await prepare();
const host = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/vitepress/bin/vitepress.js', import.meta.url)),
    'dev',
    root,
    '--host',
    '127.0.0.1',
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: 'inherit' },
);

let pending = Promise.resolve();
let timer;
const rebuild = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    pending = pending.then(async () => {
      try {
        await prepare();
      } catch (error) {
        console.error(error);
      }
      syncWatchers();
    });
  }, 80);
};

function watchesDependency(changedPath) {
  for (const dependencyPath of dependencies.keys()) {
    const remainder = relative(changedPath, dependencyPath);
    if (
      remainder === '' ||
      (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder))
    ) {
      return true;
    }
  }
  return false;
}

const watchers = new Map();
function syncWatchers() {
  const directories = new Set([resolve(root, 'docs')]);
  for (const [dependencyPath, watchPath] of dependencies) {
    directories.add(watchPath ?? dirname(dependencyPath));
  }
  for (const [directory, watcher] of watchers) {
    if (!directories.has(directory)) {
      watcher.close();
      watchers.delete(directory);
    }
  }
  for (const directory of directories) {
    if (watchers.has(directory)) continue;
    watchers.set(
      directory,
      watch(directory, (_event, filename) => {
        if (filename == null) return rebuild();
        const changedPath = join(directory, filename.toString());
        if (changedPath === resolve(root, 'docs/index.md') || watchesDependency(changedPath))
          rebuild();
      }),
    );
  }
}
await syncWatchers();
host.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => host.kill(signal));
