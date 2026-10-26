/**
 * Change status: how an object or connection differs between two versions of a diagram, drawn
 * the same way by the canvas, `inspect --svg` and the exports. Every status pairs a hue with a
 * border weight, dash, fade or strike, so a diff still reads in grayscale.
 */
import { swatchFor, type ResolvedAppearance } from './appearance';
import type { Diagram } from './types';

export type Status = 'same' | 'added' | 'removed' | 'changed' | 'context';
export const STATUSES: Status[] = ['same', 'added', 'removed', 'changed', 'context'];

/** Legend order and wording; `same` needs no row. */
export const STATUS_LABELS: Partial<Record<Status, string>> = {
  added: 'Added',
  changed: 'Changed',
  removed: 'Removed',
  context: 'Unchanged, for context',
};

export interface StatusPaint {
  /** Border or line color; the object's own when omitted. */
  stroke?: string;
  width?: number;
  dash?: string;
  opacity: number;
  /** Strike the title through. */
  strike: boolean;
  /**
   * Nodes draw `stroke` as a ring just outside their own border instead of replacing it, so the
   * status reads against any fill color.
   */
  ring: boolean;
}

/** Gap between a node's border and its status ring. */
export const RING_GAP = 4;

const PLAIN: StatusPaint = { opacity: 1, strike: false, ring: false };

export function statusPaint(look: ResolvedAppearance, status?: Status): StatusPaint {
  const hue = (family: string) => swatchFor(look, family, 600).fill;
  switch (status) {
    case 'added':
      return { stroke: hue('green'), width: 2.5, opacity: 1, strike: false, ring: true };
    case 'changed':
      return { stroke: hue('amber'), width: 2.5, opacity: 1, strike: false, ring: true };
    case 'removed':
      return { stroke: hue('red'), width: 2, dash: '6 4', opacity: 0.6, strike: true, ring: false };
    case 'context':
      return { ...PLAIN, opacity: 0.4 };
    default:
      return PLAIN;
  }
}

/** Statuses a document uses that the legend explains, in legend order. */
export function usedStatuses(doc: Diagram): Status[] {
  const used = new Set<Status | undefined>([
    ...Object.values(doc.styles).map(s => s.status),
    ...doc.graph.edges.map(e => e.status),
  ]);
  return (Object.keys(STATUS_LABELS) as Status[]).filter(s => used.has(s));
}
