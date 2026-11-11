import type { Component } from 'svelte';
import type { DraftEditorElement, EditorOptions } from '@draftably/editor/element';
import type { HostEventProps } from './events';

export type { DraftEditorElement, EditorOptions };

export interface DraftEditorProps extends HostEventProps {
  /** `.draft` source. Passing back the source from `onchange` does not redraw. */
  source: string;
  /** Every `mountEditor` option but `source` and `onChange`. Callbacks apply live. */
  options?: EditorOptions;
  /** `bind:element` gives the `<draft-editor>` element. */
  element?: DraftEditorElement;
  class?: string;
  style?: string;
}

export const DraftEditor: Component<DraftEditorProps, Record<string, never>, 'element'>;
