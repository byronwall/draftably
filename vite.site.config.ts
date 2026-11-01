import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import solid from 'vite-plugin-solid';

/**
 * GitHub Pages serves 404.html for paths it has no file for. A copy of the site's page there lets
 * deep links such as /docs/connections load directly.
 */
function spaFallback(): Plugin {
  let outDir = 'dist-site';
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      await copyFile(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));
    },
  };
}

/**
 * The public site: landing page, playground and docs. `pnpm site:build` builds it into dist-site/
 * and copies the viewer build into dist-site/app/. SITE_BASE is the path the site is served from;
 * set it to `/` once the site has its own domain.
 */
export default defineConfig({
  worker: { format: 'es' },
  root: 'site',
  base: process.env.SITE_BASE ?? '/draftably/',
  plugins: [solid({ hot: false }), spaFallback()],
  build: { outDir: '../dist-site', emptyOutDir: true },
});
