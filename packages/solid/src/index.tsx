/** `<DraftDiagram>` for Solid: the `<draft-diagram>` element with Solid props, a ref and event props. */
import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';
import { Show, type JSX } from 'solid-js';
import { listenHostEvents, type HostEventProps } from './events.js';

export { renderSvg } from '@draftably/runtime';
export { HOST_EVENTS } from '@draftably/runtime/host';
export type { HostEventName, HostEventProps, HostEvents } from './events.js';
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
        'prop:options'?: ViewerOptions;
      };
    }
  }
}

export interface DraftDiagramProps extends HostEventProps {
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
  /** Every `mountViewer` option. A new object with the same values does nothing. */
  options?: ViewerOptions;
  ref?: (element: DraftDiagramElement) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export function DraftDiagram(props: DraftDiagramProps) {
  return (
    <draft-diagram
      ref={(node: DraftDiagramElement) => {
        listenHostEvents(node, props);
        props.ref?.(node);
      }}
      source={props.source}
      state={props.state ?? undefined}
      label={props.label}
      outline={props.outline}
      prop:options={props.options ?? {}}
      class={props.class}
      style={props.style}
    >
      <Show when={props.svg}>{svg => <div innerHTML={svg()} />}</Show>
    </draft-diagram>
  );
}
