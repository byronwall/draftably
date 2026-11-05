import { attachDraftDiagrams } from './attach-client.js';

declare global {
  interface Window {
    startDraftDiagrams(root: HTMLElement): { destroy(): void };
    draftablyDiagnostics: unknown[];
  }
}
window.draftablyDiagnostics = [];
document.addEventListener('draftably:diagnostic', event => {
  window.draftablyDiagnostics.push((event as CustomEvent).detail);
});

window.startDraftDiagrams = root => {
  const cleanup = attachDraftDiagrams(root);
  return { destroy: cleanup };
};

const root = document.querySelector<HTMLElement>('#root');
const enhance = document.querySelector<HTMLButtonElement>('#enhance');
const restore = document.querySelector<HTMLButtonElement>('#restore');
let handle: { destroy(): void } | undefined;
enhance?.addEventListener('click', () => {
  if (!root || handle) return;
  handle = window.startDraftDiagrams(root);
  enhance.disabled = true;
  if (restore) restore.disabled = false;
});
restore?.addEventListener('click', () => {
  handle?.destroy();
  handle = undefined;
  if (enhance) enhance.disabled = false;
  restore.disabled = true;
});
