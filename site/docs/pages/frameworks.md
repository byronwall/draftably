# Frameworks

Every framework gets the same diagram viewer: zoom, pan, fit, a keyboard outline, and cleanup when
the component unmounts. Put as many diagrams on one page as you like. Each one owns its viewer.

| Framework       | Install                                         | Component                                      |
| --------------- | ----------------------------------------------- | ---------------------------------------------- |
| React 19        | `pnpm add @draftably/react @draftably/runtime`  | `<DraftDiagram source={…} />`                  |
| Solid           | `pnpm add @draftably/solid @draftably/runtime`  | `<DraftDiagram source={…} />`                  |
| Vue 3           | `pnpm add @draftably/vue @draftably/runtime`    | `<DraftDiagram :source="…" />`                 |
| Svelte 5        | `pnpm add @draftably/svelte @draftably/runtime` | `<DraftDiagram {source} />`                    |
| Angular, others | `pnpm add @draftably/runtime`                   | `<draft-diagram source="…">`, a custom element |

Install `@draftably/runtime` beside a framework package: your app imports
`@draftably/runtime/host.css` itself, and pnpm does not let an app import a package it does not
list. Without a framework, add `@draftably/editor` too for `<draft-editor>`.

With Vite 5–7, add `optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] }` to
`vite.config`, so the viewer's and the editor's workers load in development. Vite 8 needs no
setting. Import `@draftably/runtime/host.css` once in your client
entry, in every framework: it holds the element's height, hides slot content until the element
loads, and lets content marked `data-draft-input` take the pointer.

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
| Attributes  | passed to the element     | the same      | the same                | the same                  |

Each package builds its event props from one list, `HOST_EVENTS`, so every element event has a
prop: `update`, `render`, `diagnostics`, `camera`, `itemactivate`, `link`, `contextmenu`,
`anchors` and, on the editor, `select` and `change`. The editor sends no `render` or
`itemactivate`. A callback receives the event's `detail`.
On `link` and `contextmenu` it also has `preventDefault()`, which cancels the DOM event as the
element's own listeners would. See [Events and status](#events-and-status).

```tsx
// Show your own menu instead of the browser's, and open links in your router.
<DraftDiagram
  source={source}
  onContextmenu={event => {
    event.preventDefault();
    openMenu(event.id, event.clientX, event.clientY);
  }}
  onLink={event => {
    event.preventDefault();
    navigate(event.href);
  }}
/>
```

Any other attribute, such as `data-theme`, `id` or `aria-*`, goes to the element, and so does your
framework's class: `className` in React, `class` in the others.

`onUpdate` receives an object whose `status` is `committed`, `error` or a cancellation status. On
an initial error, the component keeps its `svg` fallback visible. A later error keeps the last
committed drawing.

## Recipes

Each recipe below is a complete Vite app for one framework. It shows both components, an event,
a body on a node with a field in it, a dark frame, `host.css`, server rendering with `renderSvg`
and the Vite config. Start from `pnpm create vite` with the framework's TypeScript template, then
add the files. CI copies every file below into a fresh app with the packed packages, type-checks
it, builds it and renders it on the server, so the recipes compile.

Every recipe uses these two files.

```ts
// src/diagram.ts
// `size api … min-height=120` gives the body on `api` room. Layout never measures host content.
export const initial = `diagram "Checkout" version=1
node web "Web"
node api "API"
node db "Orders" shape=pill
edge e1 web -> api "submit"
edge e2 api -> db "save"
size api width=220 height=auto min-height=120
`;
```

```css
/* src/theme.css */
/* Host CSS reaches slot content. The --draft-* properties color the viewer's frame. */
.app {
  display: grid;
  gap: 16px;
  padding: 16px;
}
.app.dark {
  color-scheme: dark;
  background: #020617;
  color: #e2e8f0;
  --draft-bg: #0f172a;
  --draft-ink: #e2e8f0;
  --draft-border: #334155;
  --draft-focus: #38bdf8;
  --draft-warning-ink: #fdba74;
  --draft-warning-bg: #431407;
}
.app draft-diagram {
  height: 20rem;
}
.app draft-editor {
  height: 24rem;
}
.card {
  box-sizing: border-box;
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #1d4ed8;
  color: #fff;
  font:
    13px/1.3 system-ui,
    sans-serif;
}
```

