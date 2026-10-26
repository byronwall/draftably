/**
 * Change status: how an object or connection differs between two versions of a diagram, drawn
 * the same way by the canvas, `inspect --svg` and the exports.
 *
 * A file with change marks is a diff, and in a diff color means change and nothing else:
 * unchanged shapes turn neutral, containers become quiet outlines, unchanged lines go grey, and
 * only added (green), changed (amber) and removed (red) objects keep a hue, as a tinted fill with
 * a strong border. Each status also has a border weight, dash, fade or strike, so a diff still
 * reads in grayscale.
 */
import { swatchFor, type LegendEntry, type ResolvedAppearance, type Swatch } from './appearance';
import type { Diagram, DiagramEdge } from './types';

export type Status = 'same' | 'added' | 'removed' | 'changed' | 'context';
export const STATUSES: Status[] = ['same', 'added', 'removed', 'changed', 'context'];

/** Legend order and wording; `same` needs no row. */
export const STATUS_LABELS: Partial<Record<Status, string>> = {
  added: 'Added',
  changed: 'Changed',
  removed: 'Removed',
  context: 'Unchanged, for context',
};

/** The color family each status is drawn in. */
const HUES: Partial<Record<Status, string>> = { added: 'green', changed: 'amber', removed: 'red' };

export interface StatusPaint {
  /** Line color for connections; shapes take theirs from `statusSwatch`. */
  stroke?: string;
  width?: number;
  dash?: string;
  opacity: number;
  /** Strike the title through. */
  strike: boolean;
}

const PLAIN: StatusPaint = { opacity: 1, strike: false };

export function statusPaint(look: ResolvedAppearance, status?: Status): StatusPaint {
  const hue = HUES[status ?? 'same'],
    stroke = hue ? swatchFor(look, hue, look.dark ? 400 : 600).fill : undefined;
  switch (status) {
    case 'added':
    case 'changed':
      return { stroke, width: 2, opacity: 1, strike: false };
    case 'removed':
      return { stroke, width: 2, dash: '6 4', opacity: 0.75, strike: true };
    case 'context':
      return { ...PLAIN, opacity: 0.45 };
    default:
      return PLAIN;
  }
}

/** Whether the document is a diff: any object or connection carries a change mark. */
export const isDiff = (doc: Diagram) =>
  !!doc.appearance.compare ||
  Object.values(doc.styles).some(s => s.status) ||
  doc.graph.edges.some(e => e.status);

/**
 * In a diff, the swatch a status draws a shape with: a pale tint of its hue with a strong border
 * and dark ink, or the neutral surface (a quiet outline for containers) when unchanged.
 */
export function statusSwatch(
  look: ResolvedAppearance,
  status: Status | undefined,
  kind: 'node' | 'group',
): Swatch {
  const hue = HUES[status ?? 'same'];
  if (!hue)
    return kind === 'group' ? { fill: look.canvas, stroke: look.muted, ink: look.text } : look.node;
  const tint = swatchFor(look, hue, look.dark ? 900 : kind === 'group' ? 50 : 100);
  return {
    fill: tint.fill,
    stroke: swatchFor(look, hue, look.dark ? 400 : 600).fill,
    ink: swatchFor(look, hue, look.dark ? 100 : 900).fill,
  };
}

/** A connection's color: its status hue, or quiet grey for an unchanged line in a diff. */
export const edgeInk = (look: ResolvedAppearance, edge: DiagramEdge, diff: boolean) =>
  statusPaint(look, edge.status).stroke ?? (diff ? look.muted : look.connection);

/** Statuses a document uses that the legend explains, in legend order. */
export function usedStatuses(doc: Diagram): Status[] {
  const used = new Set<Status | undefined>([
    ...Object.values(doc.styles).map(s => s.status),
    ...doc.graph.edges.map(e => e.status),
  ]);
  return (Object.keys(STATUS_LABELS) as Status[]).filter(s => used.has(s));
}

/** The color key's rows: a diff draws no family colors, so it lists only its statuses. */
export const drawnLegend = (doc: Diagram): LegendEntry[] =>
  isDiff(doc) ? [] : (doc.appearance.legend ?? []);
