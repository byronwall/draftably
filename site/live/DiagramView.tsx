import { createEffect, createSignal, on, onCleanup, onMount, untrack } from 'solid-js';
import type { Scene } from '../../src/dsl/compile';
import { paperOf } from '../draw';
import { subtree } from './move';

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN = 0.1;
const MAX = 6;
const clamp = (k: number) => Math.min(MAX, Math.max(MIN, k));
/** The top left corner of an SVG's viewBox, in drawing units. */
const originOf = (svg: Element | null) => {
  const [x, y] = (svg?.getAttribute('viewBox') ?? '0 0').split(/\s+/).map(Number);
  return { x, y };
};

/** A box being dragged: where it started, how far it has moved, and what is drawn for it. */
interface Move {
  id: string;
  ids: string[];
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** The move the drawing on screen was laid out for. */
  shown: { dx: number; dy: number };
  moved: boolean;
  busy: boolean;
}

/**
 * A drawing that pans with a drag and zooms around the cursor with the wheel. It fits itself when
 * `fitKey` changes (a new example), and keeps its view while the same diagram is edited, so the
 * picture holds still as you type. Hovering or clicking an object reports its `data-id`.
 * With `drop`, dragging a box moves it: the file is laid out again as it moves, so lines re-route,
 * and the release is written into the source. Dragging empty canvas pans.
 */
export function DiagramView(props: {
  svg: string;
  stale: boolean;
  fitKey: string;
  linkedIds: string[];
  onHover: (id: string | null) => void;
  /** An object's id, or null for a click on empty canvas. */
  onPick: (id: string | null) => void;
  /** The scene `svg` was drawn from; its objects are the ones that drag. */
  scene?: Scene;
  preview?: (id: string, dx: number, dy: number) => Promise<string | null>;
  /** False when the file could not take the move. */
  drop?: (id: string, dx: number, dy: number) => Promise<boolean>;
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
  // An edit that grows the drawing up or left moves its viewBox corner; shift the view by as much,
  // so everything that did not move stays put on screen.
  let origin: { x: number; y: number } | undefined;
  createEffect(
    on(
      () => props.svg,
      svg => {
        if (!svg) return;
        const o = originOf(stage.querySelector('svg'));
        if (fitFrom != null && svg !== fitFrom) {
          fitFrom = null;
          queueMicrotask(fit);
        } else if (origin && (o.x !== origin.x || o.y !== origin.y)) {
          const was = origin;
          setView(v => ({ ...v, x: v.x + (o.x - was.x) * v.k, y: v.y + (o.y - was.y) * v.k }));
        }
        origin = o;
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

  const objectEl = (id: string) => stage.querySelector(`[data-id="${CSS.escape(id)}"]`);

  /**
   * Show a drawing laid out mid-drag. Its viewBox keeps the drag's starting corner, so the screen
   * mapping holds even when the drawing grows up or left; what lies past the corner still shows.
   */
  const mountPreview = (svg: string) => {
    // The SVG comes from our own renderer, which escapes every label.
    stage.innerHTML = svg;
    const el = stage.querySelector('svg');
    if (!el || !origin) return;
    const [x, y, w, h] = el.getAttribute('viewBox')!.split(/\s+/).map(Number);
    const vw = Math.max(1, x + w - origin.x),
      vh = Math.max(1, y + h - origin.y);
    el.setAttribute('viewBox', `${origin.x} ${origin.y} ${vw} ${vh}`);
    el.setAttribute('width', String(vw));
    el.setAttribute('height', String(vh));
    el.style.overflow = 'visible';
  };

  /** Move the dragged objects by whatever the pointer has moved since the drawing on screen. */
  const follow = (m: Move) => {
    const rx = m.dx - m.shown.dx,
      ry = m.dy - m.shown.dy;
    for (const id of m.ids) objectEl(id)?.setAttribute('transform', `translate(${rx} ${ry})`);
    objectEl(m.id)?.classList.add('is-lifted');
  };

  /** Lay the file out for the latest pointer position; one at a time, newest wins. */
  const pump = (m: Move) => {
    if (m.busy || !props.preview) return;
    m.busy = true;
    const { dx, dy } = m;
    void props.preview(m.id, dx, dy).then(svg => {
      m.busy = false;
      if (move !== m) return;
      if (svg) {
        mountPreview(svg);
        m.shown = { dx, dy };
        follow(m);
      }
      if (m.dx !== dx || m.dy !== dy) pump(m);
    });
  };

  // The object under the pointer is read at pointerdown: pointer capture retargets pointerup to
  // the frame, so its target is never the shape.
  let drag:
    { x: number; y: number; vx: number; vy: number; moved: boolean; id: string | null } | undefined;
  let move: Move | undefined;
  const [moving, setMoving] = createSignal(false);
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('.diagram-tools')) return;
    const id = idAt(e.target);
    frame.setPointerCapture(e.pointerId);
    if (id && props.drop && !props.stale && props.scene?.byId.has(id)) {
      e.preventDefault();
      move = {
        id,
        ids: subtree(props.scene, id),
        x: e.clientX,
        y: e.clientY,
        dx: 0,
        dy: 0,
        shown: { dx: 0, dy: 0 },
        moved: false,
        busy: false,
      };
      return;
    }
    const v = view();
    drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, moved: false, id };
  };
  const onMove = (e: PointerEvent) => {
    if (move) {
      const k = view().k;
      move.dx = (e.clientX - move.x) / k;
      move.dy = (e.clientY - move.y) / k;
      if (!move.moved && Math.abs(e.clientX - move.x) + Math.abs(e.clientY - move.y) <= 3) return;
      if (!move.moved) {
        move.moved = true;
        setMoving(true);
        props.onHover(null);
      }
      follow(move);
      pump(move);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.moved) setView(v => ({ ...v, x: drag!.vx + dx, y: drag!.vy + dy }));
      return;
    }
    props.onHover(idAt(e.target));
  };
  const onUp = async () => {
    if (drag && !drag.moved) props.onPick(drag.id);
    drag = undefined;
    const m = move;
    move = undefined;
    setMoving(false);
    if (!m) return;
    if (!m.moved) return props.onPick(m.id);
    // A drop the file refuses shows the last drawing again.
    if (!(await props.drop!(m.id, m.dx, m.dy))) stage.innerHTML = props.svg;
  };
  const idAt = (target: EventTarget | null) =>
    (target as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;

  // Mark linked objects so the stylesheet can lift them and fade the rest, and the ones that drag.
  createEffect(() => {
    const ids = new Set(props.linkedIds);
    void props.svg;
    stage.querySelectorAll('[data-id]').forEach(el => {
      const id = el.getAttribute('data-id')!;
      el.classList.toggle('is-linked', ids.has(id));
      el.classList.toggle('is-drag', !!props.drop && !!props.scene?.byId.has(id));
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
      classList={{ 'is-stale': props.stale, 'is-moving': moving() }}
      style={{ background: paperOf(props.svg) }}
      ref={frame}
      onWheel={onWheel}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => void onUp()}
      onPointerCancel={() => void onUp()}
      onPointerLeave={() => !move && props.onHover(null)}
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
