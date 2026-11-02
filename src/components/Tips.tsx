import { createSignal, onCleanup, onMount, Show } from 'solid-js';

interface Tip {
  label: string;
  keys?: string;
  hint?: string;
  anchor: DOMRect;
}

const FIRST_DELAY = 280;
/** Once one tip has shown, moving along the toolbar shows the next at once. */
const WARM_FOR = 500;

/**
 * The one tooltip. Anything with `data-tip` shows its name, shortcut and what it does, on hover or
 * keyboard focus. It sits above everything and never moves the layout.
 */
export function Tips() {
  const [tip, setTip] = createSignal<Tip | null>(null);
  let el: HTMLDivElement | undefined;
  let timer = 0;
  let current: HTMLElement | null = null;
  let warmUntil = 0;

  const show = (target: HTMLElement) => {
    clearTimeout(timer);
    current = target;
    const open = () => {
      const { tip: label, tipKeys: keys, tipHint: hint } = target.dataset;
      if (target.isConnected && label)
        setTip({ label, keys, hint, anchor: target.getBoundingClientRect() });
    };
    if (Date.now() < warmUntil) open();
    else timer = window.setTimeout(open, FIRST_DELAY);
  };
  const hide = () => {
    clearTimeout(timer);
    current = null;
    if (tip()) warmUntil = Date.now() + WARM_FOR;
    setTip(null);
  };

  const onOver = (e: Event) => {
    const target = (e.target as Element).closest?.<HTMLElement>('[data-tip]') ?? null;
    if (target === current) return;
    if (target) show(target);
    else hide();
  };
  const onFocus = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.matches?.('[data-tip]:focus-visible')) show(target);
  };
  // A press means the tip has done its job; the menu or dialog it opens needs the room.
  const onPress = () => {
    hide();
    warmUntil = 0;
  };

  onMount(() => {
    document.addEventListener('pointerover', onOver);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('keydown', onPress, true);
    onCleanup(() => {
      clearTimeout(timer);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('keydown', onPress, true);
    });
  });

  /** Under the control, or over it near the bottom edge, and always inside the window. */
  const place = (node: HTMLDivElement, anchor: DOMRect) => {
    const { offsetWidth: width, offsetHeight: height } = node;
    const below = anchor.bottom + 6;
    const top = below + height > innerHeight - 8 ? anchor.top - height - 6 : below;
    const left = anchor.left + anchor.width / 2 - width / 2;
    node.style.left = `${Math.max(8, Math.min(left, innerWidth - width - 8))}px`;
    node.style.top = `${top}px`;
  };

  return (
    <Show when={tip()} keyed>
      {shown => (
        <div
          ref={node => {
            el = node;
            queueMicrotask(() => el && place(el, shown.anchor));
          }}
          class="tip"
          role="tooltip"
        >
          <div class="tip-head">
            <strong>{shown.label}</strong>
            <Show when={shown.keys}>
              <kbd>{shown.keys}</kbd>
            </Show>
          </div>
          <Show when={shown.hint}>
            <p>{shown.hint}</p>
          </Show>
        </div>
      )}
    </Show>
  );
}
