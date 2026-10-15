import { chmodSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = path.join(root, 'packages/cli');
rmSync(path.join(pkg, 'dist'), { recursive: true, force: true });
cpSync(path.join(root, 'dist'), path.join(pkg, 'dist'), { recursive: true });
await build({
  root,
  configFile: false,
  build: {
    ssr: 'src/cli/main.ts',
    target: 'node22',
    outDir: path.join(pkg, 'dist/cli'),
    rollupOptions: {
      output: { inlineDynamicImports: true, banner: '#!/usr/bin/env node' },
    },
  },
});
chmodSync(path.join(pkg, 'dist/cli/main.js'), 0o755);
cpSync(path.join(root, 'examples'), path.join(pkg, 'examples'), { recursive: true });
cpSync(path.join(root, 'docs/DSL.md'), path.join(pkg, 'DSL.md'));
cpSync(path.join(root, 'reference/meld/original/LICENSE'), path.join(pkg, 'THIRD_PARTY_NOTICES'));
