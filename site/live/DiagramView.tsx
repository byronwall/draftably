import { createEffect, createSignal, on, onCleanup, onMount, untrack } from 'solid-js';
import { paperOf } from '../draw';

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN = 0.1;
const MAX = 6;
const clamp = (k: number) => Math.min(MAX, Math.max(MIN, k));

/**
 * A drawing that pans with a drag and zooms around the cursor with the wheel. It fits itself when
 * `fitKey` changes (a new example), and keeps its view while the same diagram is edited, so the
 * picture holds still as you type. Hovering or clicking an object reports its `data-id`.
 */
export function DiagramView(props: {
  svg: string;
  stale: boolean;
  fitKey: string;
  linkedIds: string[];
  onHover: (id: string | null) => void;
  /** An object's id, or null for a click on empty canvas. */
  onPick: (id: string | null) => void;
}) {
  let frame!: HTMLDivElement;
  let stage!: HTMLDivElement;
  const [view, setView] = createSignal<View>({ x: 0, y: 0, k: 1 });
  const [size, setSize] = createSignal({ w: 0, h: 0 });

  const svgSize = () => {
    const svg = stage.querySelector('svg');
    return {
      w: Number(svg?.getAttribute('width')) || 0,
      h: Number(svg?.getAttribute('height')) || 0,
    };
  };

  const fit = () => {
    const { w, h } = svgSize();
    const box = frame.getBoundingClientRect();
    if (!w || !h || !box.width) return;
    const narrow = box.width < 500;
    const pad = narrow ? 10 : 32;
    // A phone fits to width and lets a tall drawing run below the fold, to keep labels readable.
    const across = (box.width - pad * 2) / w;
    const k = clamp(Math.min(across, narrow ? 2 : (box.height - pad * 2) / h, 2));
    const y = h * k > box.height - pad * 2 ? pad : (box.height - h * k) / 2;
    setView({ k, x: (box.width - w * k) / 2, y });
  };

  const zoomAt = (factor: number, px: number, py: number) =>
    setView(v => {
      const k = clamp(v.k * factor);
      const f = k / v.k;
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  const zoomCenter = (factor: number) => {
    const box = frame.getBoundingClientRect();
    zoomAt(factor, box.width / 2, box.height / 2);
  };

  // A new example fits once its own drawing arrives; an edit to the same one keeps the view.
  // `props.svg` can notify before the new drawing exists (the page's getter also reads the
  // source), so wait for an SVG that differs from the one on screen when the key changed.
  let fitFrom: string | null = null;
  createEffect(
    on(
      () => props.fitKey,
      () => (fitFrom = untrack(() => props.svg)),
    ),
  );
  createEffect(
    on(
      () => props.svg,
      svg => {
        if (!svg || fitFrom == null || svg === fitFrom) return;
        fitFrom = null;
        queueMicrotask(fit);
      },
    ),
  );

  onMount(() => {
    const observer = new ResizeObserver(() => {
      const box = frame.getBoundingClientRect();
      const old = size();
      setSize({ w: box.width, h: box.height });
      // Also fit when a hidden view (a narrow screen's other tab) is shown.
      if (Math.abs(old.w - box.width) > 1 || Math.abs(old.h - box.height) > 1) fit();
    });
    observer.observe(frame);
    onCleanup(() => observer.disconnect());
  });

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const box = frame.getBoundingClientRect();
    zoomAt(
      Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)),
      e.clientX - box.left,
      e.clientY - box.top,
    );
  };

  // The object under the pointer is read at pointerdown: pointer capture retargets pointerup to
  // the frame, so its target is never the shape.
  let drag:
    { x: number; y: number; vx: number; vy: number; moved: boolean; id: string | null } | undefined;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('.diagram-tools')) return;
    const v = view();
    drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, moved: false, id: idAt(e.target) };
    frame.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.moved) setView(v => ({ ...v, x: drag!.vx + dx, y: drag!.vy + dy }));
      return;
    }
    props.onHover(idAt(e.target));
  };
  const onUp = () => {
    if (drag && !drag.moved) props.onPick(drag.id);
    drag = undefined;
  };
  const idAt = (target: EventTarget | null) =>
    (target as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;

  // Mark linked objects so the stylesheet can lift them and fade the rest.
  createEffect(() => {
    const ids = new Set(props.linkedIds);
    void props.svg;
    stage.querySelectorAll('[data-id]').forEach(el => {
      el.classList.toggle('is-linked', ids.has(el.getAttribute('data-id')!));
    });
    frame.classList.toggle('has-linked', ids.size > 0);
  });

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.parentElement?.requestFullscreen();
  };

  return (
    <div
      class="diagram-view"
      classList={{ 'is-stale': props.stale }}
      style={{ background: paperOf(props.svg) }}
      ref={frame}
      onWheel={onWheel}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={() => props.onHover(null)}
      onDblClick={e => {
        if (!idAt(e.target)) fit();
      }}
    >
      <div
        class="diagram-stage"
        ref={stage}
        style={{ transform: `translate(${view().x}px, ${view().y}px) scale(${view().k})` }}
        // The SVG comes from our own renderer, which escapes every label.
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={props.svg}
      />
      <div class="diagram-tools" hidden={!props.svg}>
        <button type="button" aria-label="Zoom out" onClick={() => zoomCenter(1 / 1.25)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 8h8" />
          </svg>
        </button>
        <button
          type="button"
          class="diagram-zoom"
          aria-label="Fit to view"
          title="Fit to view (or double-click the canvas)"
          onClick={fit}
        >
          {Math.round(view().k * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomCenter(1.25)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 8h8M8 4v8" />
          </svg>
        </button>
        <button type="button" aria-label="Full screen" onClick={fullscreen}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
