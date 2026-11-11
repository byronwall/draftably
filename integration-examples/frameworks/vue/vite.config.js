import vue from '@vitejs/plugin-vue';

export default {
  plugins: [vue()],
  optimizeDeps: { exclude: ['@draftably/runtime'] },
  build: { rollupOptions: { input: ['index.html', 'proof.html'] } },
};
