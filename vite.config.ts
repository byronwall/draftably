import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  // Relative asset paths let the static build run from any subdirectory.
  base: './',
  plugins: [solid()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