The `--draft-*` properties color the viewer's frame and controls, and `data-theme="dark"` on
`<DraftEditor>` darkens the editor's panels and toolbar. Each component passes that attribute to
its element. `color-scheme: dark` on `.app.dark` draws the diagrams dark too, in the default
theme's dark variant (see [Dark pages](#dark-pages)); a source in another theme keeps its
colors. The editor's own properties are listed in [Editor colors](#editor-colors).

## React

```sh
pnpm add @draftably/react @draftably/runtime
```

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Vite 5–7 need this, so the workers load in development. Vite 8 works without it.
    exclude: ['@draftably/runtime', '@draftably/editor'],
    // Optimize both entries at start, so adding the editor later loads one copy of React.
    include: ['@draftably/react', '@draftably/react/editor'],
  },
});
```

```tsx
// src/App.tsx
import { useState } from 'react';
import { DraftDiagram, type ViewerOptions } from '@draftably/react';
import { DraftEditor } from '@draftably/react/editor';
import { initial } from './diagram';

// `detail: 'full'` keeps the body at every zoom. A new object with equal values also does nothing.
const options: ViewerOptions = { detail: 'full' };

export function App({ svg }: { svg?: string }) {
  const [source, setSource] = useState(initial);
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState('nothing');
  return (
    <main className="app dark">
      <DraftDiagram
        source={source}
        svg={svg}
        label="Checkout"
        options={options}
        onItemactivate={({ id }) => setPicked(id)}
        onDiagnostics={({ diagnostics }) => diagnostics.forEach(d => console.warn(d.message))}
      >
        <div data-draft-slot="body:api" className="card">
          <strong>API</strong>
          <input
            data-draft-input=""
            value={note}
            placeholder="Add a note"
            onChange={event => setNote(event.target.value)}
          />
        </div>
      </DraftDiagram>
      <p>Picked: {picked}</p>
      <DraftEditor
        data-theme="dark"
        source={source}
        onChange={({ source: next }) => setSource(next)}
      />
    </main>
  );
}
```

```tsx
// src/main.tsx
import '@draftably/runtime/host.css';
import './theme.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// With HTML from src/server.tsx, call hydrateRoot with the same `svg` instead.
createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// src/server.tsx
import { renderToString } from 'react-dom/server';
import { renderSvg } from '@draftably/react';
import { App } from './App';
import { initial } from './diagram';

/** The page's HTML, with the diagram drawn before any script runs. */
export async function render(): Promise<string> {
  const result = await renderSvg(initial, { target: 'inline', idPrefix: 'checkout' });
  return renderToString(<App svg={result.ok ? result.value.svg : undefined} />);
}
```

The ref points to the `<draft-diagram>` or `<draft-editor>` element. Every event prop receives
the event's `detail`: `onUpdate`, `onRender`, `onDiagnostics`, `onCamera`, `onItemactivate`,
`onLink`, `onContextmenu`, `onAnchors`, and on the editor `onSelect` and `onChange`.

In a Next.js server component, import `renderSvg` from `@draftably/react/server`. The main entry
is a client module, and a server component cannot call its exports.

Draw your graph with React Flow? `@draftably/react/flow` draws the lines that Draftably routes.
See [Drop in your graph layout](#react-flow).

## Solid

```sh
pnpm add @draftably/solid @draftably/runtime
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  // `ssr: true` compiles for both the browser and src/server.tsx.
  plugins: [solid({ ssr: true })],
  // Vite 5–7 need this, so the workers load in development. Vite 8 works without it.
  optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] },
});
```

```tsx
// src/App.tsx
import { createSignal } from 'solid-js';
import { DraftDiagram } from '@draftably/solid';
import { DraftEditor } from '@draftably/solid/editor';
import { initial } from './diagram';

