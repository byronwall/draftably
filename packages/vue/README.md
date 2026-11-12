# `@draftably/vue`

Draftably diagrams in Vue. `DraftDiagram` wraps the `<draft-diagram>` element from
`@draftably/runtime`, so every framework gets the same viewer: zoom, pan, keyboard outline, and
cleanup when it unmounts. Any number of diagrams can share a page.

```sh
pnpm add @draftably/vue @draftably/runtime
```

Import `@draftably/runtime/host.css` once in your client entry: it reserves each element's height
and hides slot content until the element loads, and it lets marked content take the pointer. With
Vite 5–7, add `optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] }` to
`vite.config`.

The [Vue recipe](https://draftably.dev/docs/frameworks#vue) is a complete, type-checked app: both
components, an event, your content on a node, a dark frame and server rendering with the `svg`
prop. CI compiles it from the packed packages.
