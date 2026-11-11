'use client';
/** `<DraftDiagram>` for React 19: the `<draft-diagram>` element with React props, a ref and event props. */
import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';
import { createElement, forwardRef, useImperativeHandle, useRef, type CSSProperties } from 'react';
import { useBeforeMount, useHostEvents, type HostEventProps } from './events.js';

export { renderSvg } from '@draftably/runtime';
export { HOST_EVENTS } from '@draftably/runtime/host';
export type { HostEventName, HostEventProps, HostEvents } from './events.js';
export type { DraftDiagramElement, UpdateResult, ViewerOptions };

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
  className?: string;
  style?: CSSProperties;
}

export const DraftDiagram = forwardRef<DraftDiagramElement | null, DraftDiagramProps>(
  function DraftDiagram(props, ref) {
    const { source, state, label, outline, svg, options, className, style } = props;
    const el = useRef<DraftDiagramElement>(null);
    useImperativeHandle(ref, () => el.current!, []);
    useBeforeMount(() => {
      if (el.current) el.current.options = options ?? {};
    }, [options]);
    useHostEvents(el, props);
    return createElement(
      'draft-diagram',
      { ref: el, source, state: state ?? undefined, label, outline, className, style },
      svg ? createElement('div', { dangerouslySetInnerHTML: { __html: svg } }) : null,
    );
  },
);
