# `@draftably/editor`

The Draftably diagram editor. Drag boxes and lines, add shapes, edit labels, undo, and get the
`.draft` source back after every edit. Any number of editors can share a page; each keeps its own
document, selection, undo history and camera.

```sh
pnpm add @draftably/editor
```

```ts
import '@draftably/editor/element';
```

```html
<draft-editor source='node api "API"'></draft-editor>
```

Listen for `draft-change`; its `detail` is the new source. Set `source` to load other text. Give
the element a height; it is 28rem by default. Its styles apply only inside the editor.

In React, Solid, Vue or Svelte, use `DraftEditor` from `@draftably/react/editor`,
`@draftably/solid/editor`, `@draftably/vue/editor` or `@draftably/svelte/editor`. See
[Use with your framework](https://draftably.dev/docs/frameworks).

For your own lifecycle, call `mountEditor(host, { source, onChange })`. It returns `source()`,
`update(source)` and `destroy()`.
