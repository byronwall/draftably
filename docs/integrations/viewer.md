# Embed a draftably viewer

The viewer owns the children of its host. Give it an empty element, mount after the DOM exists, then call `update` with source text. Each handle owns its camera and cleanup.

```ts
import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

const host = document.querySelector<HTMLElement>('#diagram');
if (!host) throw new Error('Missing #diagram host');
const viewer = mountViewer(host, { label: 'Checkout diagram' });
const result = await viewer.update(source);
if (result.status === 'error') console.error(result.error.diagnostics);
// Call viewer.update(nextSource) when source changes.
// Call viewer.destroy() when the host is removed.
```

The viewer embeds its used fonts by default. It waits for those font faces to load before it commits a drawing, and it removes faces it registered when destroyed. A blocked font returns an environment error and keeps the previous drawing visible. Set `render: { fonts: 'host' }` to use host fonts, and import `@draftably/runtime/fonts.css` in that case. Host mode also waits for every expected family and weight; a missing face is an error. A host link resolver requires `execution: { mode: 'main' }` because worker messages cannot carry functions.

The default worker uses a module-relative asset and must be served from the same origin. A restrictive CSP must allow that worker. Worker setup or timeout failures appear as update errors; the viewer does not silently switch to main-thread compilation. Set `execution: { mode: 'main' }` only for known small inputs.

The viewer uses wheel zoom, background drag to pan, named zoom and fit buttons, and `+`, `-`, and `f` keys while its viewport is focused. **Fit diagram** shows the full overview with a margin, capped at actual size. Use **Actual size** or select an item in the outline to inspect small labels. Outline selection centers the item and raises zoom to at least actual size. User camera changes persist through source updates and resizes; call `fit()` or request `{ camera: 'fit' }` for a new overview.

## React

Mount and destroy in an effect. A separate effect updates source, so React Strict Mode can run setup, cleanup, and setup without sharing a handle.

```tsx
import { useEffect, useRef } from 'react';
import { mountViewer, type ViewerHandle } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

export function DraftDiagram({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef<ViewerHandle | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const viewer = mountViewer(host.current, { label: 'Diagram' });
    current.current = viewer;
    return () => {
      viewer.destroy();
      if (current.current === viewer) current.current = null;
    };
  }, []);
  useEffect(() => {
    void current.current?.update(source);
  }, [source]);
  return <div ref={host} className="diagram-host" />;
}
```

## Solid

Register cleanup synchronously. Keep `props.source` reactive.

```tsx
import { createEffect, onCleanup, onMount } from 'solid-js';
import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

export function DraftDiagram(props: { source: string }) {
  let host!: HTMLDivElement;
  let viewer: ReturnType<typeof mountViewer> | undefined;
  onCleanup(() => viewer?.destroy());
  onMount(() => {
    viewer = mountViewer(host, { label: 'Diagram' });
    createEffect(() => {
      void viewer?.update(props.source);
    });
  });
  return <div ref={host} class="diagram-host" />;
}
```

## Vue and Svelte

Vue calls `mountViewer` from `onMounted`, watches the source, and calls `destroy` from `onUnmounted`. Register all three synchronously in `setup`.

```ts
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';
const props = defineProps<{ source: string }>();
const host = ref<HTMLElement | null>(null);
let viewer: ReturnType<typeof mountViewer> | undefined;
onMounted(() => {
  if (!host.value) return;
  viewer = mountViewer(host.value);
  void viewer.update(props.source);
});
watch(
  () => props.source,
  value => {
    void viewer?.update(value);
  },
);
onUnmounted(() => viewer?.destroy());
```

```vue
<template><div ref="host" class="diagram-host"></div></template>
```

Svelte calls `mountViewer` inside a synchronous `onMount` callback and returns teardown. Do not make that callback `async`; Svelte expects the cleanup function directly.

```svelte
<script>
  import { onMount } from 'svelte';
  import { mountViewer } from '@draftably/runtime/viewer';
  import '@draftably/runtime/viewer.css';
  export let source;
  let host;
  let viewer;
  $: if (viewer) void viewer.update(source);
  onMount(() => {
    viewer = mountViewer(host);
    return () => { viewer.destroy(); viewer = undefined; };
  });
</script>
<div bind:this={host} class="diagram-host"></div>
```

## Static rendering and SSR

For static SSR, render an SVG during the build and use an ordinary image. To enhance it, keep the image as a sibling fallback and mount into an empty sibling after hydration. Hide the image only after an update returns `committed`; keep it visible on error. Leave the image and its accessible description available if a worker or font asset fails. Frameworks must not reconcile children inside the viewer host.

Give `.diagram-host` a height in the host stylesheet. The viewer fills that height, observes size changes, and defers initial fitting while hidden.
