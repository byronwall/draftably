/** Emits from the runtime's one list of events: a new event adds no lines here. */
import { HOST_EVENTS, type HostEventName, type HostEvents } from '@draftably/runtime/host';

export type { HostEventName, HostEvents };

/** `@camera`, `@select`, … : each receives the event's `detail`. */
export type HostEmits = { [K in HostEventName]: (detail: HostEvents[K]) => true };

export const hostEmits = Object.fromEntries(
  HOST_EVENTS.map(name => [name, null]),
) as unknown as HostEmits;

/** Re-emit every host event from `node`. */
export function listenHostEvents(
  node: HTMLElement,
  emit: (name: HostEventName, detail: unknown) => void,
) {
  for (const name of HOST_EVENTS)
    node.addEventListener(`draft-${name}`, event => emit(name, (event as CustomEvent).detail));
}
