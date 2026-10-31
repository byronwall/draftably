import { createSignal, Show } from 'solid-js';
import { Zoom } from '../docs/Zoom';

/**
 * A button that opens `svg` over the whole window, in the docs' expanded view. It sits in the top
 * right corner of its nearest positioned parent. `error` says the drawing is the last good one.
 */
export function Expand(props: { svg: string; error?: string }) {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <button type="button" class="drag-expand" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
        </svg>
        Expand
      </button>
      <Show when={open()}>
        <Zoom svg={props.svg} error={props.error} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
}
