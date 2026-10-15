import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { createWorkspace } from './src/server/workspace';

/**
 * `DIAGRAM_ROOT=folder pnpm dev` serves that folder's diagrams next to the dev server, as
 * `meld open` does. `DIAGRAM_FILE=x.meld` serves the current folder and names the file to open.
 */
function workspace(root: string | undefined, file: string | undefined): Plugin | null {
  if (!root && !file) return null;
  return {
    name: 'meld-workspace',
    configureServer(server) {
      const ws = createWorkspace(path.resolve(root ?? '.'));
      server.middlewares.use((req, res, next) => {
        if (!ws.handle(req, res)) next();
      });
      server.httpServer?.once('close', () => ws.close());
      const open = file
        ? `?file=${encodeURIComponent(path.relative(ws.root, path.resolve(file)))}`
        : '';
      console.log(`Diagrams in ${ws.root}${open ? ` · open /${open}` : ''}`);
    },
  };
}

export default defineConfig({
  // Relative asset paths let the static build run from any subdirectory.
  base: './',
  // App state lives in module-level stores. Hot-swapping components would split them from that
  // state, so source edits reload the page instead; the diagram restores from browser storage.
  plugins: [solid({ hot: false }), workspace(process.env.DIAGRAM_ROOT, process.env.DIAGRAM_FILE)],
  test: {
    include: ['tests/**/*.test.ts'],
    // The tests cover model code only; they need no DOM.
    environment: 'node',
  },
});
