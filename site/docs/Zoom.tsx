import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { paperOf } from '../draw';

const PAN_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [60, 0],
  ArrowRight: [-60, 0],
  ArrowUp: [0, 60],
  ArrowDown: [0, -60],
};

/**
 * A drawing over the whole window: it opens fitted, the wheel or + and - zoom, a drag or the arrow
 * keys pan, and Escape or the close button leaves. It is a modal dialog: focus moves to Close, Tab
 * stays on its buttons, and focus goes back to the opener when it closes. `error` says the drawing
 * is the last good one, while the source has that error.
 */
export function Zoom(props: { svg: string; error?: string; onClose: () => void }) {
  const [view, setView] = createSignal({ x: 0, y: 0, k: 1 });
  let stage!: HTMLDivElement;
  let paper!: HTMLDivElement;
  let dialog!: HTMLDivElement;
  let close!: HTMLButtonElement;

  const fit = () => {
    const svg = paper.querySelector('svg');
    if (!svg) return;
    const w = Number(svg.getAttribute('width'));
    const h = Number(svg.getAttribute('height'));
    const box = stage.getBoundingClientRect();
    const k = Math.min((box.width - 64) / w, (box.height - 64) / h, 3);
    setView({ x: (box.width - w * k) / 2, y: (box.height - h * k) / 2, k });
  };

  const zoomAt = (px: number, py: number, by: number) => {
    const v = view();
    const k = Math.min(8, Math.max(0.1, v.k * by));
    setView({ x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k, k });
  };

  const zoomKey = (by: number) => {
    const box = stage.getBoundingClientRect();
    zoomAt(box.width / 2, box.height / 2, by);
  };

  onMount(() => {
    fit();
    const opener = document.activeElement as HTMLElement | null;
    close.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
      else if (e.key === '0') fit();
      else if (e.key === '+' || e.key === '=') zoomKey(1.25);
      else if (e.key === '-') zoomKey(0.8);
      else if (PAN_KEYS[e.key]) {
        const [dx, dy] = PAN_KEYS[e.key];
        setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      } else if (e.key === 'Tab') {
        const buttons = [...dialog.querySelectorAll('button')];
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const step = e.shiftKey ? -1 : 1;
        buttons[(i + step + buttons.length) % buttons.length]?.focus();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', key, true);
    document.body.style.overflow = 'hidden';
    onCleanup(() => {
      window.removeEventListener('keydown', key, true);
      document.body.style.overflow = '';
      opener?.focus();
    });
  });

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const box = stage.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    zoomAt(px, py, Math.exp(-e.deltaY * 0.0015));
  };

  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const initial = { cx: e.clientX, cy: e.clientY, ...view() };
    const move = (m: PointerEvent) =>
      setView({
        k: initial.k,
        x: initial.x + m.clientX - initial.cx,
        y: initial.y + m.clientY - initial.cy,
      });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <Portal>
      <div
        ref={dialog}
        class="zoom"
        role="dialog"
        aria-modal="true"
        aria-label="Expanded drawing"
        style={{ background: paperOf(props.svg) ?? '#fbfbfd' }}
      >
        <div class="zoom-bar">
          <span>Scroll or + − to zoom · drag or arrows to pan · 0 to fit · Esc to close</span>
          <button type="button" onClick={fit}>
            Fit
          </button>
          <button ref={close} type="button" onClick={() => props.onClose()}>
            Close
          </button>
        </div>
        <Show when={props.error}>
          <p class="zoom-notice" role="status">
            Last valid drawing. The source has an error: {props.error}
          </p>
        </Show>
        <div class="zoom-stage" ref={stage} onWheel={wheel} onPointerDown={down}>
          <div
            ref={paper}
            class="zoom-paper"
            style={{
              transform: `translate(${view().x}px, ${view().y}px) scale(${view().k})`,
            }}
            // The SVG comes from our own renderer, which escapes every label.
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={props.svg}
          />
        </div>
      </div>
    </Portal>
  );
}
