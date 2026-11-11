// Event props from the runtime's one list of events: a new event adds no lines here.
import { HOST_EVENTS } from '@draftably/runtime/host';

/**
 * Listen for every host event on `node`; each call reads the latest `oncamera`, `onselect`, …
 * prop from `props`.
 * @param {HTMLElement} node
 * @param {Record<string, unknown>} props
 */
export function listenHostEvents(node, props) {
  const off = HOST_EVENTS.map(name => {
    /** @param {Event} event */
    const listen = event => {
      const handler = props[`on${name}`];
      if (typeof handler === 'function') handler(/** @type {CustomEvent} */ (event).detail);
    };
    node.addEventListener(`draft-${name}`, listen);
    return () => node.removeEventListener(`draft-${name}`, listen);
  });
  return () => off.forEach(f => f());
}
