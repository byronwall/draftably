import { svelte } from '@sveltejs/vite-plugin-svelte';

export default {
  plugins: [svelte()],
  optimizeDeps: { exclude: ['@draftably/runtime'] },
  build: { rollupOptions: { input: ['index.html', 'proof.html'] } },
};
