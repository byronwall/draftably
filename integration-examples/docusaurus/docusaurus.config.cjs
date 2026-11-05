module.exports = async function createConfig() {
  const [{ default: remarkDraft }, { createDraftAssets }, path] = await Promise.all([
    import('@draftably/markdown/remark'),
    import('./draft-assets.mjs'),
    import('node:path'),
  ]);
  const root = __dirname;
  const contentRoot = path.resolve(root, 'docs');
  const dependencies = new Set();
  const assets = createDraftAssets({ root, base: '/manual/', urlPath: '_draftably' });
  const draftOptions = {
    emitAsset: assets.emitAsset,
    sources: {
      rootDir: contentRoot,
      onDependency({ dependencyPath, watchPath }) {
        dependencies.add(dependencyPath);
        if (watchPath) dependencies.add(watchPath);
      },
    },
  };

  return {
    title: 'Embedding example',
    url: 'https://example.invalid',
    baseUrl: '/manual/',
    staticDirectories: ['static', '.cache/draftably/public'],
    presets: [
      [
        'classic',
        {
          docs: {
            routeBasePath: '/',
            sidebarPath: './sidebars.js',
            remarkPlugins: [[remarkDraft, draftOptions]],
          },
          blog: false,
        },
      ],
    ],
    plugins: [
      function draftAssetPublication() {
        return {
          name: 'draft-asset-publication',
          getPathsToWatch() {
            return [path.resolve(contentRoot, '**/*.draft'), ...dependencies];
          },
          async postBuild({ outDir }) {
            await assets.publish(outDir);
          },
        };
      },
    ],
  };
};
