import { createRoot, createSignal } from 'solid-js';

const [message, setMessage] = createRoot(() =>
  createSignal<{ text: string; id: number } | null>(null),
);
let timer: number | undefined;
let serial = 0;

export const toastMessage = message;

/** Show a short status message at the bottom of the screen. */
export function toast(text: string) {
  setMessage({ text, id: ++serial });
  window.clearTimeout(timer);
  timer = window.setTimeout(() => setMessage(null), 3400);
}
