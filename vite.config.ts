import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// Solid HMR can replace the shell while the imperative editor still holds node references.
// Disable it so Vite uses full reloads for application source edits.
export default defineConfig({ base: './', plugins: [solid({ hot: false })] });
