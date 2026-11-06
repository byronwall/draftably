import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { mountViewer, type ViewerHandle } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';
import './style.css';

const source = `diagram "Checkout" version=1
node web "Web app"
node api "API"
node db "Orders"
edge request web -> api "request"
edge query api -> db "query"
`;
const root = document.querySelector<HTMLElement>('#root')!;
const fallback = document.querySelector<HTMLImageElement>('#static-fallback')!;

declare global {
  interface Window {
    __solidViewerHandles?: ViewerHandle[];
  }
}

function DiagramHost(props: { text: string }) {
  let host: HTMLDivElement | undefined;
  let handle: ViewerHandle | undefined;
  onMount(() => {
    if (!host) throw new Error('The diagram host is missing.');
    handle = mountViewer(host, { label: 'Checkout flow' });
    (window.__solidViewerHandles ??= []).push(handle);
    void handle.update(props.text).then(result => {
      if (result.status === 'committed') fallback.hidden = true;
    });
  });
  createEffect(() => {
    if (handle)
      void handle.update(props.text).then(result => {
        if (result.status === 'committed') fallback.hidden = true;
      });
  });
  onCleanup(() => {
    handle?.destroy();
    fallback.hidden = false;
  });
  return <div ref={element => (host = element)} class="diagram-host" />;
}

function App() {
  const [mounted, setMounted] = createSignal(true);
  const [text, setText] = createSignal(source);
  return (
    <main>
      <h1>Solid viewer</h1>
      <button type="button" onClick={() => setMounted(!mounted())}>
        {mounted() ? 'Unmount viewer' : 'Mount viewer'}
      </button>
      <button type="button" onClick={() => setText(text().replace('"Orders"', '"Archive"'))}>
        Update source
      </button>
      <Show when={mounted()}>
        <DiagramHost text={text()} />
      </Show>
    </main>
  );
}

const dispose = render(() => <App />, root);
window.addEventListener(
  'pagehide',
  () => {
    dispose();
    fallback.hidden = false;
  },
  { once: true },
);
