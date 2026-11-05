import { enhanceDrafts } from '@draftably/markdown/client';
import '@draftably/runtime/viewer.css';
import '@draftably/runtime/fonts.css';

export function attachDraftDiagrams(root: HTMLElement): () => void {
  const enhancement = enhanceDrafts(root, {
    policies: new Map([['docs', { render: { fonts: 'host', links: { mode: 'none' } } }]]),
    onDiagnostic: diagnostic => {
      console.warn('Draft diagram enhancement:', diagnostic.code, diagnostic.message);
      root.dispatchEvent(
        new CustomEvent('draftably:diagnostic', { detail: diagnostic, bubbles: true }),
      );
    },
  });
  return () => enhancement.destroy();
}
