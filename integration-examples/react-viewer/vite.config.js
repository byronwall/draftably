import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { exclude: ['@draftably/runtime'] },
});
