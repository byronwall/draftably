import type { HostEventName, HostEvents } from '@draftably/runtime/host';

export type { HostEventName, HostEvents };

/** `oncamera`, `onselect`, … : each receives the event's `detail`. */
export type HostEventProps = {
  [K in HostEventName as `on${K}`]?: (detail: HostEvents[K]) => void;
};

export function listenHostEvents(node: HTMLElement, props: Record<string, unknown>): () => void;
