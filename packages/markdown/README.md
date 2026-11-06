# `@draftably/markdown`

Turn `draft` code fences, and optionally `mermaid` fences, into static SVG images when your site
builds. It has a remark plugin (Unified, MDX, Astro, Docusaurus) and a markdown-it plugin. Readers
load no Draftably JavaScript.

```sh
pnpm add @draftably/markdown
```

For a standalone Markdown build, install `markdown-it`, then use the async adapter and write its
HTML:

```sh
pnpm add @draftably/markdown markdown-it
```

````js
import { mkdir, writeFile } from 'node:fs/promises';
import MarkdownIt from 'markdown-it';
import { createMarkdownItDraft } from '@draftably/markdown/markdown-it';
import { createFileAssets } from '@draftably/markdown/files';

const assets = createFileAssets({ directory: 'dist/diagrams', publicPath: '/diagrams/' });
const adapter = createMarkdownItDraft({ emitAsset: assets.emitAsset });
const md = new MarkdownIt().use(adapter.plugin);
const source = '```draft\ndiagram "API" version=1\nnode api "API"\n```';
const { html } = await adapter.render(md, source);
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
````

Run it as an `.mjs` file. This writes `dist/index.html` and the referenced SVG under
`dist/diagrams/`. For `src` includes, errors, Mermaid fences, caching and interactive mode, use the
[Markdown guide](https://draftably.dev/docs/markdown).

## Docs

- [Markdown](https://draftably.dev/docs/markdown): a first build, fence options, includes,
  Mermaid fences and interactive mode
- [Documentation sites](https://draftably.dev/docs/documentation-sites): complete Astro Starlight,
  Docusaurus and VitePress setups, including development serving and build output
