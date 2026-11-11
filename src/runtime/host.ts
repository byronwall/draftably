/**
 * The host contract both elements share: the events they dispatch, as plain data. Framework
 * packages loop over `HOST_EVENTS`, so a new event adds no lines to any of them.
 * This module has no side effects and no runtime imports.
 */
import type { UpdateResult, ViewerEvents } from './viewer';

export type { Camera, CameraReason, FrameOptions, MoveResult } from './camera';
export type { Box, EdgeOut, Geometry, PlacedBox } from './geometry';
export type { Anchor, DraftSlot } from './anchors';

export interface HostEvents {
  /** After each commit, after the marked children change, and with `[]` before destroy. */
  anchors: ViewerEvents['anchors'];
  /** Each update's result: committed, error or a cancellation. */
  update: UpdateResult;
  render: ViewerEvents['render'];
  diagnostics: ViewerEvents['diagnostics'];
  camera: ViewerEvents['camera'];
  itemactivate: ViewerEvents['itemactivate'];
  /** Cancelable: `preventDefault()` on the DOM event stops Draftably opening the link. */
  link: Omit<ViewerEvents['link'], 'preventDefault'>;
  /** Cancelable: `preventDefault()` on the DOM event stops the browser's menu. */
  contextmenu: Omit<ViewerEvents['contextmenu'], 'preventDefault'>;
  /** The editor only: the selection changed, by the user or through `select()`. */
  select: { ids: readonly string[]; reason: 'user' | 'api' };
  /** The editor only: the source after a kept edit, undo or redo. */
  change: { source: string };
}

export type HostEventName = keyof HostEvents;

/** Every event, in one list. Each element dispatches these as bubbling `draft-<name>` events. */
export const HOST_EVENTS = [
  'anchors',
  'update',
  'render',
  'diagnostics',
  'camera',
  'itemactivate',
  'link',
  'contextmenu',
  'select',
  'change',
] as const satisfies readonly HostEventName[];

/** Events a host can cancel with `preventDefault()`. */
export const CANCELABLE_EVENTS: readonly HostEventName[] = ['link', 'contextmenu'];

export type DraftEventMap = {
  [K in HostEventName as `draft-${K}`]: CustomEvent<HostEvents[K]>;
};

/** The element's `status` attribute. */
export type DraftStatus = 'loading' | 'ready' | 'error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLElementEventMap extends DraftEventMap {}
}