export function App(props: { svg?: string }) {
  const [source, setSource] = createSignal(initial);
  const [note, setNote] = createSignal('');
  const [picked, setPicked] = createSignal('nothing');
  return (
    <main class="app dark">
      <DraftDiagram
        source={source()}
        svg={props.svg}
        label="Checkout"
        options={{ detail: 'full' }}
        onItemactivate={({ id }) => setPicked(id)}
        onDiagnostics={({ diagnostics }) => diagnostics.forEach(d => console.warn(d.message))}
      >
        <div data-draft-slot="body:api" class="card">
          <strong>API</strong>
          <input
            data-draft-input
            value={note()}
            placeholder="Add a note"
            onInput={event => setNote(event.currentTarget.value)}
          />
        </div>
      </DraftDiagram>
      <p>Picked: {picked()}</p>
      <DraftEditor
        data-theme="dark"
        source={source()}
        onChange={({ source: next }) => setSource(next)}
      />
    </main>
  );
}
```

```tsx
// src/main.tsx
import '@draftably/runtime/host.css';
import './theme.css';
import { render } from 'solid-js/web';
import { App } from './App';

// With HTML from src/server.tsx, call hydrate with the same `svg` instead.
render(() => <App />, document.getElementById('root')!);
```

```tsx
// src/server.tsx
import { renderToString } from 'solid-js/web';
import { renderSvg } from '@draftably/solid';
import { App } from './App';
import { initial } from './diagram';

/** The page's HTML, with the diagram drawn before any script runs. */
export async function render(): Promise<string> {
  const result = await renderSvg(initial, { target: 'inline', idPrefix: 'checkout' });
  return renderToString(() => <App svg={result.ok ? result.value.svg : undefined} />);
}
```

Key a list of bodies by ID (`<For each={ids()}>`), so a changed label keeps its element and the
focus in it. The package ships its JSX source under the `solid` export condition, so
`vite-plugin-solid` compiles it for the browser and for SolidStart's server.

## Vue

```sh
pnpm add @draftably/vue @draftably/runtime
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  // Vite 5–7 need this, so the workers load in development. Vite 8 works without it.
  optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] },
});
```

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { DraftDiagram, type HostEvents } from '@draftably/vue';
import { DraftEditor } from '@draftably/vue/editor';
import { initial } from './diagram';

defineProps<{ svg?: string }>();
const source = ref(initial);
const note = ref('');
const picked = ref('nothing');
const options = { detail: 'full' } as const;
const warn = ({ diagnostics }: HostEvents['diagnostics']) =>
  diagnostics.forEach(d => console.warn(d.message));
</script>

<template>
  <main class="app dark">
    <DraftDiagram
      :source="source"
      :svg="svg"
      label="Checkout"
      :options="options"
      @itemactivate="({ id }) => (picked = id)"
      @diagnostics="warn"
    >
      <div data-draft-slot="body:api" class="card">
        <strong>API</strong>
        <input v-model="note" data-draft-input placeholder="Add a note" />
      </div>
    </DraftDiagram>
    <p>Picked: {{ picked }}</p>
    <DraftEditor
      :source="source"
      data-theme="dark"
      @change="({ source: next }) => (source = next)"
    />
  </main>
</template>
```

```ts
// src/main.ts
import '@draftably/runtime/host.css';
import './theme.css';
import { createApp } from 'vue';
import App from './App.vue';

// With HTML from src/server.ts, use createSSRApp with the same `svg` instead.
createApp(App).mount('#app');
```

```ts
// src/server.ts
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { renderSvg } from '@draftably/vue';
import App from './App.vue';
import { initial } from './diagram';

/** The page's HTML, with the diagram drawn before any script runs. */
export async function render(): Promise<string> {
  const result = await renderSvg(initial, { target: 'inline', idPrefix: 'checkout' });
  return renderToString(createSSRApp(App, { svg: result.ok ? result.value.svg : undefined }));
}
```

No `isCustomElement` compiler setting is needed. Attributes such as `data-theme` fall through to
the element, and `ref` on a component gives `.element`.

