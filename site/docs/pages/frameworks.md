# Use with your framework

Every framework gets the same diagram viewer: zoom, pan, fit, a keyboard outline, and cleanup when
the component unmounts. Put as many diagrams on one page as you like. Each one owns its viewer.

| Framework       | Install                       | Component                                      |
| --------------- | ----------------------------- | ---------------------------------------------- |
| React 19        | `pnpm add @draftably/react`   | `<DraftDiagram source={…} />`                  |
| Solid           | `pnpm add @draftably/solid`   | `<DraftDiagram source={…} />`                  |
| Vue 3           | `pnpm add @draftably/vue`     | `<DraftDiagram :source="…" />`                 |
| Svelte 5        | `pnpm add @draftably/svelte`  | `<DraftDiagram {source} />`                    |
| Angular, others | `pnpm add @draftably/runtime` | `<draft-diagram source="…">`, a custom element |

With Vite, add `optimizeDeps: { exclude: ['@draftably/runtime'] }` to `vite.config`, so the
viewer's worker loads in development.

## Props

| Prop      | Meaning                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| `source`  | The `.draft` text. A change redraws the diagram and keeps the camera.                     |
| `label`   | The accessible name.                                                                      |
| `outline` | `'visible'` keeps the item list under the drawing. Default: hidden until it has focus.    |
| `state`   | A declared [emphasis state](#emphasis-states) to show.                                    |
| `svg`     | Static SVG shown until the viewer draws. See [Server rendering](#server-rendering).       |
| `options` | Viewer options: `toolbar`, link policy and render settings.                               |
| update    | Called with each result: `onUpdate` (React, Solid), `@update` (Vue), `onupdate` (Svelte). |

An invalid update keeps the last good drawing and reports the error to the update callback.

## React

```tsx
import { DraftDiagram } from '@draftably/react';

export function Architecture() {
  return (
    <DraftDiagram
      source={'node web "Web"\nnode api "API"\nedge e1 web -> api'}
      label="Architecture"
    />
  );
}
```

The ref is the `<draft-diagram>` element. Await `ref.current.updateComplete` after a change.

## Solid

```tsx
import { DraftDiagram } from '@draftably/solid';

<DraftDiagram
  source={source()}
  label="Architecture"
  onUpdate={result => console.log(result.status)}
/>;
```

The package ships its JSX source under the `solid` export condition, so `vite-plugin-solid`
compiles it for the browser and for SolidStart's server.

## Vue

```vue
<script setup>
import { DraftDiagram } from '@draftably/vue';
</script>

<template>
  <DraftDiagram :source="source" label="Architecture" @update="r => console.log(r.status)" />
</template>
```

No `isCustomElement` compiler setting is needed.

## Svelte

```svelte
<script>
  import { DraftDiagram } from '@draftably/svelte';
  let source = $state('node web "Web"\nnode api "API"\nedge e1 web -> api');
</script>

<DraftDiagram {source} label="Architecture" onupdate={r => console.log(r.status)} />
```

## Angular and plain HTML

Import the element once. Angular needs `CUSTOM_ELEMENTS_SCHEMA` in the component that uses it:

```ts
import '@draftably/runtime/element';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-architecture',
  template: `<draft-diagram [attr.source]="source" label="Architecture"></draft-diagram>`,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ArchitectureComponent {
  source = 'node web "Web"\nnode api "API"\nedge e1 web -> api';
}
```

Listen for the `draft-update` event for results.

## Edit diagrams

`DraftEditor` is the editor: drag boxes and lines, add shapes with **N**, edit labels, undo. It
reports the `.draft` source after every edit. Pass that text back as `source`; the editor does not
redraw its own echo. Any number of editors can share a page.

```tsx
import { DraftEditor } from '@draftably/react/editor';

const [source, setSource] = useState('node web "Web"\nnode api "API"\nedge e1 web -> api');
<DraftEditor source={source} onChange={setSource} style={{ height: '28rem' }} />;
```

| Framework       | Import                                                      | Change callback      |
| --------------- | ----------------------------------------------------------- | -------------------- |
| React           | `DraftEditor` from `@draftably/react/editor`                | `onChange`           |
| Solid           | `DraftEditor` from `@draftably/solid/editor`                | `onChange`           |
| Vue             | `DraftEditor` from `@draftably/vue/editor`                  | `@change`            |
| Svelte          | `DraftEditor` from `@draftably/svelte/editor`               | `onchange`           |
| Angular, others | `import '@draftably/editor/element'`, then `<draft-editor>` | `draft-change` event |

The editor loads in the browser after the component mounts, so server rendering and pages that
only show diagrams never download it. Its styles apply only inside the editor.

## Server rendering

Render the static SVG on the server and pass it as `svg`. The page then shows the diagram before
JavaScript loads, and search engines and link previews see it. The viewer replaces it after its
first draw.

```ts
import { renderSvg } from '@draftably/runtime';

const result = await renderSvg(source, { target: 'inline', idPrefix: 'architecture' });
const svg = result.ok ? result.value.svg : undefined;
```

Give each diagram on a page its own `idPrefix`. This works in a Next.js server component, a
SolidStart route, a Nuxt page or a SvelteKit `load` function.
