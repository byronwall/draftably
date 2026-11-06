import { createMemo, createSignal, For, Show } from 'solid-js';
import { findConflicts } from '../dsl/conflicts';
import { useDiagramSession } from './session-context';

/**
 * Status bar entry for a diagram file: preferences that gave way, unsatisfied pins, drawing
 * conflicts as `check` reports them, and objects an outside change moved. Each note names the
 * source line it came from.
 */
export function FileNotes() {
  const s = useDiagramSession();
  const [open, setOpen] = createSignal(false);
  const conflicts = createMemo(() => {
    const scene = s.fileScene();
    return scene ? findConflicts(scene, s.doc, s.sceneRects(), s.routes()) : [];
  });
  const notes = () => [
    ...[...s.fileDiagnostics(), ...conflicts()].map(d => ({
      level: d.level,
      text: (d.line ? `Line ${d.line} · ` : '') + d.message,
    })),
    ...(s.movedByChange().length
      ? [
          {
            level: 'info',
            text: `The last change on disk also moved ${s.movedByChange().join(', ')}.`,
          },
        ]
      : []),
  ];
  const errors = () => notes().filter(n => n.level !== 'info').length;
  return (
    <span class="file-notes">
      <Show when={notes().length} fallback={<span>Layout follows the file</span>}>
        <button
          type="button"
          class="button ghost small"
          classList={{ warning: errors() > 0 }}
          aria-expanded={open()}
          onClick={() => setOpen(!open())}
        >
          {notes().length} layout note{notes().length === 1 ? '' : 's'}
        </button>
      </Show>
      <Show when={open() && notes().length}>
        <div class="file-notes-panel floating-panel" role="dialog" aria-label="Layout notes">
          <For each={notes()}>
            {note => (
              <p classList={{ 'file-note': true, warning: note.level !== 'info' }}>{note.text}</p>
            )}
          </For>
        </div>
      </Show>
    </span>
  );
}
