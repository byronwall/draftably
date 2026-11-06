import { cpSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = path.join(root, 'packages/mermaid');
const out = path.join(pkg, 'dist');
const MERMAID = JSON.parse(readFileSync(path.join(pkg, 'package.json'), 'utf8')).dependencies[
  'mermaid-upstream'
].replace('npm:mermaid@', '');
rmSync(out, { recursive: true, force: true });
execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.mermaid.json'], {
  cwd: root,
  stdio: 'inherit',
});
await build({
  root,
  configFile: false,
  build: {
    target: 'es2022',
    outDir: out,
    emptyOutDir: false,
    lib: {
      entry: { mermaid: path.join(pkg, 'src/index.ts') },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: id =>
        id === '@draftably/runtime' || id === 'mermaid-upstream' || id.startsWith('node:'),
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
});
// The CDN file matches Mermaid's own name, so a page swaps only the package in its import URL.
// It inlines the runtime and loads the real Mermaid from jsDelivr when a page needs it.
await build({
  root,
  configFile: false,
  build: {
    target: 'es2022',
    outDir: out,
    emptyOutDir: false,
    lib: {
      entry: { 'mermaid.esm.min': path.join(pkg, 'src/index.ts') },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: ['mermaid-upstream'],
      output: {
        paths: {
          'mermaid-upstream': `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID}/dist/mermaid.esm.min.mjs`,
        },
        chunkFileNames: 'cdn/[name]-[hash].mjs',
      },
    },
  },
});
cpSync(path.join(root, 'LICENSE'), path.join(out, 'LICENSE'));
