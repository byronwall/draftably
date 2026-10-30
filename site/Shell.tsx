import { useLocation, useNavigate, type RouteSectionProps } from '@solidjs/router';
import { createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js';
import { deliver, readDiagramFile, readPastedText, REOPEN_HINT } from './reopen';

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * Every page: a draftably PNG, SVG or `.draft` file dropped or pasted anywhere opens in the
 * playground, so someone with an exported diagram is back at work in one step.
 */
export function Shell(props: RouteSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dragging, setDragging] = createSignal(false);
  const [error, setError] = createSignal('');
  let errorTimer: ReturnType<typeof setTimeout> | undefined;

  // A new page starts at its top; a link to a section scrolls there itself.
  createEffect(
    on(
      () => location.pathname,
      () => {
        if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
      },
      { defer: true },
    ),
  );

  const fail = (message: string) => {
    setError(message);
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => setError(''), 3500);
  };
  const open = (source: string) => {
    deliver(source);
    if (!location.pathname.endsWith('/play')) navigate('/play');
  };
  const openFile = async (file: File) => {
    const source = await readDiagramFile(file);
    if (source == null) fail(`${file.name} has no draftably source in it. ${REOPEN_HINT}.`);
    else open(source);
  };

  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
  const onDragOver = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (!e.relatedTarget) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) void openFile(file);
  };
  const onPaste = async (e: ClipboardEvent) => {
    const file = e.clipboardData?.files[0];
    if (file) {
      e.preventDefault();
      await openFile(file);
      return;
    }
    // Pasted SVG markup counts only outside text fields, where pasting text means typing it.
    if (editable(e.target)) return;
    const source = await readPastedText(e.clipboardData?.getData('text/plain') ?? '');
    if (source != null) open(source);
  };

  onMount(() => {
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
  });
  onCleanup(() => {
    window.removeEventListener('dragover', onDragOver);
    window.removeEventListener('dragleave', onDragLeave);
    window.removeEventListener('drop', onDrop);
    window.removeEventListener('paste', onPaste);
    clearTimeout(errorTimer);
  });

  return (
    <>
      {props.children}
      <Show when={dragging() || error()}>
        <div class="drop-veil" classList={{ 'is-error': !!error() }} onClick={() => setError('')}>
          {error() || REOPEN_HINT}
        </div>
      </Show>
    </>
  );
}
