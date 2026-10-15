import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { createFileSession } from './src/server/file-session';

/** `DIAGRAM_FILE=x.meld pnpm dev` serves that file's session next to the dev server. */
function fileSession(file: string | undefined): Plugin | null {
  if (!file) return null;
  return {
    name: 'meld-file-session',
    configureServer(server) {
      const session = createFileSession(path.resolve(file));
      server.middlewares.use((req, res, next) => {
        if (!session.handle(req, res)) next();
      });
      server.httpServer?.once('close', () => session.close());
      console.log(`Editing ${session.file}`);
    },
  };
}

export default defineConfig({
  // Relative asset paths let the static build run from any subdirectory.
  base: './',
  // App state lives in module-level stores. Hot-swapping components would split them from that
  // state, so source edits reload the page instead; the diagram restores from browser storage.
  plugins: [solid({ hot: false }), fileSession(process.env.DIAGRAM_FILE)],
  test: {
    include: ['tests/**/*.test.ts'],
    // The tests cover model code only; they need no DOM.
    environment: 'node',
  },
});
