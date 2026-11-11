# Embed diagrams

Show `.draft` diagrams in your own pages, apps and documentation. Every route draws with the same
compiler and renderer as the CLI, so a diagram looks the same everywhere. Pick the row that
matches what you ship.

| You want to                                      | Read                                            | Install                                   |
| ------------------------------------------------ | ----------------------------------------------- | ----------------------------------------- |
| Replace Mermaid on a site you run                | [Switch from Mermaid](#from-mermaid)            | `pnpm add mermaid@npm:@draftably/mermaid` |
| Show a diagram in React, Solid, Vue, Svelte      | [Frameworks](#frameworks)                       | `@draftably/react` and others             |
| Add an interactive diagram to any page           | [Element and viewer](#element)                  | `@draftably/runtime`                      |
| Let users edit a diagram in your app             | [Editor component](#editor-component)           | `@draftably/editor`                       |
| Generate SVG in a script or build step           | [Render SVG](#render-svg)                       | `@draftably/runtime`                      |
| Lay out React Flow, elkjs, dagre or Cytoscape    | [Drop in your graph layout](#layout-drop-in)    | `@draftably/runtime`                      |
| Turn `draft` fences into images                  | [Markdown](#markdown)                           | `@draftably/markdown`                     |
| Add diagrams to Starlight, Docusaurus, VitePress | [Documentation sites](#documentation-sites)     | `@draftably/markdown`                     |
| Draw diagrams in a GitHub README                 | [GitHub Action](#github-action)                 | A workflow step                           |
| Put an image in a wiki, chat or slide            | [An image for any host](#an-image-for-any-host) | `draftably`                               |

The packages need Node 22.21 or later and are ES modules only. [Support](#support) lists each
package and the hosts it is tested on.

## The shortest route

An interactive diagram on a page is two lines:

```ts
import '@draftably/runtime/element';
```

```html
<draft-diagram source='node api "API"' label="API diagram"></draft-diagram>
```

The element brings its own styles, worker, zoom controls and cleanup. Set its `source` property to
redraw it. With Vite, add `optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] }` to
`vite.config.ts`. [Element and viewer](#element) has the rest.

## An image for any host

When you do not control the page, such as a wiki, a chat or a slide, export an image and keep it
beside its source:

```sh
draftably inspect architecture.draft --svg > architecture.svg
draftably inspect architecture.draft --png architecture.png
```

The image holds its source, so `draftably open architecture.svg` opens it again for editing. Use
PNG where a host blocks SVG.

## When something fails

| Symptom                                           | Fix                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A worker error in Vite 5–7 development            | Add `optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] }` to the Vite config. |
| An image URL returns 404                          | Match `publicPath` to the served folder and the site's base path.                                |
| An edit to an included `.draft` file is not shown | Follow your [site's recipe](#documentation-sites) for watching includes.                         |
| A diagram does not draw                           | Read `updateComplete`; on an error, `result.error.diagnostics`. Keep a fallback image.           |
