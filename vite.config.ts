import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  // Relative asset paths let the static build run from any subdirectory.
  base: './',
  // App state lives in module-level stores. Hot-swapping components would split them from that
  // state, so source edits reload the page instead; the diagram restores from browser storage.
  plugins: [solid({ hot: false })],
  test: {
    include: ['tests/**/*.test.ts'],
    // The tests cover model code only; they need no DOM.
    environment: 'node',
  },
});
