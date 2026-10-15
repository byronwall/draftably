import { createSignal, For, Show } from 'solid-js';
import { fileDiagnostics, movedByChange } from '../state/file-session';

/**
 * Status bar entry for a diagram file: preferences that gave way, unsatisfied pins, and objects
 * an outside change moved. Each note names the source line it came from.
 */
export function FileNotes() {
  const [open, setOpen] = createSignal(false);
  const notes = () => [
    ...fileDiagnostics().map(d => ({
      level: d.level,
      text: (d.line ? `Line ${d.line} · ` : '') + d.message,
    })),
    ...(movedByChange().length
      ? [
          {
            level: 'info',
            text: `The last change on disk also moved ${movedByChange().join(', ')}.`,
          },
        ]
      : []),
  ];
  const errors = () => notes().filter(n => n.level === 'error').length;
  return (
    <span class="file-notes">
      <button
        type="button"
        class="button ghost small"
        classList={{ warning: errors() > 0 }}
        aria-expanded={open()}
        disabled={!notes().length}
        onClick={() => setOpen(!open())}
      >
        {notes().length
          ? `${notes().length} layout note${notes().length === 1 ? '' : 's'}`
          : 'Layout follows the file'}
      </button>
      <Show when={open() && notes().length}>
        <div class="file-notes-panel floating-panel" role="dialog" aria-label="Layout notes">
          <For each={notes()}>
            {note => (
              <p classList={{ 'file-note': true, warning: note.level === 'error' }}>{note.text}</p>
            )}
          </For>
        </div>
      </Show>
    </span>
  );
}
