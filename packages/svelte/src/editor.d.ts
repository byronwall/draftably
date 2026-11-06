import type { Component } from 'svelte';
import type { DraftEditorElement } from '@draftably/editor/element';

export type { DraftEditorElement };

export interface DraftEditorProps {
  /** `.draft` source. Passing back the text from `onchange` does not redraw. */
  source: string;
  /** Receives the new source after every kept edit, undo and redo. */
  onchange?: (source: string) => void;
  class?: string;
  style?: string;
}

export const DraftEditor: Component<DraftEditorProps>;
