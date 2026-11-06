import solid from 'vite-plugin-solid';

export default {
  plugins: [solid({ ssr: true })],
  optimizeDeps: { exclude: ['@draftably/runtime'] },
};
