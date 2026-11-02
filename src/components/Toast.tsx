import { createMemo, Show } from 'solid-js';
import { dismissToast, toastMessage } from '../state/toast';

export function Toast() {
  // Keep the last text while the toast fades out.
  const text = createMemo<string>(previous => toastMessage()?.text ?? previous, '');
  return (
    <div
      class="toast"
      classList={{ show: !!toastMessage(), actionable: !!toastMessage()?.action }}
      role="status"
      aria-live="polite"
    >
      {text()}
      <Show when={toastMessage()?.action}>
        {action => (
          <button
            type="button"
            class="toast-action"
            onClick={() => {
              const { run } = action();
              dismissToast();
              run();
            }}
          >
            {action().label}
          </button>
        )}
      </Show>
    </div>
  );
}
