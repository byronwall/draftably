# Embed diagrams

Show `.draft` diagrams in your own pages, scripts and documentation sites. Each route uses the
same renderer as the CLI, so a diagram looks the same everywhere.

## Pick a route

| You want to                                 | Use                                            | Install                       |
| ------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| Replace Mermaid on a site you run           | The `mermaid` drop-in                          | `@draftably/mermaid`          |
| Put an image in a README, wiki or chat      | `draftably inspect --svg` or `--png`           | `draftably`                   |
| Add an interactive diagram to a web page    | The `<draft-diagram>` element                  | `@draftably/runtime`          |
| Use a React, Solid, Vue or Svelte component | [`DraftDiagram`](#frameworks)                  | `@draftably/react` and others |
| Generate SVG in a script or build step      | `renderSvg`                                    | `@draftably/runtime`          |
| Turn `draft` code fences into images        | The remark or markdown-it plugin               | `@draftably/markdown`         |
| Add diagrams to a documentation site        | A pinned Astro, Docusaurus or VitePress recipe | `@draftably/markdown`         |

The packages need Node 22.21 or later and are ES modules only.

## An image for any host

When you do not control the page, such as GitHub, GitLab, npm or Slack, export an image and commit
it beside its source:

```sh
draftably inspect architecture.draft --svg > architecture.svg
```

The SVG embeds its source, so `draftably open architecture.svg` opens it again for editing. Use
`--png` where a host blocks SVG.

## An interactive diagram on a page

```sh
pnpm add @draftably/runtime
```

Import the element once, then add it to your HTML:

```ts
import '@draftably/runtime/element';
```

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element brings its own styles, worker, zoom controls and cleanup. Set its `source` property to
redraw it. An invalid update keeps the last good drawing. With Vite, add
`optimizeDeps: { exclude: ['@draftably/runtime'] }` to `vite.config.ts`.

## Replace Mermaid

Already use Mermaid? [Switch from Mermaid](#from-mermaid) swaps the package behind the `mermaid` name.
Your page code stays the same.

## SVG from a script

```ts
import { writeFile } from 'node:fs/promises';
import { renderSvg } from '@draftably/runtime';

const result = await renderSvg('node api "API"');
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
await writeFile('api.svg', result.value.svg);
```

The SVG embeds the fonts it uses. Links and source metadata are off unless you turn them on.

## Diagrams in Markdown

```sh
pnpm add @draftably/markdown
```

Write a fenced block with the language `draft`:

````markdown
```draft
node web "Web app"
node api "API"
edge request web -> api "HTTPS"
```
````

The remark plugin (Unified, MDX, Astro, Docusaurus) and the markdown-it plugin (VitePress and
others) replace each fence with an ordinary image at build time. Readers load no Draftably
JavaScript. A fence can also point at a file with `{src="./checkout.draft"}`.

## Full guides

The repository has a guide for each route, tested host recipes and a support matrix:

- [Use Draftably in your project](https://github.com/byronwall/draftably/blob/main/docs/integrations/README.md)
- [Diagram element](https://github.com/byronwall/draftably/blob/main/docs/integrations/element.md)
  and [imperative viewer](https://github.com/byronwall/draftably/blob/main/docs/integrations/viewer.md)
- [Runtime API](https://github.com/byronwall/draftably/blob/main/docs/integrations/runtime.md)
- [Markdown guide](https://github.com/byronwall/draftably/blob/main/docs/integrations/markdown.md)
- [Astro Starlight](https://github.com/byronwall/draftably/blob/main/docs/integrations/astro-starlight.md),
  [Docusaurus](https://github.com/byronwall/draftably/blob/main/docs/integrations/docusaurus.md)
  and [VitePress](https://github.com/byronwall/draftably/blob/main/docs/integrations/vitepress.md)
- [Support matrix](https://github.com/byronwall/draftably/blob/main/docs/integrations/support.md)
