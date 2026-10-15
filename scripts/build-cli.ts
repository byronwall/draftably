import { chmodSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
rmSync(path.join(pkg, 'skills'), { recursive: true, force: true });
cpSync(path.join(root, 'skills'), path.join(pkg, 'skills'), { recursive: true });
writeFileSync(
  path.join(pkg, 'THIRD_PARTY_NOTICES'),
  'Meld prototype\n\n' +
    readFileSync(path.join(root, 'reference/meld/original/LICENSE'), 'utf8') +
    '\n\nSolidJS\n\n' +
    readFileSync(path.join(root, 'node_modules/solid-js/LICENSE'), 'utf8') +
    // Diagram fonts, embedded in the viewer and in exported SVG files.
    ['Inter', 'SourceSerif4', 'JetBrainsMono']
      .map(
        name =>
          `\n\n${name} font\n\n` +
          readFileSync(path.join(root, `src/assets/fonts/LICENSE-${name}.txt`), 'utf8'),
      )
      .join(''),
);