## Svelte

```sh
pnpm add @draftably/svelte @draftably/runtime
```

```ts
// vite.config.ts
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  // Vite 5–7 need this, so the workers load in development. Vite 8 works without it.
  optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] },
});
```

```js
// svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default { preprocess: vitePreprocess() };
```

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { DraftDiagram } from '@draftably/svelte';
  import { DraftEditor } from '@draftably/svelte/editor';
  import { initial } from './diagram';

  let { svg }: { svg?: string } = $props();
  let source = $state(initial);
  let note = $state('');
  let picked = $state('nothing');
  const options = { detail: 'full' } as const;
</script>

<main class="app dark">
  <DraftDiagram
    {source}
    {svg}
    label="Checkout"
    {options}
    onitemactivate={({ id }) => (picked = id)}
    ondiagnostics={({ diagnostics }) => diagnostics.forEach(d => console.warn(d.message))}
  >
    <div data-draft-slot="body:api" class="card">
      <strong>API</strong>
      <input data-draft-input bind:value={note} placeholder="Add a note" />
    </div>
  </DraftDiagram>
  <p>Picked: {picked}</p>
  <DraftEditor data-theme="dark" {source} onchange={({ source: next }) => (source = next)} />
</main>
```

```ts
// src/main.ts
import '@draftably/runtime/host.css';
import './theme.css';
import { mount } from 'svelte';
import App from './App.svelte';

// With HTML from src/server.ts, call hydrate with the same `svg` instead.
mount(App, { target: document.getElementById('app')! });
```

```ts
// src/server.ts
import { render as renderApp } from 'svelte/server';
import { renderSvg } from '@draftably/svelte';
import App from './App.svelte';
import { initial } from './diagram';

/** The page's HTML, with the diagram drawn before any script runs. */
export async function render(): Promise<string> {
  const result = await renderSvg(initial, { target: 'inline', idPrefix: 'checkout' });
  return renderApp(App, { props: { svg: result.ok ? result.value.svg : undefined } }).body;
}
```

Draw your graph with Svelte Flow? See [Drop in your graph layout](#svelte-flow) to place its
nodes and route its lines with Draftably.

## Plain HTML

```sh
pnpm add @draftably/runtime @draftably/editor
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Checkout</title>
  </head>
  <body>
    <main class="app dark">
      <draft-diagram label="Checkout">
        <div data-draft-slot="body:api" class="card">
          <strong>API</strong>
          <input data-draft-input placeholder="Add a note" />
        </div>
      </draft-diagram>
      <p>Picked: <output id="picked">nothing</output></p>
      <draft-editor data-theme="dark"></draft-editor>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  // Vite 5–7 need this, so the workers load in development. Vite 8 works without it.
  optimizeDeps: { exclude: ['@draftably/runtime', '@draftably/editor'] },
});
```

```ts
// src/main.ts
import '@draftably/runtime/element';
import '@draftably/editor/element';
import '@draftably/runtime/host.css';
import './theme.css';
import { initial } from './diagram';

const diagram = document.querySelector('draft-diagram')!;
const editor = document.querySelector('draft-editor')!;
diagram.options = { detail: 'full' };
diagram.source = initial;
editor.source = initial;

// Every draft-<name> event is in HTMLElementEventMap, so `detail` is typed with no cast.
diagram.addEventListener('draft-itemactivate', event => {
  document.querySelector('#picked')!.textContent = event.detail.id;
});
diagram.addEventListener('draft-diagnostics', event => {
  for (const d of event.detail.diagnostics) console.warn(d.message);
});
editor.addEventListener('draft-change', event => {
  diagram.source = event.detail.source;
});
```

```ts
// src/server.ts
import { renderSvg } from '@draftably/runtime';
import { initial } from './diagram';

const attr = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

