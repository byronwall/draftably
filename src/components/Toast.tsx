import { createMemo } from 'solid-js';
import { toastMessage } from '../state/toast';

export function Toast() {
  // Keep the last text while the toast fades out.
  const text = createMemo<string>(previous => toastMessage()?.text ?? previous, '');
  return (
    <div class="toast" classList={{ show: !!toastMessage() }} role="status" aria-live="polite">
      {text()}
    </div>
  );
}
