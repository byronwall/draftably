import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: { exclude: ['@draftably/runtime'] },
});
