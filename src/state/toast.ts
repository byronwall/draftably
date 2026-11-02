import { createRoot, createSignal } from 'solid-js';

/** A button on a toast, such as a way to take back what the message reports. */
export interface ToastAction {
  label: string;
  run: () => void;
}

const [message, setMessage] = createRoot(() =>
  createSignal<{ text: string; id: number; action?: ToastAction } | null>(null),
);
let timer: number | undefined;
let serial = 0;

export const toastMessage = message;

/** Show a short status message at the bottom of the screen, with an optional button. */
export function toast(text: string, action?: ToastAction) {
  setMessage({ text, id: ++serial, action });
  window.clearTimeout(timer);
  timer = window.setTimeout(() => setMessage(null), action ? 6000 : 3400);
}

/** Hide the toast now. */
export function dismissToast() {
  window.clearTimeout(timer);
  setMessage(null);
}
