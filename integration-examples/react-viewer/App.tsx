import { useCallback, useEffect, useRef, useState } from 'react';
import { mountViewer, type ViewerHandle } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';

declare global {
  interface Window {
    __reactViewerHandles?: ViewerHandle[];
  }
}

const source = `diagram "Checkout" version=1
node web "Web app"
node api "API"
node db "Orders"
edge request web -> api "request"
edge query api -> db "query"
`;

function DiagramHost({ sourceText, onReady }: { sourceText: string; onReady: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef<ViewerHandle | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const viewer = mountViewer(host.current, { label: 'Checkout flow' });
    current.current = viewer;
    (window.__reactViewerHandles ??= []).push(viewer);
    return () => {
      viewer.destroy();
      if (current.current === viewer) current.current = null;
    };
  }, []);
  useEffect(() => {
    const viewer = current.current;
    if (!viewer) return;
    let active = true;
    void viewer.update(sourceText).then(result => {
      if (active && result.status === 'committed') onReady();
      if (active && result.status === 'error') console.error(result.error.diagnostics);
    });
    return () => {
      active = false;
    };
  }, [sourceText, onReady]);
  return <div ref={host} className="diagram-host" />;
}

export function App() {
  const [mounted, setMounted] = useState(true);
  const [sourceText, setSourceText] = useState(source);
  const ready = useCallback(() => {
    document.querySelector<HTMLImageElement>('#static-fallback')!.hidden = true;
  }, []);
  const toggle = () => {
    if (mounted) document.querySelector<HTMLImageElement>('#static-fallback')!.hidden = false;
    setMounted(!mounted);
  };
  return (
    <main>
      <h1>React Strict Mode</h1>
      <button type="button" onClick={toggle}>
        {mounted ? 'Unmount viewer' : 'Mount viewer'}
      </button>
      <button
        type="button"
        onClick={() => setSourceText(sourceText.replace('"Orders"', '"Archive"'))}
      >
        Update source
      </button>
      {mounted ? <DiagramHost sourceText={sourceText} onReady={ready} /> : null}
    </main>
  );
}
