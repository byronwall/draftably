import { cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = path.join(root, 'packages/markdown');
const out = path.join(pkg, 'dist');
rmSync(out, { recursive: true, force: true });
execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.markdown.json'], {
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
      entry: {
        index: path.join(pkg, 'src/index.ts'),
        remark: path.join(pkg, 'src/remark.ts'),
        'markdown-it': path.join(pkg, 'src/markdown-it.ts'),
        files: path.join(pkg, 'src/files.ts'),
        client: path.join(pkg, 'src/client.ts'),
        mermaid: path.join(pkg, 'src/mermaid.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: id =>
        ['@draftably/runtime', '@draftably/runtime/viewer', 'jsdom', 'mermaid'].includes(id) ||
        id.startsWith('node:'),
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
});
cpSync(path.join(root, 'LICENSE'), path.join(out, 'LICENSE'));
