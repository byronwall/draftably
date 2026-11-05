# Use Draftably in your project

Choose the result you need. Each route uses the same native diagram renderer.

| Your goal                                      | Start here                                                                          | Package                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| Add an interactive diagram to a page           | [Diagram element](element.md)                                                       | `@draftably/runtime/element` |
| Generate an SVG in a script or build           | [Render an image](#render-an-image)                                                 | `@draftably/runtime`         |
| Turn Markdown fences into images               | [Render Markdown](#render-markdown)                                                 | `@draftably/markdown`        |
| Add diagrams to an existing documentation site | [Astro](astro-starlight.md), [Docusaurus](docusaurus.md), [VitePress](vitepress.md) | Pinned host recipes          |

## Try the packages from this branch

Use Node 22.21 or later and pnpm. In the Draftably checkout, run:

```sh
pnpm install
pnpm integration:pack
```

The command builds both packages and writes their archives under
`tmp/integration-packages/`. Open the generated `INSTALL.md` for exact install
commands in your own project. It includes the runtime override needed for
local Markdown previews. It does not edit your project configuration.

The command does not publish packages. The [support matrix](support.md) lists
the package and host checks. Astro's pinned example needs Node 22.22 or later.

## Add an interactive diagram

Import one browser entry in your application:

```ts
import '@draftably/runtime/element';
```

Add this HTML:

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element supplies its stylesheet, height, worker, and cleanup. Set its
`source` property when the diagram changes. Add an image child when you need
a fallback before JavaScript loads.

For Vite, add the worker setting to `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: { exclude: ['@draftably/runtime'] },
});
```

The [complete example](../../integration-examples/element-viewer/README.md)
includes source updates, error recovery, fallback, and removal. Use the
[imperative viewer](viewer.md) when you need custom lifecycle control.

## Render an image

After installing the runtime archive, save this as `render.ts` and run
`node render.ts`. The script examples use ES modules: set `"type": "module"`
in your project's `package.json`.

```ts
import { writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';

const result = await renderSvg('node api "API"');
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
await writeFile('api.svg', result.value.svg);
console.log(`Wrote api.svg (${result.value.width} × ${result.value.height})`);
```

The SVG includes the fonts it needs. Source metadata and links are off by
default. Serve the file as an ordinary image. See the [runtime API](runtime.md)
for validation, emphasis states, links, and inline output.

## Render Markdown

Install the Markdown and runtime archives with the generated instructions.
For a standalone Markdown build, add markdown-it:

```sh
pnpm add markdown-it
```

Save this as `render-markdown.ts` and run `node render-markdown.ts`:

````ts
import { mkdir, writeFile } from 'node:fs/promises';
import MarkdownIt from 'markdown-it';
import { createMarkdownItDraft } from '@draftably/markdown/markdown-it';
import { createFileAssets } from '@draftably/markdown/files';

const assets = createFileAssets({ directory: 'dist/diagrams', publicPath: '/diagrams/' });
const adapter = createMarkdownItDraft({ emitAsset: assets.emitAsset });
const md = new MarkdownIt().use(adapter.plugin);
const source = '```draft\nnode api "API"\n```';
const { html } = await adapter.render(md, source);
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('Wrote dist/index.html');
````

Serve `dist/` as the site root. The output is an ordinary image with alt text
and dimensions. Readers load no Draftably JavaScript for static diagrams.
For a nested site, include its base in `publicPath`, such as `/manual/diagrams/`.

Already use Unified or MDX? Keep your existing processor and add the remark
plugin with the same file store:

```ts
import remarkDraft from '@draftably/markdown/remark';

processor.use(remarkDraft, { emitAsset: assets.emitAsset });
```

See the [Markdown guide](markdown.md) for includes, captions, source positions,
cache publication, and optional interaction. Static output is the default.

## When something fails

| Symptom                                       | Check                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Worker error in Vite development              | Add the `optimizeDeps.exclude` setting above.                            |
| Image URL returns 404                         | Match `publicPath` to the served directory and the site's base.          |
| Included `.draft` edit does not appear        | Use the host recipe's watcher and cache instructions.                    |
| A custom policy prevents rendering            | Inspect `updateComplete` or `result.diagnostics`; keep a fallback image. |
| You need a specific host or browser guarantee | Check [verified support](support.md).                                    |
