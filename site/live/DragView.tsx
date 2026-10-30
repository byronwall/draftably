import { createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js';
import type { Scene } from '../../src/dsl/compile';
import { paperOf } from '../draw';
import { subtree } from './move';

type Box = { x: number; y: number; w: number; h: number };

const boxOf = (svg: SVGSVGElement): Box => {
  const [x, y, w, h] = (svg.getAttribute('viewBox') ?? '0 0 0 0').split(/\s+/).map(Number);
  return { x, y, w, h };
};
const contains = (a: Box, b: Box) =>
  b.x >= a.x - 0.5 &&
  b.y >= a.y - 0.5 &&
  b.x + b.w <= a.x + a.w + 0.5 &&
  b.y + b.h <= a.y + a.h + 0.5;
const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

interface Drag {
  id: string;
  ids: string[];
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  /** The move the drawing on screen was laid out for. */
  shown: { dx: number; dy: number };
  moved: boolean;
  busy: boolean;
}

/**
 * A drawing whose boxes drag. During a drag the object follows the pointer while the file is
 * re-laid out behind it, so its lines re-route as it moves; on release `drop` writes the move into
 * the source. The view holds still through a drag and only widens when the drawing outgrows it.
 */
export function DragView(props: {
  svg: string;
  scene: Scene | undefined;
  stale: boolean;
  fitKey: string;
  /** The object to label "Drag me" until the first drag. */
  hint?: string;
  preview: (id: string, dx: number, dy: number) => Promise<string | null>;
  /** False when the file could not take the move. */
  drop: (id: string, dx: number, dy: number) => Promise<boolean>;
}) {
  let frame!: HTMLDivElement;
  let host!: HTMLDivElement;
  let view: Box | undefined;
  let drag: Drag | undefined;
  const [hintAt, setHintAt] = createSignal<{ x: number; y: number }>();
  const [used, setUsed] = createSignal(false);
  const [dragging, setDragging] = createSignal(false);

  const svgEl = () => host.querySelector('svg');
  const objectEl = (id: string) => host.querySelector(`[data-id="${CSS.escape(id)}"]`);

  const placeHint = () => {
    const el = props.hint && !used() ? objectEl(props.hint) : null;
    if (!el) return setHintAt(undefined);
    const r = el.getBoundingClientRect(),
      f = frame.getBoundingClientRect();
    const x = r.left + r.width / 2 - f.left;
    setHintAt({ x: Math.min(Math.max(x, 48), f.width - 48), y: r.top - f.top });
  };

  /** The part of the drawing the frame shows now, in drawing units, out to its edges. */
  const visible = (): Box | undefined => {
    const m = svgEl()?.getScreenCTM()?.inverse();
    if (!m) return;
    const f = frame.getBoundingClientRect(),
      a = new DOMPoint(f.left, f.top).matrixTransform(m),
      b = new DOMPoint(f.right, f.bottom).matrixTransform(m);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };

  /**
   * Show `svg`. `refit` frames the whole drawing. Otherwise the scale holds, so nothing jumps
   * under the pointer, until the drawing would leave the frame; then the view widens to take it.
   */
  const mount = (svg: string, refit = false) => {
    const shown = visible();
    // The SVG comes from our own renderer, which escapes every label.
    host.innerHTML = svg;
    const el = svgEl();
    if (!el) return;
    const box = boxOf(el);
    if (refit || !view) view = box;
    else if (!drag && !(shown && contains(shown, box))) view = union(view, box);
    el.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    el.setAttribute('width', '100%');
    el.setAttribute('height', '100%');
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    host.querySelectorAll('[data-id]').forEach(g => {
      if (props.scene?.byId.has(g.getAttribute('data-id')!)) g.classList.add('is-drag');
    });
    placeHint();
  };

  let refit = true;
  createEffect(
    on(
      () => props.fitKey,
      () => (refit = true),
    ),
  );
  createEffect(
    on(
      () => props.svg,
      svg => {
        if (!svg || drag) return;
        mount(svg, refit);
        refit = false;
      },
    ),
  );

  onMount(() => {
    const observer = new ResizeObserver(placeHint);
    observer.observe(frame);
    onCleanup(() => observer.disconnect());
  });

  const toWorld = (e: PointerEvent) => {
    const m = svgEl()?.getScreenCTM();
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : null;
  };

  /** Move the dragged objects by whatever the pointer has moved since the drawing on screen. */
  const follow = () => {
    if (!drag) return;
    const rx = drag.dx - drag.shown.dx,
      ry = drag.dy - drag.shown.dy;
    for (const id of drag.ids) objectEl(id)?.setAttribute('transform', `translate(${rx} ${ry})`);
    objectEl(drag.id)?.classList.add('is-lifted');
  };

  /** Lay the file out for the latest pointer position; one at a time, newest wins. */
  const pump = () => {
    const d = drag;
    if (!d || d.busy) return;
    d.busy = true;
    const { dx, dy } = d;
    void props.preview(d.id, dx, dy).then(svg => {
      d.busy = false;
      if (drag !== d) return;
      if (svg) {
        mount(svg);
        d.shown = { dx, dy };
        follow();
      }
      if (d.dx !== dx || d.dy !== dy) pump();
    });
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !props.scene || props.stale) return;
    const id = (e.target as Element).closest('.is-drag')?.getAttribute('data-id');
    const at = toWorld(e);
    if (!id || !at) return;
    e.preventDefault();
    drag = {
      id,
      ids: subtree(props.scene, id),
      x0: at.x,
      y0: at.y,
      dx: 0,
      dy: 0,
      shown: { dx: 0, dy: 0 },
      moved: false,
      busy: false,
    };
    frame.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const at = toWorld(e);
    if (!at) return;
    drag.dx = at.x - drag.x0;
    drag.dy = at.y - drag.y0;
    if (!drag.moved && Math.hypot(drag.dx, drag.dy) < 3) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
      setUsed(true);
      setHintAt(undefined);
    }
    follow();
    pump();
  };
  const onUp = async () => {
    const d = drag;
    drag = undefined;
    setDragging(false);
    if (!d) return;
    if (!d.moved || !(await props.drop(d.id, d.dx, d.dy))) mount(props.svg);
  };

  return (
    <div
      class="drag-view"
      classList={{ 'is-stale': props.stale, 'is-dragging': dragging() }}
      style={{ background: paperOf(props.svg) }}
      ref={frame}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => void onUp()}
      onPointerCancel={() => void onUp()}
      onDblClick={e => {
        if (!(e.target as Element).closest('.is-drag')) mount(props.svg, true);
      }}
    >
      <div class="drag-host" ref={host} />
      <Show when={hintAt()}>
        {at => (
          <span class="drag-hint" style={{ left: `${at().x}px`, top: `${at().y}px` }}>
            Drag me
          </span>
        )}
      </Show>
    </div>
  );
}
