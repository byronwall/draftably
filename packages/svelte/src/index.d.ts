import type { Component } from 'svelte';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import type { UpdateResult, ViewerOptions } from '@draftably/runtime/viewer';
import type { HostEventProps } from './events';

export { renderSvg } from '@draftably/runtime';
export { HOST_EVENTS } from '@draftably/runtime/host';
export type { HostEventName, HostEventProps, HostEvents } from './events';
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
  /** Static SVG from `renderSvg(source, { target: 'inline', idPrefix })`, shown until the viewer draws. */
  svg?: string;
  /** Every `mountViewer` option. A new object with the same values does nothing. */
  options?: ViewerOptions;
  /** `bind:element` gives the `<draft-diagram>` element. */
  element?: DraftDiagramElement;
  class?: string;
  style?: string;
}

export const DraftDiagram: Component<DraftDiagramProps, Record<string, never>, 'element'>;
