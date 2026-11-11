/**
 * Which scheme a host's page asks for, and when that changes. The element's computed
 * `color-scheme` decides (a page sets it on `:root`, a dark class, or the element itself); where
 * it names both schemes or none, the user's `prefers-color-scheme` decides. A host forces light
 * with `draft-diagram { color-scheme: light }`.
 */
const DARK = /\bdark\b/,
  LIGHT = /\blight\b/;

/**
 * Calls `onChange(dark)` now and whenever the scheme in `host` changes: an element, or a shadow
 * root, whose children inherit the element's scheme. A hidden probe in `host` has a `light-dark()` color, so a scheme change anywhere above it (a class flip on the
 * page, a style) starts a transition there; the media query covers a change of system setting.
 * Returns a function that stops watching and removes the probe.
 */
export function watchColorScheme(
  host: Element | ShadowRoot,
  onChange: (dark: boolean) => void,
): () => void {
  const doc = host.ownerDocument,
    win = doc.defaultView;
  const media = win?.matchMedia?.('(prefers-color-scheme: dark)');
  const probe = doc.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;' +
    'color:light-dark(rgb(0,0,0),rgb(255,255,255));transition:color 1ms';
  host.append(probe);
  let last: boolean | undefined;
  const check = () => {
    const scheme = win?.getComputedStyle(probe).colorScheme ?? '',
      dark = DARK.test(scheme) !== LIGHT.test(scheme) ? DARK.test(scheme) : !!media?.matches;
    if (dark === last) return;
    last = dark;
    onChange(dark);
  };
  probe.addEventListener('transitionrun', check);
  media?.addEventListener?.('change', check);
  check();
  return () => {
    media?.removeEventListener?.('change', check);
    probe.remove();
  };
}
