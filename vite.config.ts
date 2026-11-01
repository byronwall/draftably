import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import solid from 'vite-plugin-solid';
import type { Workspace } from './src/server/workspace';

/**
 * `DIAGRAM_ROOT=folder pnpm dev` serves that folder's diagrams next to the dev server, as
 * `draftably open` does. `DIAGRAM_FILE=x.draft` serves the current folder and names the file to open.
 */
function workspace(root: string | undefined, file: string | undefined): Plugin | null {
  if (!root && !file) return null;
  return {
    name: 'draft-workspace',
    configureServer(server) {
      // Loaded through Vite rather than imported here, so the server code can use asset imports
      // (the thumbnails draw with the bundled fonts' module).
      const ready = server
        .ssrLoadModule('/src/server/workspace.ts')
        .then(module =>
          (module as typeof import('./src/server/workspace')).createWorkspace(
            path.resolve(root ?? '.'),
          ),
        );
      server.middlewares.use((req, res, next) => {
        ready.then(ws => ws.handle(req, res) || next(), next);
      });
      void ready.then((ws: Workspace) => {
        server.httpServer?.once('close', () => ws.close());
        const open = file
          ? `?file=${encodeURIComponent(path.relative(ws.root, path.resolve(file)))}`
          : '';
        console.log(`Diagrams in ${ws.root}${open ? ` · open /${open}` : ''}`);
      });
    },
  };
}

export default defineConfig({
  worker: { format: 'es' },
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
