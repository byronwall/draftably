# Svelte and SvelteKit

`DraftDiagram` shows a diagram and `DraftEditor` edits one, in Svelte 5. Both wrap the
[elements](#embed-concepts), so they take any attribute, `bind:element` and `on…` event props.

## Build the app

A complete Vite app with both components, an event, a field on a node, a dark page, `host.css`
and server rendering. Start from `pnpm create vite` with the `svelte-ts` template, then add the
files below. CI builds this app from this page: it type-checks it, builds it, renders it on the
server, loads it, and edits a diagram under the development server.

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

## SvelteKit

SvelteKit runs `renderSvg` in a server `load`, and the page hydrates with the same data:

```ts
// src/routes/+page.server.ts
import { renderSvg } from '@draftably/svelte';
import { initial } from '#lib/diagram';

export async function load({ locals }) {
  // From src/hooks.server.ts below. Without a CSP, drop the nonce.
  const result = await renderSvg(initial, {
    target: 'inline',
    idPrefix: 'checkout',
    styleNonce: locals.nonce,
  });
  return { svg: result.ok ? result.value.svg : undefined, nonce: locals.nonce };
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import '@draftably/runtime/host.css';
  import '#lib/theme.css';
  import App from '#lib/App.svelte';

  let { data } = $props();
</script>

<App svg={data.svg} nonce={data.nonce} />
```

Pass the nonce on to the viewer, which adds a `<style>` to its drawing:
`options={{ detail: 'full', render: { styleNonce: nonce } }}`. SvelteKit 3 reads `src/lib` through
the `#lib` subpath import.

### Strict CSP in SvelteKit

SvelteKit's own `csp` option makes a nonce that `load` cannot read, and the server SVG's `<style>`
needs it. So a hook makes the nonce, gives it to `load`, puts it on SvelteKit's inline script and
sends the policy:

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

declare global {
  // SvelteKit types `locals` through this namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace App {
    interface Locals {
      nonce: string;
    }
  }
}

/**
 * A strict CSP with one nonce per request. SvelteKit's `csp` option makes its own nonce, but
 * `load` cannot read it, and the server SVG's `<style>` needs it. So this hook makes the nonce,
 * hands it to `load` in `locals`, puts it on SvelteKit's one inline script (its bootstrap, which
 * it writes as a bare `<script>` when `csp` is off) and sends the header itself.
 *
 * SvelteKit's root component mounts a route announcer with a fixed `style="..."` attribute
 * (`@sveltejs/kit/src/runtime/components/root.svelte`), and a nonce cannot cover an attribute.
 * `style-src-attr` allows that one value by its hash and blocks every other style attribute.
 */
const ANNOUNCER = "'unsafe-hashes' 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='";
export const handle: Handle = async ({ event, resolve }) => {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  event.locals.nonce = nonce;
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replaceAll('<script>', `<script nonce="${nonce}">`),
  });
  response.headers.set(
    'content-security-policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}'`,
      `style-src-attr ${ANNOUNCER}`,
      "font-src 'self' data:",
      "img-src 'self' data:",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
    ].join('; '),
  );
  return response;
};
```

```ts
// vite.config.ts
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit 3 takes its options here. `inlineStyleThreshold` stays at its default 0, so CSS
// ships as stylesheet links and the strict CSP needs no style nonce for SvelteKit itself.
export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })],
});
```

The hash covers the route announcer's `style` attribute in SvelteKit 3.2. If your browser's
console reports a different hash, use that one.
