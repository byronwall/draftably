# React and Next.js

`DraftDiagram` shows a diagram and `DraftEditor` edits one, in React 19. Both wrap the
[elements](#embed-concepts), so they take any attribute, a ref and `on…` event props.

## Build the app

A complete Vite app with both components, an event, a field on a node, a dark page, `host.css`
and server rendering. Start from `pnpm create vite` with the `react-ts` template, then add the
files below. CI builds this app from this page: it type-checks it, builds it, renders it on the
server, loads it, and edits a diagram under the development server.

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
`onLink`, `onContextmenu`, `onAnchors`, and on the editor `onSelect` and `onChange`. The editor
sends no `render` or `itemactivate`. `onLink` and `onContextmenu` also get `preventDefault()`:

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

Draw your graph with React Flow? `@draftably/react/flow` draws the lines that Draftably routes.
See [Drop in your graph layout](#react-flow).

## Next.js

Next.js runs `renderSvg` in a server component and hydrates the app with the same SVG. Three
changes turn the Vite app above into a Next.js app:

- Add `'use client';` as the first line of `App.tsx`. The components are client components.
- Import `renderSvg` from `@draftably/react/server`. The main entry is a client module, so a
  server component cannot call its exports.
- Import `host.css` and your CSS in the root layout.

```tsx
// app/layout.tsx
import '@draftably/runtime/host.css';
import './theme.css';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { headers } from 'next/headers';
import { renderSvg } from '@draftably/react/server';
import { App } from './App';
import { initial } from './diagram';

export default async function Page() {
  // From proxy.ts below. Without a CSP, drop the nonce.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const result = await renderSvg(initial, {
    target: 'inline',
    idPrefix: 'checkout',
    styleNonce: nonce,
  });
  return <App svg={result.ok ? result.value.svg : undefined} nonce={nonce} />;
}
```

Pass the nonce on to the viewer, which adds a `<style>` to its drawing:

```tsx
export function App({ svg, nonce }: { svg?: string; nonce?: string }) {
  // …
  <DraftDiagram
    source={source}
    svg={svg}
    options={{ detail: 'full', render: { styleNonce: nonce } }}
  />;
}
```

### Strict CSP in Next.js

`proxy.ts` makes a nonce for each request. Next.js reads it from the request's CSP header and puts
it on its own scripts. `'strict-dynamic'` lets those scripts load the chunks they import:

```ts
// proxy.ts
// A strict CSP with a nonce per request. Next.js reads the nonce from the request's CSP header
// and puts it on its own scripts; the page reads `x-nonce` for the diagram's SVG and viewer.
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "font-src 'self' data:",
    "img-src 'self' data:",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('content-security-policy', csp);
  return response;
}
```

A nonce makes every page dynamic: Next.js renders it for each request. Next.js 16 builds with
Turbopack, and the packages' workers load from it with no setting.
