/** `<DraftEditor>` for Solid: drag boxes and lines, and get the `.draft` source back. */
import type { DraftEditorElement, EditorOptions } from '@draftably/editor/element';
import { onMount, type JSX } from 'solid-js';
import { listenHostEvents, type HostEventProps } from './events.js';

export type { DraftEditorElement, EditorOptions };

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'draft-editor': JSX.HTMLAttributes<DraftEditorElement> & {
        source?: string;
        'prop:options'?: EditorOptions;
      };
    }
  }
}

export interface DraftEditorProps extends HostEventProps {
  /** `.draft` source. Passing back the source from `onChange` does not redraw. */
  source: string;
  /** Every `mountEditor` option but `source` and `onChange`. Callbacks apply live. */
  options?: EditorOptions;
  ref?: (element: DraftEditorElement) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export function DraftEditor(props: DraftEditorProps) {
  let el: DraftEditorElement | undefined;
  // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
  onMount(() =>
    import('@draftably/editor/element').catch((error: unknown) => {
      el?.setAttribute('status', 'error');
      el?.setAttribute('data-error', String(error));
    }),
  );
  return (
    <draft-editor
      ref={(node: DraftEditorElement) => {
        el = node;
        listenHostEvents(node, props);
        props.ref?.(node);
      }}
      source={props.source}
      prop:options={props.options ?? {}}
      class={props.class}
      style={props.style}
    />
  );
}
