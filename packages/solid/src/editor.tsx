/** `<DraftEditor>` for Solid: drag boxes and lines, and get the `.draft` source back. */
import type { DraftEditorElement } from '@draftably/editor/element';
import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';

export type { DraftEditorElement };

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'draft-editor': JSX.HTMLAttributes<DraftEditorElement> & { source?: string };
    }
  }
}

export interface DraftEditorProps {
  /** `.draft` source. Passing back the text from `onChange` does not redraw. */
  source: string;
  /** Receives the new source after every kept edit, undo and redo. */
  onChange?: (source: string) => void;
  ref?: (element: DraftEditorElement) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export function DraftEditor(props: DraftEditorProps) {
  let el: DraftEditorElement | undefined;
  // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
  onMount(() => void import('@draftably/editor/element'));
  createEffect(() => {
    const node = el;
    const onChange = props.onChange;
    if (!node || !onChange) return;
    const listen = (event: Event) => onChange((event as CustomEvent<string>).detail);
    node.addEventListener('draft-change', listen);
    onCleanup(() => node.removeEventListener('draft-change', listen));
  });
  return (
    <draft-editor
      ref={(node: DraftEditorElement) => {
        el = node;
        props.ref?.(node);
      }}
      source={props.source}
      class={props.class}
      style={props.style}
    />
  );
}
