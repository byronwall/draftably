/** `<DraftDiagram>` for Solid: the `<draft-diagram>` element with Solid props, a ref and `onUpdate`. */
import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';
import { createEffect, onCleanup, Show, type JSX } from 'solid-js';

export type { DraftDiagramElement, UpdateResult, ViewerOptions };

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'draft-diagram': JSX.HTMLAttributes<DraftDiagramElement> & {
        source?: string;
        state?: string;
        label?: string;
        outline?: 'visible' | 'hidden';
      };
    }
  }
}

export interface DraftDiagramProps {
  /** `.draft` source. A change redraws the diagram and keeps the camera. */
  source: string;
  /** A declared emphasis state to show. */
  state?: string | null;
  /** The accessible name. */
  label?: string;
  /** `'visible'` shows the item list under the drawing; `'hidden'` (default) shows it on focus. */
  outline?: 'visible' | 'hidden';
  /**
   * Static SVG from `renderSvg(source, { target: 'inline', idPrefix })`, shown until the viewer
   * draws. Server rendering and readers without JavaScript see it.
   */
  svg?: string;
  options?: ViewerOptions;
  onUpdate?: (result: UpdateResult) => void;
  ref?: (element: DraftDiagramElement) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export function DraftDiagram(props: DraftDiagramProps) {
  let el: DraftDiagramElement | undefined;
  createEffect(() => {
    if (el && props.options) el.options = props.options;
  });
  createEffect(() => {
    const node = el;
    const onUpdate = props.onUpdate;
    if (!node || !onUpdate) return;
    const listen = (event: Event) => onUpdate((event as CustomEvent<UpdateResult>).detail);
    node.addEventListener('draft-update', listen);
    onCleanup(() => node.removeEventListener('draft-update', listen));
  });
  return (
    <draft-diagram
      ref={(node: DraftDiagramElement) => {
        el = node;
        props.ref?.(node);
      }}
      source={props.source}
      state={props.state ?? undefined}
      label={props.label}
      outline={props.outline}
      class={props.class}
      style={props.style}
    >
      <Show when={props.svg}>{svg => <div innerHTML={svg()} />}</Show>
    </draft-diagram>
  );
}
