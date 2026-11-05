import { isAbsolute, relative, resolve, sep } from 'node:path';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkDraft from '@draftably/markdown/remark';
import { createFileAssets } from '@draftably/markdown/files';

const root = fileURLToPath(new URL('.', import.meta.url));
const contentRoot = resolve(root, 'src/content/docs');
const assets = createFileAssets({
  directory: resolve(root, '.cache/draftably/public/_draftably'),
  publicPath: '/manual/_draftably',
});
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
          server.middlewares.use((request, response, next) => {
            const pathname = new URL(request.url, 'http://localhost').pathname;
            const prefix = '/_draftably/';
            const file = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
            if (!/^draft-[0-9a-f]{64}\.svg$/.test(file)) return next();
            response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
            createReadStream(resolve(assets.directory, file)).on('error', next).pipe(response);
          });
          server.watcher.add(contentRoot);
          for (const event of ['add', 'addDir', 'change', 'unlink', 'unlinkDir'])
            server.watcher.on(event, file => {
              if (isDependencyOrAncestor(resolve(file))) void server.restart();
            });
        },
        'astro:build:done': async ({ dir }) =>
          assets.copyTo(resolve(fileURLToPath(dir), '_draftably')),
      },
    },
  ],
  markdown: {
    processor: unified({ remarkPlugins: [[remarkDraft, draftOptions]] }),
  },
});
