import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { WorkspaceFile } from '../server/workspace';
import { ago, baseName } from './workspace-files';

const OPEN_DELAY = 550;
/** Long enough to cross the gap between two rows without the card closing in between. */
const CLOSE_DELAY = 120;

const [shown, setShown] = createSignal<{ file: WorkspaceFile; top: number; left: number }>();
let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function show(row: HTMLElement, file: WorkspaceFile) {
  const side = row.closest('.sidebar') ?? row;
  setShown({
    file,
    top: row.getBoundingClientRect().top - 6,
    left: side.getBoundingClientRect().right + 8,
  });
}

function enter(row: HTMLElement, file: WorkspaceFile) {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  // Once a card is up, the next row's card replaces it at once.
  if (shown()) show(row, file);
  else openTimer = setTimeout(() => show(row, file), OPEN_DELAY);
}

function leave() {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => setShown(), CLOSE_DELAY);
}

export function closeFileCard() {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  setShown();
}

/** Handlers for a file row: hover or keyboard focus opens its card after a short pause. */
export const fileCard = (file: WorkspaceFile) => ({
  onMouseEnter: (e: MouseEvent) => enter(e.currentTarget as HTMLElement, file),
  onMouseLeave: leave,
  onFocus: (e: FocusEvent) => enter(e.currentTarget as HTMLElement, file),
  onBlur: leave,
});

/**
 * The hovered diagram's full title, subtitle, path and change time, beside the sidebar over the
 * canvas so it never covers the list.
 */
export function FileHoverCard() {
  onMount(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFileCard();
    window.addEventListener('keydown', onKey, true);
    onCleanup(() => {
      window.removeEventListener('keydown', onKey, true);
      closeFileCard();
    });
  });
  return (
    <Show when={shown()}>
      {s => (
        <Portal>
          <div
            ref={card => {
              // Keep the card inside the window when the row sits near the bottom.
              createEffect(() => {
                const top = Math.min(s().top, window.innerHeight - card.offsetHeight - 8);
                card.style.top = `${Math.max(8, top)}px`;
              });
            }}
            class="file-card"
            role="tooltip"
            style={{ left: `${s().left}px` }}
          >
            <strong>{s().file.title || baseName(s().file.path)}</strong>
            <Show when={s().file.subtitle}>
              <p>{s().file.subtitle}</p>
            </Show>
            <code>{s().file.path}</code>
            <span class="file-card-time">
              Changed {ago(s().file.modified)} ·{' '}
              {new Date(s().file.modified).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        </Portal>
      )}
    </Show>
  );
}
