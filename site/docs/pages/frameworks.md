# Frameworks

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
viewer's worker loads in development. Import `@draftably/runtime/host.css` once in your client
entry, in every framework: it holds the element's height and hides slot content until the element
loads.

## Props

| Prop      | Meaning                                                                                |
| --------- | -------------------------------------------------------------------------------------- |
| `source`  | The `.draft` text. A change redraws the diagram and keeps the camera.                  |
| `label`   | The accessible name.                                                                   |
| `outline` | `'visible'` keeps the item list under the drawing. Default: hidden until it has focus. |
| `state`   | A declared [emphasis state](#emphasis-states) to show.                                 |
| `svg`     | Static SVG shown until the viewer draws. See [Server rendering](#server-rendering).    |
| `options` | Every `mountViewer` option. A new object with the same values does nothing.            |

Every package maps the same element to its own idiom:

| Piece       | React                     | Solid         | Vue                     | Svelte                    |
| ----------- | ------------------------- | ------------- | ----------------------- | ------------------------- |
| The element | `ref`                     | `ref`         | `ref` → `.element`      | `bind:element`            |
| Events      | `onUpdate`, `onCamera`, … | `onUpdate`, … | `@update`, `@camera`, … | `onupdate`, `oncamera`, … |
| Server SVG  | `renderSvg`, re-exported  | the same      | the same                | the same                  |
| Slots       | `children`                | `children`    | default slot            | `children`                |

Each package builds its event props from one list, `HOST_EVENTS`, so every element event has a
prop: `update`, `render`, `diagnostics`, `camera`, `itemactivate`, `link`, `contextmenu`,
`anchors` and, on the editor, `select` and `change`. A callback receives the event's `detail`. See [Events and status](#events-and-status).

`onUpdate` receives an object whose `status` is `committed`, `error` or a cancellation status. On
an initial error, the component keeps its `svg` fallback visible. A later error keeps the last
committed drawing.

## React

```tsx
import { useState } from 'react';
import { DraftDiagram } from '@draftably/react';
import '@draftably/runtime/host.css';

export function Architecture() {
  const [source, setSource] = useState('node web "Web"\nnode api "API"\nedge e1 web -> api');
  return (
    <main>
      <button onClick={() => setSource('node api "Updated API"')}>Update</button>
      <DraftDiagram
        source={source}
        label="Architecture"
        onUpdate={result => {
          if (result.status === 'error') console.error(result.error.diagnostics);
        }}
      />
    </main>
  );
}
```

The ref points to the `<draft-diagram>` element. After React applies a source change, read
`ref.current.updateComplete` to await that render. Check for `status === 'error'`; syntax and
worker failures are returned as results, not thrown.

Draw your graph with React Flow? `@draftably/react/flow` draws the lines that Draftably routes.
See [Drop in your graph layout](#react-flow).

## Solid

```tsx
import { createSignal } from 'solid-js';
import { DraftDiagram } from '@draftably/solid';
import '@draftably/runtime/host.css';

export function Architecture() {
  const [source, setSource] = createSignal('node web "Web"\nnode api "API"\nedge e1 web -> api');
  return (
    <main>
      <button onClick={() => setSource('node api "Updated API"')}>Update</button>
      <DraftDiagram
        source={source()}
        label="Architecture"
        onUpdate={result => {
          if (result.status === 'error') console.error(result.error.diagnostics);
        }}
      />
    </main>
  );
}
```

The package ships its JSX source under the `solid` export condition, so `vite-plugin-solid`
compiles it for the browser and for SolidStart's server.

## Vue

```vue
<script setup>
import { ref } from 'vue';
import { DraftDiagram } from '@draftably/vue';
import '@draftably/runtime/host.css';
const source = ref('node web "Web"\nnode api "API"\nedge e1 web -> api');
const record = result => {
  if (result.status === 'error') console.error(result.error.diagnostics);
};
</script>

<template>
  <DraftDiagram :source="source" label="Architecture" @update="record" />
</template>
```

No `isCustomElement` compiler setting is needed.

## Svelte

```svelte
<script>
  import { DraftDiagram } from '@draftably/svelte';
  import '@draftably/runtime/host.css';
  let source = $state('node web "Web"\nnode api "API"\nedge e1 web -> api');
  const record = result => {
    if (result.status === 'error') console.error(result.error.diagnostics);
  };
</script>

<DraftDiagram {source} label="Architecture" onupdate={record} />
```

Draw your graph with Svelte Flow? See [Drop in your graph layout](#svelte-flow) to place its
nodes and route its lines with Draftably.

## Angular and plain HTML

Import the element once. Angular needs `CUSTOM_ELEMENTS_SCHEMA` in the component that uses it:

```ts
import '@draftably/runtime/element';
import '@draftably/runtime/host.css';
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

## Put your components on nodes

Pass children marked `data-draft-slot`. `body:<id>` fills a node and scales with the drawing;
`overlay:<id>` covers an item at screen size. Your framework renders and updates them as usual,
and your page CSS styles them. Mark buttons and fields `data-draft-input` so they take the pointer
and keys. [Put your content on a node](#put-your-content-on-a-node) has every rule. Give a body
room in the source: `size api width=220 height=auto min-height=110`.

React:

```tsx
<DraftDiagram source={source}>
  {services.map(s => (
    <div key={s.id} data-draft-slot={`body:${s.id}`} className="card">
      {s.name}{' '}
      <button data-draft-input="" onClick={() => open(s.id)}>
        Open
      </button>
    </div>
  ))}
  <span data-draft-slot="overlay:db" className="badge">
    {alerts}
  </span>
</DraftDiagram>
```

Solid (key the list by ID, so a changed label keeps its element and its focus):

```tsx
<DraftDiagram source={source()}>
  <For each={services().map(s => s.id)}>
    {id => (
      <div data-draft-slot={`body:${id}`} class="card">
        {nameOf(id)}{' '}
        <button data-draft-input onClick={() => open(id)}>
          Open
        </button>
      </div>
    )}
  </For>
</DraftDiagram>
```

Vue:

```vue
<DraftDiagram :source="source">
  <div v-for="s in services" :key="s.id" :data-draft-slot="`body:${s.id}`" class="card">
    {{ s.name }} <button data-draft-input @click="open(s.id)">Open</button>
  </div>
</DraftDiagram>
```

Svelte:

```svelte
<DraftDiagram {source}>
  {#each services as s (s.id)}
    <div data-draft-slot={`body:${s.id}`} class="card">
      {s.name} <button data-draft-input onclick={() => open(s.id)}>Open</button>
    </div>
  {/each}
</DraftDiagram>
```

`DraftEditor` takes the same children. The `anchors` event lists the targets, and `diagnostics`
reports a slot for an unknown ID or content larger than its node.

## Edit diagrams

`DraftEditor` from `@draftably/react/editor` (or `/solid/editor`, `/vue/editor`,
`/svelte/editor`) lets users drag boxes and lines and reports the new source after each edit:

```tsx
import { DraftEditor } from '@draftably/react/editor';

<DraftEditor source={source} onChange={c => setSource(c.source)} style={{ height: '28rem' }} />;
```

[Editor component](#editor-component) has the props for each framework.

## Server rendering

Render the static SVG on the server and pass it as `svg`. The page then shows the diagram before
JavaScript loads. The viewer replaces it after its first successful draw; if that draw fails, the
SVG remains visible. The SVG is also available to search engines and link previews.

```ts
import { renderSvg } from '@draftably/react'; // or /solid, /vue, /svelte: the runtime's renderSvg

const result = await renderSvg(source, { target: 'inline', idPrefix: 'architecture' });
const svg = result.ok ? result.value.svg : undefined;
```

Give each inline diagram on a page its own `idPrefix`. This works in a Next.js server component, a
SolidStart route, a Nuxt server route or a SvelteKit server `load` function. Pass the resulting
string to the framework component's `svg` prop; render the component on the client so its viewer
can attach after hydration.
