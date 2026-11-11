/** Helpers both custom elements share. No side effects. */
import { CANCELABLE_EVENTS, type HostEvents } from './host';
import { runtimeVersion } from './version';

/** Structural equality for option values. Functions are read live, so any two are equal. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'function' && typeof b === 'function') return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter(k => (a as Record<string, unknown>)[k] !== undefined),
    kb = Object.keys(b).filter(k => (b as Record<string, unknown>)[k] !== undefined);
  return (
    ka.length === kb.length &&
    ka.every(k => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

/** Take a property a framework set before the element class was defined. */
export function takeEarly<T>(el: HTMLElement, key: string): T | undefined {
  if (!Object.hasOwn(el, key)) return undefined;
  const value = (el as unknown as Record<string, T>)[key];
  delete (el as unknown as Record<string, T>)[key];
  return value;
}

/** Warn once when another copy of the runtime already defined `name`. */
export function warnOtherCopy(name: string) {
  const other = (customElements.get(name) as { runtimeVersion?: string } | undefined)
    ?.runtimeVersion;
  if (other !== runtimeVersion)
    console.warn(
      `<${name}> is already defined by @draftably runtime ${other ?? 'unknown'}; this copy (${runtimeVersion}) is not used. Install one copy of the runtime.`,
    );
}

/** Re-dispatch a handle event on the element. Returns false when the host prevented it. */
export function redispatch<K extends keyof HostEvents>(
  el: HTMLElement,
  type: K,
  detail: HostEvents[K],
) {
  return el.dispatchEvent(
    new CustomEvent(`draft-${type}`, {
      detail,
      bubbles: true,
      cancelable: CANCELABLE_EVENTS.includes(type),
    }),
  );
}
