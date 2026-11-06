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

Each example is a complete site you can copy. It serves under `/manual/`, so you can see how the
base path flows into image URLs.

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

Copying after every build matters: when a site caches a page, the plugin does not run for it, and
`copyTo` still puts its image back. [Markdown](#markdown) explains each option.

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

`staticDirectories` serves the store in development. Two Docusaurus caches need care:

- Its MDX cache does not know about included `.draft` files. Clear it before a production build,
  as the example's `build` script does.
- In development, an edit to an included `.draft` file does not rerun the page. The example's dev
  script touches the Markdown file when a `.draft` file next to it changes.

Use the standard webpack build. The faster Rspack build kept a stale image after an include
changed. On a site with several locales, use each locale's base URL in `publicPath`.

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
with `publicPath: '/_draftably'`. VitePress adds its own base when it builds the page. Run the step
in your `build` script (`node scripts/prepare.mjs && vitepress build .`). The example's dev script
reruns it when a Markdown or `.draft` file changes. Keep `generated-docs/` out of git.

## Other sites

A site with a Unified or markdown-it pipeline can use the plugins directly: see
[Markdown](#markdown). For MkDocs, Pandoc or a host you do not control, commit SVG images with
`draftably inspect --svg`, or let the [GitHub Action](#github-action) draw them.
