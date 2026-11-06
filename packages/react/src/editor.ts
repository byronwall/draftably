'use client';
/** `<DraftEditor>` for React 19: drag boxes and lines, and get the `.draft` source back. */
import type { DraftEditorElement } from '@draftably/editor/element';
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';

export type { DraftEditorElement };

export interface DraftEditorProps {
  /** `.draft` source. Passing back the text from `onChange` does not redraw. */
  source: string;
  /** Receives the new source after every kept edit, undo and redo. */
  onChange?: (source: string) => void;
  className?: string;
  style?: CSSProperties;
}

export const DraftEditor = forwardRef<DraftEditorElement | null, DraftEditorProps>(
  function DraftEditor({ source, onChange, className, style }, ref) {
    const el = useRef<DraftEditorElement>(null);
    useImperativeHandle(ref, () => el.current!, []);
    // The editor loads in the browser only, so server rendering and viewer-only pages skip it.
    useEffect(() => void import('@draftably/editor/element'), []);
    useEffect(() => {
      const node = el.current;
      if (!node || !onChange) return;
      const listen = (event: Event) => onChange((event as CustomEvent<string>).detail);
      node.addEventListener('draft-change', listen);
      return () => node.removeEventListener('draft-change', listen);
    }, [onChange]);
    return createElement('draft-editor', { ref: el, source, className, style });
  },
);
