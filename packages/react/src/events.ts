/** Event props from the runtime's one list of events: a new event adds no lines here. */
import { HOST_EVENTS, type HostEventName, type HostEvents } from '@draftably/runtime/host';
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

export type { HostEventName, HostEvents };

/** `onCamera`, `onSelect`, … : each receives the event's `detail`. */
export type HostEventProps = {
  [K in HostEventName as `on${Capitalize<K>}`]?: (detail: HostEvents[K]) => void;
};

const propName = (name: string) => `on${name[0].toUpperCase()}${name.slice(1)}`;

/** Runs before the element's mount microtask on the client, and not at all on the server. */
export const useBeforeMount = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Listen once for every host event; each call reads the latest prop. */
export function useHostEvents(el: RefObject<HTMLElement | null>, props: HostEventProps) {
  const latest = useRef(props);
  latest.current = props;
  useBeforeMount(() => {
    const node = el.current;
    if (!node) return;
    const off = HOST_EVENTS.map(name => {
      const listen = (event: Event) => {
        const handler = (latest.current as Record<string, ((detail: unknown) => void) | undefined>)[
          propName(name)
        ];
        handler?.((event as CustomEvent).detail);
      };
      node.addEventListener(`draft-${name}`, listen);
      return () => node.removeEventListener(`draft-${name}`, listen);
    });
    return () => off.forEach(f => f());
  }, []);
}
