import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkDraft from '@draftably/markdown/remark';
import { createDraftAssets } from './draft-assets.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const contentRoot = resolve(root, 'src/content/docs');
const assets = createDraftAssets({ root, base: '/manual/', urlPath: '_draftably' });
let devServer;
const dependencies = new Set();

function isDependencyOrAncestor(changedPath) {
  for (const dependencyPath of dependencies) {
    const remainder = relative(changedPath, dependencyPath);
    if (
      remainder === '' ||
      (remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder))
    ) {
      return true;
    }
  }
  return false;
}

const draftOptions = {
  emitAsset: assets.emitAsset,
  sources: {
    rootDir: contentRoot,
    onDependency({ dependencyPath, watchPath }) {
      dependencies.add(dependencyPath);
      devServer?.watcher.add(watchPath ?? dependencyPath);
    },
  },
};

export default defineConfig({
  site: 'https://example.invalid',
  base: '/manual/',
  integrations: [
    starlight({ title: 'Embedding example' }),
    {
      name: 'draftably-assets',
      hooks: {
        'astro:server:setup': ({ server }) => {
          devServer = server;
          server.middlewares.use(assets.devMiddleware());
          server.watcher.add(contentRoot);
          for (const event of ['add', 'addDir', 'change', 'unlink', 'unlinkDir'])
            server.watcher.on(event, file => {
              if (isDependencyOrAncestor(resolve(file))) void server.restart();
            });
        },
        'astro:build:done': async ({ dir }) => assets.publish(fileURLToPath(dir)),
      },
    },
  ],
  markdown: {
    processor: unified({ remarkPlugins: [[remarkDraft, draftOptions]] }),
  },
});
