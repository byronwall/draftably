import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { utimes } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = fileURLToPath(new URL('../docs/index.md', import.meta.url));
const host = spawn(
  'pnpm',
  ['exec', 'docusaurus', 'start', '--host', '127.0.0.1', ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
  },
);

let timer;
watch(fileURLToPath(new URL('../docs/', import.meta.url)), (_event, filename) => {
  if (!filename?.toString().endsWith('.draft')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const now = new Date();
    void utimes(page, now, now).catch(console.error);
  }, 120);
});

host.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => host.kill(signal));
