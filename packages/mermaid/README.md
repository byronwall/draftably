# `@draftably/mermaid`

A drop-in for the [`mermaid`](https://www.npmjs.com/package/mermaid) package. Your page keeps its
Mermaid code: `mermaid.initialize`, `mermaid.run`, `mermaid.render` and `mermaid.parse` work as before.
Draftably draws the diagram kinds that read well as Draftably diagrams: flowcharts, sequences
and Draftably source. It does not imitate Mermaid's other charts. Those still go to Mermaid, so a
page that has one keeps working after the swap.

| Source in a `.mermaid` block         | Drawn by                                 |
| ------------------------------------ | ---------------------------------------- |
| Draftably source (`node`, `edge`, …) | Draftably                                |
| Mermaid `flowchart` / `graph`        | Draftably, after an automatic conversion |
| Mermaid `sequenceDiagram`            | Draftably, after an automatic conversion |
| Any other Mermaid family             | Mermaid 12.2.0, unchanged                |

## Swap it in with a bundler

Point the `mermaid` name at this package. No code changes:

```sh
pnpm add mermaid@npm:@draftably/mermaid
```

Your `package.json` now points the `mermaid` dependency at the installed `@draftably/mermaid`
version. Every `import mermaid from 'mermaid'` in your app gets Draftably. A plugin with its own
Mermaid dependency, such as `@docusaurus/theme-mermaid`, also needs a package-manager override so
it uses the same drop-in. See the [Mermaid migration guide](https://draftably.dev/docs/from-mermaid)
for pnpm, npm and Yarn syntax, Docusaurus notes, and Vite's dependency optimizer setting.

The real Mermaid installs under the name `mermaid-upstream`, so an override cannot point the
drop-in at itself.

## Swap it in from a CDN

Change the package in Mermaid's documented script:

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/@draftably/mermaid@0/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true });
</script>
```

The file includes the Draftably renderer. It loads Mermaid from jsDelivr only when the page has a
diagram family that Draftably does not draw yet.

## Options

`mermaid.initialize` takes Mermaid's settings, plus one of its own:

```js
mermaid.initialize({ startOnLoad: true, draftably: { mermaid: 'off' } });
```

`mermaid: 'off'` leaves Mermaid source to Mermaid, so only Draftably source changes. `render`
returns `renderer: 'draftably' | 'mermaid'` beside Mermaid's `svg` and `diagramType`.

## Limits

- The conversion keeps nodes, groups, labels, connections and sequences. It recomputes the layout,
  and it drops Mermaid `classDef` styling, click callbacks and activation bars. See
  [Import diagrams](https://draftably.dev/docs/import).
- Server-side Mermaid renderers such as GitHub's do not load page scripts, so this package cannot
  change them.

[Switch from Mermaid](https://draftably.dev/docs/from-mermaid) covers every route, including
Markdown builds and `draftably migrate`.
