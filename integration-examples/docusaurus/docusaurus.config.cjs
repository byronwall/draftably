module.exports = async function createConfig() {
  const [{ default: remarkDraft }, { createFileAssets }, path] = await Promise.all([
    import('@draftably/markdown/remark'),
    import('@draftably/markdown/files'),
    import('node:path'),
  ]);
  const root = __dirname;
  const contentRoot = path.resolve(root, 'docs');
  const dependencies = new Set();
  const assets = createFileAssets({
    directory: path.resolve(root, '.cache/draftably/public/_draftably'),
    publicPath: '/manual/_draftably',
  });
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
            await assets.copyTo(path.join(outDir, '_draftably'));
          },
        };
      },
    ],
  };
};
