# Documentation sites

Add `draft` fences to an Astro Starlight, Docusaurus or VitePress site. Each fence becomes an SVG
image at build time, and readers load no Draftably JavaScript.

```sh
pnpm add @draftably/markdown
```

| Site, tested version              | How it plugs in                                 | Example                                                                                                  |
| --------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Astro 7.4.5 with Starlight 0.42.9 | Remark plugin through Astro's Unified processor | [astro-starlight](https://github.com/byronwall/draftably/tree/main/integration-examples/astro-starlight) |
| Docusaurus 3.10.2                 | Remark plugin in the docs preset                | [docusaurus](https://github.com/byronwall/draftably/tree/main/integration-examples/docusaurus)           |
| VitePress 1.6.4                   | A prebuild step writes image Markdown           | [vitepress](https://github.com/byronwall/draftably/tree/main/integration-examples/vitepress)             |

Each link opens a complete example project. The examples use the package versions listed in the
table and serve under `/manual/`, so you can compare the configured base path with the generated
image URLs. Copy the project that matches your host, then change its content root and base path.

## The shared setup

Every recipe does the same three things:

1. **Store the images.** `createFileAssets` writes each SVG to a folder that persists between
   builds, named by its content hash. Keep that folder out of git.
2. **Add the remark plugin** with the store and your content root, so `src="./file.draft"` works.
3. **Publish the store.** Serve the folder in development and copy it into the build output.

```js
import remarkDraft from '@draftably/markdown/remark';
import { createFileAssets } from '@draftably/markdown/files';

const assets = createFileAssets({
  directory: '.cache/draftably/public/_draftably',
  publicPath: '/manual/_draftably', // your site's base, then the folder
});
const draftOptions = {
  emitAsset: assets.emitAsset,
  sources: { rootDir: 'docs' },
};
// After the build: await assets.copyTo('<build output>/_draftably');
```

Resolve `directory` and `rootDir` from the config file when it may run from another working
directory. Serve `directory` during development, and copy it to the build output after each build.
Copying after every build matters: a page cache can skip the transform, while `copyTo` restores all
SVGs referenced by cached pages. The result is HTML with `<img>` links under
`/manual/_draftably/` and SVGs in the published `_draftably/` folder. See [Markdown](#markdown) for
fence options, source includes and error handling.

## Astro and Starlight

Astro 7 uses its own Markdown processor by default. Select Unified and pass the plugin there;
Starlight uses the same processor for its Markdown and MDX pages:

```js
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  base: '/manual/',
  integrations: [starlight({ title: 'Docs' }), draftablyAssets],
  markdown: {
    processor: unified({ remarkPlugins: [[remarkDraft, draftOptions]] }),
  },
});
```

The example's `draftablyAssets` integration does the publishing. Its `astro:server:setup` hook
serves the store under `/manual/_draftably/` and restarts the dev server when an included `.draft`
file changes. Its `astro:build:done` hook calls `assets.copyTo()`. Use Astro's `markdown.processor`
setting; the older top-level `markdown.remarkPlugins` is deprecated.

## Docusaurus

Add the plugin to the docs preset. Docusaurus reads a CommonJS config, so import Draftably's ES
modules dynamically:

```js
module.exports = async function createConfig() {
  const { default: remarkDraft } = await import('@draftably/markdown/remark');
  // …createFileAssets and draftOptions as above
  return {
    baseUrl: '/manual/',
    staticDirectories: ['static', '.cache/draftably/public'],
    presets: [['classic', { docs: { remarkPlugins: [[remarkDraft, draftOptions]] } }]],
    plugins: [
      () => ({
        name: 'draftably-assets',
        getPathsToWatch: () => ['docs/**/*.draft'],
        postBuild: ({ outDir }) => assets.copyTo(`${outDir}/_draftably`),
      }),
    ],
  };
};
```

`staticDirectories` serves the store in development. The fixture's `pnpm build` clears Docusaurus'
MDX cache before the standard webpack build because the cache does not track included `.draft`
files. The faster Rspack build kept a stale image after an include changed, so use the standard
webpack build. In development, the fixture touches the Markdown page when an included `.draft`
file changes. On a site with several locales, set each locale's base URL in `publicPath`.

## VitePress

VitePress renders Markdown synchronously, so it cannot wait for a diagram. Run the remark plugin
before VitePress starts and let VitePress read the result:

```js
const result = await unified()
  .use(remarkParse)
  .use(remarkDraft, { ...draftOptions, emitAsset: assets.emitAsset })
  .use(remarkStringify)
  .process({ path, value: await readFile(path, 'utf8') });
await writeFile('generated-docs/index.md', String(result));
```

Point VitePress at `generated-docs/`, and write the store to `generated-docs/public/_draftably/`
with `publicPath: '/_draftably'`. VitePress adds its configured base when it builds the page. Run
the prebuild step before `vitepress build` and serve the generated folder. The example's dev script
reruns preparation when a Markdown or included `.draft` file changes. Keep `generated-docs/` out of
git.

## Other sites

A site with a Unified or markdown-it pipeline can use the plugins directly: see
[Markdown](#markdown). For MkDocs, Pandoc or a host you do not control, commit SVG images with
`draftably inspect --svg`, or let the [GitHub Action](#github-action) draw them.
