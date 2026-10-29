import { createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import { paperOf } from '../draw';

/**
 * A drawing over the whole window: it opens fitted, the wheel zooms about the cursor, a drag
 * pans, and Escape or the close button leaves.
 */
export function Zoom(props: { svg: string; onClose: () => void }) {
  const [view, setView] = createSignal({ x: 0, y: 0, k: 1 });
  let stage!: HTMLDivElement;
  let paper!: HTMLDivElement;

  const fit = () => {
    const svg = paper.querySelector('svg');
    if (!svg) return;
    const w = Number(svg.getAttribute('width'));
    const h = Number(svg.getAttribute('height'));
    const box = stage.getBoundingClientRect();
    const k = Math.min((box.width - 64) / w, (box.height - 64) / h, 3);
    setView({ x: (box.width - w * k) / 2, y: (box.height - h * k) / 2, k });
  };

  onMount(() => {
    fit();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
      else if (e.key === '0') fit();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', key, true);
    document.body.style.overflow = 'hidden';
    onCleanup(() => {
      window.removeEventListener('keydown', key, true);
      document.body.style.overflow = '';
    });
  });

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const box = stage.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    const v = view();
    const k = Math.min(8, Math.max(0.1, v.k * Math.exp(-e.deltaY * 0.0015)));
    setView({ x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k, k });
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
      <div class="zoom" style={{ background: paperOf(props.svg) ?? '#fbfbfd' }}>
        <div class="zoom-bar">
          <span>Scroll to zoom · drag to pan · 0 to fit · Esc to close</span>
          <button type="button" onClick={fit}>
            Fit
          </button>
          <button type="button" onClick={() => props.onClose()}>
            Close
          </button>
        </div>
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
