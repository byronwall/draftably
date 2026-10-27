import { createMemo, For, Show } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { renderSvg } from '../../cli/svg';
import { doc } from '../../state/document';
import { activeState, gridOpen, setGridOpen, showState, states } from '../../state/emphasis';

/**
 * The file's emphasis states as chips over the canvas: none, each state, and a grid of all of
 * them. Hidden when the file has no `state` lines.
 */
export function StateBar() {
  return (
    <Show when={states().length}>
      <nav class="state-bar" aria-label="Emphasis states" title="[ and ] step through states">
        <button
          type="button"
          class="state-chip"
          aria-pressed={!activeState() && !gridOpen()}
          onClick={() => (setGridOpen(false), showState(null))}
        >
          All
        </button>
        <For each={states()}>
          {s => (
            <button
              type="button"
              class="state-chip"
              aria-pressed={activeState() === s.id && !gridOpen()}
              onClick={() => (setGridOpen(false), showState(s.id))}
            >
              {s.label}
            </button>
          )}
        </For>
        <span class="state-bar-rule" />
        <button
          type="button"
          class="state-chip"
          aria-pressed={gridOpen()}
          onClick={() => setGridOpen(!gridOpen())}
        >
          Grid
        </button>
      </nav>
      <Show when={gridOpen()}>
        <StateGrid />
      </Show>
    </Show>
  );
}

/** Every state side by side, read-only, drawn as `inspect --svg --states` draws it. */
function StateGrid() {
  const markup = createMemo(() => renderSvg(structuredClone(unwrap(doc)), { states: true }));
  return (
    <div
      class="state-grid"
      role="dialog"
      aria-label="All emphasis states"
      onClick={e => {
        // Links in the panels would leave the page; a click picks the state instead.
        e.preventDefault();
        const panel = (e.target as Element).closest('[data-state]');
        if (!panel) return;
        setGridOpen(false);
        showState(panel.getAttribute('data-state'));
      }}
      // The markup is drawn from the file by `renderSvg`, which escapes every label.
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={markup()}
    />
  );
}
