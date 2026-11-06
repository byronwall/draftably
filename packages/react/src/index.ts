'use client';
/** `<DraftDiagram>` for React 19: the `<draft-diagram>` element with React props, a ref and `onUpdate`. */
import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';

export type { DraftDiagramElement, UpdateResult, ViewerOptions };

export interface DraftDiagramProps {
  /** `.draft` source. A change redraws the diagram and keeps the camera. */
  source: string;
  /** A declared emphasis state to show. */
  state?: string | null;
  /** The accessible name. */
  label?: string;
  /**
   * Static SVG from `renderSvg(source, { target: 'inline', idPrefix })`, shown until the viewer
   * draws. Server rendering and readers without JavaScript see it.
   */
  svg?: string;
  options?: ViewerOptions;
  onUpdate?: (result: UpdateResult) => void;
  className?: string;
  style?: CSSProperties;
}

export const DraftDiagram = forwardRef<DraftDiagramElement | null, DraftDiagramProps>(
  function DraftDiagram({ source, state, label, svg, options, onUpdate, className, style }, ref) {
    const el = useRef<DraftDiagramElement>(null);
    useImperativeHandle(ref, () => el.current!, []);
    useEffect(() => {
      if (el.current && options) el.current.options = options;
    }, [options]);
    useEffect(() => {
      const node = el.current;
      if (!node || !onUpdate) return;
      const listen = (event: Event) => onUpdate((event as CustomEvent<UpdateResult>).detail);
      node.addEventListener('draft-update', listen);
      return () => node.removeEventListener('draft-update', listen);
    }, [onUpdate]);
    return createElement(
      'draft-diagram',
      { ref: el, source, state: state ?? undefined, label, className, style },
      svg ? createElement('div', { dangerouslySetInnerHTML: { __html: svg } }) : null,
    );
  },
);
