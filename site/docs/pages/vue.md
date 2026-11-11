# Vue and Nuxt

`DraftDiagram` shows a diagram and `DraftEditor` edits one, in Vue 3. Both wrap the
[elements](#embed-concepts), so they take any attribute, a ref and `@…` events.

## Build the app

A complete Vite app with both components, an event, a field on a node, a dark page, `host.css`
and server rendering. Start from `pnpm create vite` with the `vue-ts` template, then add the
files below. CI builds this app from this page: it type-checks it, builds it, renders it on the
server, loads it, and edits a diagram under the development server.

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
/* Host CSS reaches slot content. `color-scheme: dark` darkens the drawings too; the --draft-*
   properties color the viewer's frame and controls. */
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

The page's `color-scheme` sets the drawings' colors, so `.app.dark` draws the diagram and the
editor's canvas dark. The `--draft-*` properties color the viewer's frame and controls, and
`data-theme="dark"` on the editor darkens its panels and toolbar. [Theming](#theming) has every
property and the opt-out.

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

## Nuxt

Nuxt runs `renderSvg` in `useAsyncData`, and the payload carries the SVG to the client for
hydration. Register the components in a page as usual:

```vue
<!-- app/app.vue -->
<script setup lang="ts">
import { renderSvg } from '@draftably/vue';
import App from './App.vue';
import { initial } from './diagram';

// From server/plugins/csp.ts below. Without a CSP, drop the nonce.
const event = useRequestEvent();
const { data } = await useAsyncData('diagram', async () => {
  const nonce = event?.context.nonce as string;
  const result = await renderSvg(initial, {
    target: 'inline',
    idPrefix: 'checkout',
    styleNonce: nonce,
  });
  return { svg: result.ok ? result.value.svg : undefined, nonce };
});
</script>

<template>
  <App :svg="data?.svg" :nonce="data?.nonce" />
</template>
```

Pass the nonce on to the viewer, which adds a `<style>` to its drawing:
`:options="{ detail: 'full', render: { styleNonce: nonce } }"`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['@draftably/runtime/host.css', '~/theme.css'],
  // Real stylesheets: inlined styles would need the request's nonce.
  features: { inlineStyles: false },
});
```

### Strict CSP in Nuxt

A Nitro plugin makes a nonce for each request, puts it on every tag Nuxt writes, and sends the
policy. `features.inlineStyles: false` above keeps Nuxt's CSS in stylesheet links, which the
policy allows:

```ts
// server/plugins/csp.ts
/** A strict CSP with a nonce per request, on every tag Nuxt writes into the page. */
import { randomBytes } from 'node:crypto';

export default defineNitroPlugin(nitro => {
  nitro.hooks.hook('request', event => {
    event.context.nonce = randomBytes(16).toString('base64');
  });

  nitro.hooks.hook('render:html', (html, { event }) => {
    const nonce = event.context.nonce as string;
    // Tags that already carry a nonce (the server SVG's style) keep theirs.
    const add = (part: string) =>
      part.replace(/<(script|style|link)\b(?![^>]*\snonce=)/g, `<$1 nonce="${nonce}"`);
    for (const key of ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const)
      html[key] = html[key].map(add);
  });

  nitro.hooks.hook('render:response', (response, { event }) => {
    const n = `'nonce-${event.context.nonce}'`;
    response.headers ??= {};
    response.headers['content-security-policy'] = [
      "default-src 'self'",
      `script-src 'self' ${n}`,
      `style-src 'self' ${n}`,
      "font-src 'self' data:",
      "img-src 'self' data:",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
    ].join('; ');
  });
});
```
