// Builds the React, Solid and Vue wrappers with tsc. Svelte ships its component source.
import { rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const name of ['react', 'solid', 'vue']) {
  const pkg = path.join(root, 'packages', name);
  rmSync(path.join(pkg, 'dist'), { recursive: true, force: true });
  execFileSync('pnpm', ['exec', 'tsc', '-p', path.join(pkg, 'tsconfig.json')], {
    cwd: root,
    stdio: 'inherit',
  });
}
