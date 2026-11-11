# `@draftably/solid`

Draftably diagrams in Solid. `DraftDiagram` wraps the `<draft-diagram>` element from
`@draftably/runtime`, so every framework gets the same viewer: zoom, pan, keyboard outline, and
cleanup when it unmounts. Any number of diagrams can share a page.

```sh
pnpm add @draftably/solid
```

Import `@draftably/runtime/host.css` once in your client entry: it reserves each element's height
and hides slot content until the element loads. With Vite, add
`optimizeDeps: { exclude: ['@draftably/runtime'] }` to `vite.config`.

The [Solid recipe](https://draftably.dev/docs/frameworks#solid) is a complete, type-checked app: both
components, an event, your content on a node, a dark theme and server rendering with the `svg`
prop. CI compiles it from the packed packages.