/** The diagram's markup with its static SVG, for a page your server sends. */
export async function render(): Promise<string> {
  const result = await renderSvg(initial, { target: 'inline', idPrefix: 'checkout' });
  const svg = result.ok ? result.value.svg : '';
  return `<draft-diagram label="Checkout" source="${attr(initial)}">${svg}</draft-diagram>`;
}
```

Angular uses the same elements. Add `CUSTOM_ELEMENTS_SCHEMA` to the component that uses them,
and bind the source as an attribute: `<draft-diagram [attr.source]="source">`. Import
`@draftably/runtime/element` and `@draftably/runtime/host.css` once.

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
SVG remains visible. The SVG is also available to search engines and link previews. Give each
inline diagram on a page its own `idPrefix`. Slot content renders on the server too, and
`host.css` hides it until the element loads, so nothing shifts.

Each recipe's `server` file shows the call. In a meta-framework, run it where the framework loads
data on the server, and pass the same string to the component when it hydrates:

| Framework  | Where `renderSvg` runs                                                   | Import from               |
| ---------- | ------------------------------------------------------------------------ | ------------------------- |
| Next.js    | a server component (`app/page.tsx`)                                      | `@draftably/react/server` |
| SolidStart | a `query` with `'use server'`, read with `createAsync`                   | `@draftably/solid`        |
| Nuxt       | `useAsyncData` in the page, so the payload carries the SVG to the client | `@draftably/vue`          |
| SvelteKit  | `load` in `+page.server.ts`                                              | `@draftably/svelte`       |

The editor loads in the browser only, after the component mounts. Its element renders on the
server as an empty, sized box.

Before each release, `pnpm prove:meta` in Draftably's repository builds a small app in each of
these four frameworks for production, with server rendering and a strict CSP. It is not part of
CI. It checks server HTML, hydration, a body that reads the framework's
context and page CSS, a marked button, a caret across a source update, two editors with separate
shortcuts, a failed update, the CSP, and 50 mount cycles.

## Strict CSP

Draftably works under a strict Content Security Policy with nonces and no `'unsafe-inline'`:

```text
default-src 'self'; script-src 'self' 'nonce-RANDOM'; style-src 'self' 'nonce-RANDOM';
font-src 'self' data:; img-src 'self' data:; worker-src 'self'; object-src 'none'; base-uri 'none'
```

- **Styles.** The elements' styles are constructable stylesheets, which need no nonce. The static
  SVG from `renderSvg` holds a `<style>`: pass your nonce as `styleNonce`. The viewer adds one to
  its drawing: pass it as `options={{ render: { styleNonce } }}`.
- **Fonts.** The viewer embeds its fonts as `data:` URLs, so `font-src` needs `data:`. To serve
  fonts from your origin instead, import `@draftably/runtime/fonts.css` and set
  `render: { fonts: 'host' }`; then `font-src 'self'` is enough.
- **Workers.** The viewer's render worker and the editor's engine worker are module files beside
  each package, so `worker-src 'self'` is enough.
- **Your framework.** Its own inline scripts need the nonce: Next.js reads it from the request's
  CSP header, SolidStart from `createHandler`'s `nonce`, SvelteKit and Nuxt from a server hook
  that adds it to each tag. SvelteKit's route announcer has an inline `style` attribute; allow
  it with `style-src-attr 'unsafe-hashes' 'sha256-…'`, as the hash in the browser's error states.

## Debug a diagram

The element is the way in. `el.viewer` and `el.editor` are the handles, and every handle event
reaches the element as a `draft-<name>` event:

```ts
const el = document.querySelector('draft-diagram')!;
el.addEventListener('draft-diagnostics', event => console.table(event.detail.diagnostics));
el.getAttribute('status'); // 'loading', 'ready' or 'error'; a later failed update keeps 'ready'
await el.updateComplete; // the latest update's result
el.viewer?.geometry(); // every node, group and edge, in world units
el.viewer?.getCamera();
```

`diagnostics` lists source errors and warnings with line numbers, and slot problems:
`DRAFT_SLOT_UNKNOWN` for a body on an ID the drawing lacks, `DRAFT_SLOT_OVERFLOW` for content
larger than its node. A failed update keeps the last drawing and shows the message under it.
