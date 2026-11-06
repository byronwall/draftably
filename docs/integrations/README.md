# Use Draftably in your project

Every route below draws with the same native compiler and renderer. Pick the
row that matches what you want to ship.

| You want to                                   | Use                                                                                           | Install                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Draw and share a diagram with no install      | [Playground](https://draftably.dev/play)                                                      | Nothing                                   |
| Edit `.draft` files on disk, check them in CI | [CLI](https://draftably.dev/docs/cli)                                                         | `pnpm add -g draftably`                   |
| Have a coding agent write and refine diagrams | [Agent skill](https://draftably.dev/docs/agent-skill)                                         | `pnpm dlx draftably skill install`        |
| Put a static image in a README, wiki or chat  | [Export an image](#export-an-image)                                                           | `draftably` CLI                           |
| Add an interactive diagram to a web page      | [Diagram element](element.md)                                                                 | `@draftably/runtime`                      |
| Generate SVG from a script or a build step    | [Render an image](#render-an-image)                                                           | `@draftably/runtime`                      |
| Replace Mermaid on a site you run             | [Mermaid drop-in](#replace-mermaid)                                                           | `pnpm add mermaid@npm:@draftably/mermaid` |
| Turn `draft` code fences into images          | [Render Markdown](#render-markdown)                                                           | `@draftably/markdown`                     |
| Add diagrams to a documentation site          | [Astro Starlight](astro-starlight.md), [Docusaurus](docusaurus.md), [VitePress](vitepress.md) | `@draftably/markdown`                     |
| Control the viewer's lifecycle yourself       | [Imperative viewer](viewer.md)                                                                | `@draftably/runtime`                      |

Use Node 22.21 or later. The packages are ES modules only. Script examples
need `"type": "module"` in your `package.json`.

## Export an image

Use this route when you do not control the page that shows the diagram, for
example GitHub, GitLab, npm, Slack or a plain Markdown reader.

```sh
draftably inspect architecture.draft --svg > architecture.svg
draftably inspect architecture.draft --png architecture.png
```

Commit the image beside its `.draft` file and link both. The export embeds its
source, so `draftably open architecture.svg` opens it again for editing. Use
PNG where a host blocks SVG.

## Add an interactive diagram

```sh
pnpm add @draftably/runtime
```

Import the element entry once in your application:

```ts
import '@draftably/runtime/element';
```

Add this HTML:

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element supplies its stylesheet, height, worker and cleanup. Set its
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
includes source updates, error recovery, fallback and removal. Use the
[imperative viewer](viewer.md) when you need custom lifecycle control.

## Replace Mermaid

Keep your Mermaid page code. Point the `mermaid` package name at the drop-in:

```sh
pnpm add mermaid@npm:@draftably/mermaid
```

`mermaid.initialize`, `mermaid.run`, `mermaid.render` and `mermaid.parse` keep working. Draftably
draws Draftably source and Mermaid flowcharts and sequences. Mermaid's other chart types still go
to Mermaid, so nothing on the page goes blank. Sites that load Mermaid from a CDN change one URL:

```js
import mermaid from 'https://cdn.jsdelivr.net/npm/@draftably/mermaid@0/dist/mermaid.esm.min.mjs';
```

See the [package guide](../../packages/mermaid/README.md) and the
[runnable example](../../integration-examples/mermaid-dropin/README.md).

## Render an image

```sh
pnpm add @draftably/runtime
```

Save this as `render.ts` and run `node render.ts`:

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
for validation, emphasis states, links and inline output.

## Render Markdown

```sh
pnpm add @draftably/markdown markdown-it
```

`@draftably/markdown` installs `@draftably/runtime` for you. Save this as
`render-markdown.ts` and run `node render-markdown.ts`:

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

Already use Unified or MDX? Keep your processor and add the remark plugin with
the same file store:

```ts
import remarkDraft from '@draftably/markdown/remark';

processor.use(remarkDraft, { emitAsset: assets.emitAsset });
```

See the [Markdown guide](markdown.md) for includes, captions, source positions,
cache publication and optional interaction. Static output is the default.

## When something fails

| Symptom                                       | Check                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Worker error in Vite development              | Add the `optimizeDeps.exclude` setting above.                            |
| Image URL returns 404                         | Match `publicPath` to the served directory and the site's base.          |
| Included `.draft` edit does not appear        | Use the host recipe's watcher and cache instructions.                    |
| A custom policy prevents rendering            | Inspect `updateComplete` or `result.diagnostics`; keep a fallback image. |
| You need a specific host or browser guarantee | Check [verified support](support.md).                                    |

## Upgrading from draftably 0.10

The CLI, editor, `.draft` language and saved files do not change. Diagrams lay
out and route the same way. SVG exports change in two small ways:

- Bundled font family names carry a short version hash, such as
  `'Draft Inter 269b2d3580f4'`. CSS that targets the old `'Draft Inter'` name no
  longer matches. The fallback list (`Inter, Arial, sans-serif`) is unchanged.
- The root `<svg>` has `id="draft-svg"`, `role="img"` and `aria-labelledby`.
  When you paste several exports into one HTML page, use the runtime's
  `target: 'inline'` with a unique `idPrefix` instead.

Exports from 0.10 still open in the new version, and new exports open in 0.10.

## Try unreleased package changes

To test packages built from a checkout, run `pnpm integration:pack` in the
Draftably repository. It writes archives and an `INSTALL.md` with exact install
commands under `tmp/integration-packages/`. It does not publish anything.
