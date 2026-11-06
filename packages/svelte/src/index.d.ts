import type { Component } from 'svelte';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';

export type { DraftDiagramElement, UpdateResult, ViewerOptions };

export interface DraftDiagramProps {
  /** `.draft` source. A change redraws the diagram and keeps the camera. */
  source: string;
  /** A declared emphasis state to show. */
  state?: string | null;
  /** The accessible name. */
  label?: string;
  /** `'visible'` shows the item list under the drawing; `'hidden'` (default) shows it on focus. */
  outline?: 'visible' | 'hidden';
  /** Static SVG from `renderSvg(source, { target: 'inline', idPrefix })`, shown until the viewer draws. */
  svg?: string;
  options?: ViewerOptions;
  onupdate?: (result: UpdateResult) => void;
  class?: string;
  style?: string;
}

export const DraftDiagram: Component<DraftDiagramProps>;
