import { resolveAppearance, type ResolvedAppearance } from './appearance';
import { measureText, wrapLines } from './fonts';
import { rectUnion } from './geometry';
import type { Diagram, LabelMode, Rect, ShapeKind } from './types';
import { styleOf } from './graph';

/**
 * Room for a shape's title. Every size, wrap and overflow decision goes through these functions,
 * in the compiler, the canvas and the CLI alike.
 */
export interface TitleArea {
  /** Line width available to the title. */
  width: number;
  /** Tallest text block that fits inside the shape at its current height. */
  maxHeight: number;
}

export function titleArea(
  shape: ShapeKind,
  w: number,
  h: number,
  r: ResolvedAppearance,
  icon = false,
): TitleArea {
  // A diamond's text block sits in its middle: at 45% of its height the outline is 55% wide.
  if (shape === 'diamond') return { width: Math.max(40, w * 0.55), maxHeight: h * 0.45 };
  // An ellipse is 71% wide at 70% of its height.
  if (shape === 'circle') return { width: Math.max(40, w * 0.7), maxHeight: h * 0.7 };
  const padY = shape === 'text' ? Math.min(r.paddingY, 11) : r.paddingY;
  return {
    width: Math.max(40, w - 2 * r.paddingX - (icon ? 30 : 0) - (shape === 'pill' ? 8 : 0)),
    maxHeight: h - 2 * padY,
  };
}

/** Height a shape needs for `lines` title lines; never less than `base`. */
export function titleHeight(shape: ShapeKind, lines: number, base: number, r: ResolvedAppearance) {
  const text = lines * r.title.lineHeight;
  if (shape === 'diamond') return Math.max(base, Math.ceil(text / 0.45));
  if (shape === 'circle') return Math.max(base, Math.ceil(text / 0.7));
  if (shape === 'text') return text + 2 * Math.min(r.paddingY, 11);
  return text + 2 * r.paddingY;
}

export const wrapTitle = (text: string, width: number, r: ResolvedAppearance) =>
  wrapLines(text, width, r.title);

export interface NodeLabel {
  /** Center of the label, relative to the shape's top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  mode: LabelMode;
  lineHeight: number;
  leader: boolean;
}

/** Where a shape's title is drawn, relative to the shape. */
export function nodeLabel(doc: Diagram, id: string, title: string, r: Rect): NodeLabel {
  const style = styleOf(doc, id),
    cfg = doc.layout.labels[id] || {};
  const mode: LabelMode =
    cfg.mode ||
    (style.shape === 'icon' || style.shape === 'image' || (style.shape === 'circle' && style.icon)
      ? 'bottom'
      : 'center');
  const look = resolveAppearance(doc.appearance),
    lineHeight = look.title.lineHeight;
  const iconInside = mode === 'center' && !!style.icon && ['box', 'pill'].includes(style.shape);
  let x = r.w / 2 + (iconInside ? 15 : 0),
    y = r.h / 2,
    width = cfg.width || titleArea(style.shape, r.w, r.h, look, iconInside).width;
  if (mode !== 'center') width = cfg.width || Math.max(142, r.w);
  const lines = wrapTitle(title, width, look),
    height = lines.length * lineHeight;
  if (mode === 'top') y = -16 - height / 2;
  if (mode === 'bottom') y = r.h + 15 + height / 2;
  if (mode === 'left') x = -20 - width / 2;
  if (mode === 'right') x = r.w + 20 + width / 2;
  if (mode === 'detached') {
    x = r.w / 2 + (cfg.dx ?? 130);
    y = r.h / 2 + (cfg.dy ?? -65);
  } else {
    x += cfg.dx || 0;
    y += cfg.dy || 0;
  }
  return {
    x,
    y,
    width,
    height,
    lines,
    mode,
    lineHeight,
    leader: cfg.leader ?? mode === 'detached',
  };
}

/** Bounds of a shape together with its label. */
export function visualBounds(doc: Diagram, id: string, title: string, r: Rect): Rect {
  const l = nodeLabel(doc, id, title, r);
  return rectUnion([
    r,
    { x: r.x + l.x - l.width / 2, y: r.y + l.y - l.height / 2, w: l.width, h: l.height },
  ]);
}

/** Box for a connection label in the diagram's annotation type. */
export function edgeLabelSize(label: string, r: ResolvedAppearance = resolveAppearance()) {
  const w = measureText(label, r.annotation) + 16;
  return {
    w: Math.round(Math.min(280, Math.max(36, w))),
    h: Math.round(r.annotation.lineHeight + 6),
  };
}
