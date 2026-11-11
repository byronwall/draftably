'use client';
/** `<DraftEditor>` for React 19: drag boxes and lines, and get the `.draft` source back. */
import type { DraftEditorElement, EditorOptions } from '@draftably/editor/element';
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useBeforeMount, useHostEvents, type HostEventProps } from './events.js';

export type { DraftEditorElement, EditorOptions };

export interface DraftEditorProps extends HostEventProps {
  /** `.draft` source. Passing back the source from `onChange` does not redraw. */
  source: string;
  /** Every `mountEditor` option but `source` and `onChange`. Callbacks apply live. */
  options?: EditorOptions;
  className?: string;
  style?: CSSProperties;
  /** Slot content: children marked `data-draft-slot="body:<id>"` or `"overlay:<id>"`. */
  children?: ReactNode;
}

export const DraftEditor = forwardRef<DraftEditorElement | null, DraftEditorProps>(
  function DraftEditor(props, ref) {
    const { source, options, className, style, children } = props;
    const el = useRef<DraftEditorElement>(null);
    useImperativeHandle(ref, () => el.current!, []);
    useBeforeMount(() => {
      if (el.current) el.current.options = options ?? {};
    }, [options]);
    useHostEvents(el, props);
    // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
    useEffect(() => {
      import('@draftably/editor/element').catch((error: unknown) => {
        el.current?.setAttribute('status', 'error');
        el.current?.setAttribute('data-error', String(error));
      });
    }, []);
    return createElement('draft-editor', { ref: el, source, className, style }, children);
  },
);
