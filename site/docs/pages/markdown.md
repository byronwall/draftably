# Markdown

`@draftably/markdown` turns `draft` code fences into ordinary SVG images when your site builds.
Readers load no Draftably JavaScript.

````markdown
```draft
node web "Web app"
node api "API"
edge request web -> api "HTTPS"
```
````

It has a remark plugin for Unified, MDX, Astro and Docusaurus, and a markdown-it plugin for
VitePress and others. For a ready setup on a documentation site, follow
[Documentation sites](#documentation-sites).

## Render your first page

```sh
pnpm add @draftably/markdown markdown-it
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
````

Serve `dist/` as the site root. Each fence becomes an `<img>` with alt text and dimensions. For a
site served under a path, put that path in `publicPath`, such as `/manual/diagrams/`.

With Unified or MDX, keep your processor and add the remark plugin with the same file store:

```ts
import remarkDraft from '@draftably/markdown/remark';

processor.use(remarkDraft, { emitAsset: assets.emitAsset });
```

## Fence options

Options go in one brace group after `draft`, with quoted values:

````markdown
```draft {src="./diagrams/checkout.draft" alt="The web app sends requests to the API." caption="Checkout path"}

```
````

| Key       | Effect                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| `alt`     | Alt text for the image. Without it, the diagram's title is used.                            |
| `caption` | Wraps the image in a figure with this plain-text caption.                                   |
| `src`     | Draws a `.draft` file instead of the fence body. Needs `sources.rootDir`.                   |
| `id`      | A stable name for the image and its anchor.                                                 |
| `state`   | Draws a declared [emphasis state](#emphasis-states).                                        |
| `mode`    | `static` (the default) or `interactive`. See [Interactive diagrams](#interactive-diagrams). |

An unknown or repeated key fails the build. Theme and layout belong in the `.draft` source. A
fence inside another code block stays code, because the plugin reads the parsed document and never
looks inside code.

## Assets and includes

`emitAsset` receives each SVG and returns its public URL. `createFileAssets` from
`@draftably/markdown/files` is a ready store: it names each file by its content hash and writes it
once.

```js
import { createFileAssets } from '@draftably/markdown/files';

const assets = createFileAssets({ directory: '.cache/diagrams', publicPath: '/docs/diagrams/' });
const options = { emitAsset: assets.emitAsset };
// After the build:
await assets.copyTo('dist/diagrams');
```

Keep the store between builds. A page cache can skip a transform, and `copyTo` puts back every SVG
that a cached page still links to.

To use `src`, set `sources.rootDir` to your content root. A path resolves from the Markdown file
that holds the fence and must stay inside the root. Remote paths, absolute paths, other file types
and symlinks that leave the root are refused. Each included file, even a missing one, is reported
through `onDependency`, so your watcher can rebuild the page when it changes or appears.

## Errors

A diagram error fails the build and names the Markdown file and line. To keep building, set
`errors: 'placeholder'`: a broken fence becomes the text "Diagram unavailable." Errors from your
own `emitAsset` or callbacks still fail the build. Read `file.data.draftably` (remark) or the
returned `manifest` (markdown-it) for the assets, dependencies and diagnostics of each page.

## markdown-it details

markdown-it renders fences synchronously, so `adapter.render(md, source, env)` does the async work
first. Pass the page path so `src` includes resolve:

```js
const env = { draftably: { documentPath: pagePath } };
const { html, manifest } = await adapter.render(md, markdown, env);
```

To render tokens yourself, parse, `await adapter.prepare(tokens, env)`, then render those same
tokens. Separate documents can render at the same time.

## Mermaid fences

Set `mermaid: 'convert'` to draw your existing `mermaid` fences too, with no Mermaid in the
browser. Both plugins take it:

```js
const options = { emitAsset: assets.emitAsset, mermaid: 'convert' };
```

A `flowchart`, `graph` or `sequenceDiagram` fence becomes an SVG image like a `draft` fence. Pie,
gantt and other Mermaid charts stay code blocks, so your Mermaid setup still draws them. A fence
that does not convert also stays code, with a `DRAFT_MERMAID` warning. The default, `'off'`,
leaves every `mermaid` fence alone. [Switch from Mermaid](#from-mermaid) has the other routes.

## Interactive diagrams

`mode="interactive"` adds zoom, pan and the keyboard outline over the static image. It publishes
the diagram source in a JSON file, so use it only when the source can be public. Give the plugin
an `interactive` bridge:

```js
interactive: {
  clientModuleUrl: '/assets/draftably-client.js',
  policyId: 'docs',
  emitInit: async data => writeVersionedInitAsset(data),
}
```

`emitInit` writes the JSON and returns its URL. After the page hydrates, load
`@draftably/markdown/client` and call `enhanceDrafts(root, { policies })`. The client accepts only
same-origin JSON, mounts the [viewer](#element), and hides the image only after the first drawing.
On a failure the image stays. `destroy()` stops the work and puts the image back. With Vite, add
`optimizeDeps: { exclude: ['@draftably/runtime'] }`.

The [Unified example](https://github.com/byronwall/draftably/tree/main/integration-examples/unified)
runs Unified, MDX, markdown-it and the interactive client end to end.
