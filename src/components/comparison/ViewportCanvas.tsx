import { onCleanup, onMount, type JSX } from 'solid-js';
import { wheelZoomFactor } from '../../model/camera';
import {
  chooseAnchor,
  effectiveCamera,
  fitAll,
  fitCell,
  comparison,
  panCamera,
  setCamera,
  setViewport,
  zoomCamera,
} from '../../state/comparison';

/**
 * A pannable, zoomable view of one candidate (or of the overlay, index -1).
 * Clicking a shape without dragging makes it the visual anchor.
 */
export function ViewportCanvas(props: {
  index: number;
  label: string;
  class?: string;
  children: JSX.Element;
}) {
  let svg!: SVGSVGElement;
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: {
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
    target?: string;
    zoom: boolean;
  } | null = null;
  let pinch: { distance: number; camera: { k: number }; world: { x: number; y: number } } | null =
    null;
  let modifier: { x: number; y: number; startY: number } | null = null;

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      setViewport(props.index, {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(svg);
    svg.addEventListener('wheel', onWheel, { passive: false });
    onCleanup(() => {
      observer.disconnect();
      svg.removeEventListener('wheel', onWheel);
    });
  });

  const size = () => comparison.viewports[props.index] ?? { width: 0, height: 0 };
  const transform = () => {
    const cam = effectiveCamera(props.index),
      { width, height } = size();
    return `translate(${width / 2 - cam.cx * cam.k},${height / 2 - cam.cy * cam.k}) scale(${cam.k})`;
  };
  /** Offset of a client point from the viewport center. */
  const fromCenter = (x: number, y: number) => {
    const r = svg.getBoundingClientRect();
    return { dx: x - r.left - r.width / 2, dy: y - r.top - r.height / 2 };
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const unit =
      e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? svg.getBoundingClientRect().height : 1;
    // As on the main canvas: the wheel zooms, Shift + wheel pans.
    if (e.shiftKey) {
      const dx = e.deltaX || 0,
        dy = e.deltaX ? 0 : e.deltaY;
      panCamera(props.index, -dx * unit, -dy * unit);
    } else {
      const { dx, dy } = fromCenter(e.clientX, e.clientY);
      zoomCamera(props.index, wheelZoomFactor(e, unit), dx, dy);
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    svg.focus({ preventScroll: true });
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // Best effort.
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        c = effectiveCamera(props.index),
        mid = fromCenter((a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        camera: { k: c.k },
        world: { x: c.cx + mid.dx / c.k, y: c.cy + mid.dy / c.k },
      };
      drag = null;
      return;
    }
    const target = (e.target as Element).closest(
      '[data-kind="node"],[data-kind="group"]',
    ) as SVGElement | null;
    drag = {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      target: target?.dataset.id,
      zoom: e.metaKey || e.ctrlKey,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()],
        mid = fromCenter((a.x + b.x) / 2, (a.y + b.y) / 2),
        k = (pinch.camera.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.distance;
      setCamera(props.index, { cx: pinch.world.x - mid.dx / k, cy: pinch.world.y - mid.dy / k, k });
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.moved ||= Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 3;
      if (drag.zoom) {
        const c = fromCenter(drag.startX, drag.startY);
        zoomCamera(props.index, Math.exp(-dy * 0.008), c.dx, c.dy);
      } else panCamera(props.index, dx, dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      return;
    }
    // Cmd + moving the mouse zooms, as on the main canvas.
    if (e.metaKey && !e.buttons) {
      if (modifier) {
        const c = fromCenter(modifier.x, modifier.startY);
        zoomCamera(props.index, Math.exp((modifier.y - e.clientY) * 0.008), c.dx, c.dy);
      }
      modifier = {
        x: modifier?.x ?? e.clientX,
        startY: modifier?.startY ?? e.clientY,
        y: e.clientY,
      };
    } else modifier = null;
  };

  const onPointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      drag = null;
      return;
    }
    if (drag && !drag.moved && drag.target) chooseAnchor(drag.target);
    drag = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const chosen = (e.target as Element).closest(
      '[data-kind="node"],[data-kind="group"]',
    ) as SVGElement | null;
    if (chosen && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      chooseAnchor(chosen.dataset.id!);
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      e.stopPropagation();
      const d = e.shiftKey ? 100 : 30;
      panCamera(
        props.index,
        e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0,
        e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0,
      );
    }
    if (['+', '=', '-'].includes(e.key)) {
      e.preventDefault();
      zoomCamera(props.index, e.key === '-' ? 1 / 1.2 : 1.2);
    }
    if (e.key === 'Home') {
      e.preventDefault();
      if (props.index !== -1 && comparison.cameraMode === 'independent') fitCell(props.index);
      else fitAll();
    }
  };

  return (
    <svg
      ref={svg}
      class={`viewport-canvas ${props.class ?? ''}`}
      data-viewport={props.index}
      tabindex="0"
      role="application"
      aria-label={props.label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointers.clear();
        drag = null;
        pinch = null;
      }}
      onKeyDown={onKeyDown}
    >
      <g transform={transform()}>{props.children}</g>
    </svg>
  );
}
