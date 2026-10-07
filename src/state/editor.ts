/**
 * Interaction state that is never saved: the active tool, temporary geometry, drag feedback,
 * and the canvas camera helpers.
 */
import { createRoot, createSignal } from 'solid-js';
import { clamp, rectUnion } from '../model/geometry';
import { findNode, objectRect } from '../model/graph';
import type { NodeGeometry, Point, PortSide, Rect } from '../model/types';
import { doc, selectedIds, setCamera } from './document';
import { geometry, sceneBounds } from './scene';

export type Tool =
  'select' | 'pan' | 'box' | 'diamond' | 'circle' | 'text' | 'container' | 'connect' | 'brush';

export const DRAW_TOOLS = ['box', 'diamond', 'circle', 'text', 'container'] as const;
export type DrawTool = (typeof DRAW_TOOLS)[number];
export const isDrawTool = (tool: Tool): tool is DrawTool =>
  (DRAW_TOOLS as readonly string[]).includes(tool);

export interface Guide {
  axis: 'x' | 'y';
  value: number;
  from: number;
  to: number;
}

/** Visual feedback for the gesture in progress. */
export interface DragFeedback {
  kind: string;
  marquee?: Rect;
  draw?: Rect;
  guides?: Guide[];
  dropTargetId?: string | null;
  resizingContainer?: boolean;
}

const state = createRoot(() => {
  const [tool, setTool] = createSignal<Tool>('select');
  const [connectFrom, setConnectFrom] = createSignal<{ id: string; side: PortSide } | null>(null);
  const [pointer, setPointer] = createSignal<Point | null>(null);
  const [drag, setDrag] = createSignal<DragFeedback | null>(null);
  const [inlineEditId, setInlineEditId] = createSignal<string | null>(null);
  const [spaceHeld, setSpaceHeld] = createSignal(false);
  const [stageSize, setStageSize] = createSignal({ width: 1, height: 1 });
  const [reducedMotion, setReducedMotion] = createSignal(
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return {
    tool,
    setTool,
    connectFrom,
    setConnectFrom,
    pointer,
    setPointer,
    drag,
    setDrag,
    inlineEditId,
    setInlineEditId,
    spaceHeld,
    setSpaceHeld,
    stageSize,
    setStageSize,
    reducedMotion,
    setReducedMotion,
  };
});

export const {
  tool,
  setTool: setToolSignal,
  connectFrom,
  setConnectFrom,
  pointer,
  setPointer,
  drag,
  setDrag,
  inlineEditId,
  setInlineEditId,
  spaceHeld,
  setSpaceHeld,
  stageSize,
  setStageSize,
  reducedMotion,
  setReducedMotion,
} = state;

// --- Canvas element and coordinates -----------------------------------------------------------

let canvas: SVGSVGElement | undefined;
export const registerCanvas = (el: SVGSVGElement) => (canvas = el);
export const canvasElement = () => canvas;
export const focusCanvas = () => canvas?.focus({ preventScroll: true });

const canvasRect = () => canvas?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1);

export function screenToWorld(clientX: number, clientY: number): Point {
  const r = canvasRect(),
    c = doc.camera;
  return { x: (clientX - r.left - c.x) / c.k, y: (clientY - r.top - c.y) / c.k };
}

/** World coordinates of the middle of the visible canvas. */
export function canvasCenter(): Point {
  const r = canvasRect();
  return screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
}

export const MIN_ZOOM = 0.08;
export const MAX_ZOOM = 4;

/** Zoom by `factor` around a screen point. */
export function zoomAt(factor: number, clientX?: number, clientY?: number) {
  const bounds = canvasRect(),
    x = (clientX ?? bounds.left + bounds.width / 2) - bounds.left,
    y = (clientY ?? bounds.top + bounds.height / 2) - bounds.top,
    c = doc.camera,
    world = { x: (x - c.x) / c.k, y: (y - c.y) / c.k },
    k = clamp(c.k * factor, MIN_ZOOM, MAX_ZOOM);
  setCamera({ x: x - world.x * k, y: y - world.y * k, k });
}

export function panBy(dx: number, dy: number) {
  const c = doc.camera;
  setCamera({ ...c, x: c.x + dx, y: c.y + dy });
}

/** Fit the whole diagram in view, leaving room for the zoom controls. */
export function fitView() {
  const { width: w, height: h } = stageSize();
  if (!doc.graph.nodes.length && !doc.graph.groups.length) return;
  const b = sceneBounds(),
    pad = 40,
    bottom = 60,
    k = clamp(
      Math.min((w - pad * 2) / Math.max(1, b.w), (h - pad - bottom) / Math.max(1, b.h)),
      MIN_ZOOM,
      1.2,
    );
  setCamera({ x: (w - b.w * k) / 2 - b.x * k, y: (h - bottom + pad - b.h * k) / 2 - b.y * k, k });
}

/** Fit an arbitrary set of rectangles, e.g. every frame of a timeline. */
export function fitRects(rects: Rect[], reservedBottom = 0) {
  const b = rectUnion(rects, 40),
    { width: w } = stageSize(),
    h = stageSize().height - reservedBottom,
    k = clamp(Math.min(w / b.w, h / b.h), MIN_ZOOM, 1.2);
  setCamera({ x: (w - b.w * k) / 2 - b.x * k, y: (h - b.h * k) / 2 - b.y * k, k });
}

/** Pan just enough to bring an object fully into view. */
export function revealObject(id: string) {
  const r = objectRect(doc, geometry, id),
    c = { ...doc.camera },
    { width: w, height: h } = stageSize(),
    pad = 42;
  if (r.x * c.k + c.x < pad) c.x = pad - r.x * c.k;
  if ((r.x + r.w) * c.k + c.x > w - pad) c.x = w - pad - (r.x + r.w) * c.k;
  if (r.y * c.k + c.y < pad) c.y = pad - r.y * c.k;
  if ((r.y + r.h) * c.k + c.y > h - pad) c.y = h - pad - (r.y + r.h) * c.k;
  setCamera(c);
}

/** Center the selected objects without changing the zoom. */
export function centerSelection() {
  const rects = selectedIds()
    .filter(id => findNode(doc, id) || doc.layout.nodes[id])
    .map(id => objectRect(doc, geometry, id));
  if (!rects.length) return;
  const b = rectUnion(rects),
    c = doc.camera,
    { width: w, height: h } = stageSize();
  setCamera({ ...c, x: w / 2 - (b.x + b.w / 2) * c.k, y: h / 2 - (b.y + b.h / 2) * c.k });
}

export type { NodeGeometry };
