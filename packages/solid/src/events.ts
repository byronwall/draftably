/** Event props from the runtime's one list of events: a new event adds no lines here. */
import { HOST_EVENTS, type HostEventName, type HostEvents } from '@draftably/runtime/host';

export type { HostEventName, HostEvents };

/** `onCamera`, `onSelect`, … : each receives the event's `detail`. */
export type HostEventProps = {
  [K in HostEventName as `on${Capitalize<K>}`]?: (detail: HostEvents[K]) => void;
};

/** Listen for every host event on `node`; each call reads the latest prop. */
export function listenHostEvents(node: HTMLElement, props: HostEventProps) {
  for (const name of HOST_EVENTS) {
    const key = `on${name[0].toUpperCase()}${name.slice(1)}` as keyof HostEventProps;
    node.addEventListener(`draft-${name}`, event =>
      (props[key] as ((detail: unknown) => void) | undefined)?.((event as CustomEvent).detail),
    );
  }
}
