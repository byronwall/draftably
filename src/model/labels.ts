import { rectUnion } from './geometry';
import type { Diagram, LabelMode, Rect } from './types';
import { styleOf } from './graph';

export const LABEL_FONT = 'Inter, Segoe UI, Arial, sans-serif';
export const LABEL_SIZE = 13;
export const LABEL_WEIGHT = 550;
export const LINE_HEIGHT = 16;

let context: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();

/** Rendered width of a label, with a rough fallback outside the browser. */
export function textWidth(text: string, size = LABEL_SIZE, weight = LABEL_WEIGHT) {
  const key = `${size}|${weight}|${text}`;
  let width = widths.get(key);
  if (width === undefined) {
    if (context === undefined)
      context =
        typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    if (context) {
      context.font = `${weight} ${size}px ${LABEL_FONT}`;
      width = context.measureText(text).width;
    } else width = text.length * size * 0.55;
    if (widths.size > 5000) widths.clear();
    widths.set(key, width);
  }
  return width;
}

/** Break text into lines no wider than `width`, splitting long words by character. */
export function wrapText(text: string, width: number, size = LABEL_SIZE): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (textWidth(word, size) > width) {
        if (line) lines.push(line);
        let part = '';
        for (const char of word) {
          if (part && textWidth(part + char, size) > width) {
            lines.push(part);
            part = '';
          }
          part += char;
        }
        line = part;
        continue;
      }
      if (line && textWidth(line + ' ' + word, size) > width) {
        lines.push(line);
        line = word;
      } else line += (line ? ' ' : '') + word;
    }
    lines.push(line);
  }
  return lines.length ? lines : [''];
}

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
  let x = r.w / 2,
    y = r.h / 2,
    width = cfg.width || Math.max(60, r.w - 24);
  if (mode === 'center' && style.icon && ['box', 'pill'].includes(style.shape)) {
    x += 14;
    width = Math.max(55, r.w - 65);
  }
  if (style.shape === 'diamond' && mode === 'center') width = Math.max(50, r.w * 0.64);
  if (mode !== 'center') width = cfg.width || Math.max(142, r.w);
  const lines = wrapText(title, width),
    height = lines.length * LINE_HEIGHT;
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
    lineHeight: LINE_HEIGHT,
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

/** Approximate box for a connection label; text is short so a width estimate is enough. */
export function edgeLabelSize(label: string) {
  return { w: Math.min(280, Math.max(36, label.length * 5.9 + 16)), h: 21 };
}
