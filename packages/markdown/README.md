# `@draftably/markdown`

Turn `draft` code fences, and optionally `mermaid` fences, into static SVG images when your site
builds. It has a remark plugin (Unified, MDX, Astro, Docusaurus) and a markdown-it plugin. Readers
load no Draftably JavaScript.

```sh
pnpm add @draftably/markdown
```

```ts
import remarkDraft from '@draftably/markdown/remark';
import { createFileAssets } from '@draftably/markdown/files';

const assets = createFileAssets({ directory: '.cache/diagrams', publicPath: '/diagrams/' });
processor.use(remarkDraft, { emitAsset: assets.emitAsset });
// After the build: await assets.copyTo('dist/diagrams');
```

## Docs

- [Markdown](https://draftably.dev/docs/markdown): a first build, fence options, includes,
  Mermaid fences and interactive mode
- [Documentation sites](https://draftably.dev/docs/documentation-sites): Astro Starlight,
  Docusaurus and VitePress recipes
