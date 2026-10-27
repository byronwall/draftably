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
import { descendants, styleOf } from './graph';
import type { Diagram, DiagramEdge } from './types';

export type Status = 'same' | 'added' | 'removed' | 'changed' | 'context';

/**
 * How an emphasis state draws an object or connection: in focus (a heavier border or line),
 * ringed (in focus where nothing else fades, so it also takes an accent ring or line), or dimmed
 * (faded and neutral, like a `.` context line). Unset means it draws as usual.
 */
export type Spot = 'focus' | 'ring' | 'dim';
export const STATUSES: Status[] = ['same', 'added', 'removed', 'changed', 'context'];

/** Legend order and wording, after a count; `same` needs no entry. */
export const STATUS_LABELS: Partial<Record<Status, string>> = {
  added: 'added',
  changed: 'changed',
  removed: 'removed',
  context: 'shown for context',
};

export interface StatusCount {
  status: Status;
  count: number;
}

/** A legend entry's text: how many objects and connections carry the mark, then what it means. */
export const statusLabel = ({ status, count }: StatusCount) => `${count} ${STATUS_LABELS[status]}`;

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
  /** Draw an accent ring around the shape (`haloInk`). */
  halo?: boolean;
}

/** Room between a shape and its focus ring. */
export const HALO_GAP = 4;

/** The accent a ringed object or connection is drawn with: the theme's second accent. */
export const haloInk = (look: ResolvedAppearance) =>
  swatchFor(look, 'secondary', look.dark ? 300 : 500).fill;

const PLAIN: StatusPaint = { opacity: 1, strike: false };

/** Focus weight: a node border, and 0.5 more than a connection's line. */
const FOCUS_WIDTH = 2.4;

/** The paint for a change status, with an emphasis state's weight or fade on top. */
export function statusPaint(look: ResolvedAppearance, status?: Status, spot?: Spot): StatusPaint {
  const p = changePaint(look, status);
  if (spot === 'focus' || spot === 'ring')
    return { ...p, width: Math.max(p.width ?? 0, FOCUS_WIDTH), halo: spot === 'ring' };
  if (spot === 'dim') return { ...p, opacity: Math.min(p.opacity, CONTEXT_FADE) };
  return p;
}

const CONTEXT_FADE = 0.45;

function changePaint(look: ResolvedAppearance, status?: Status): StatusPaint {
  const hue = HUES[status ?? 'same'],
    stroke = hue ? swatchFor(look, hue, look.dark ? 400 : 600).fill : undefined;
  switch (status) {
    case 'added':
    case 'changed':
      return { stroke, width: 2, opacity: 1, strike: false };
    case 'removed':
      return { stroke, width: 2, dash: '6 4', opacity: 0.75, strike: true };
    case 'context':
      return { ...PLAIN, opacity: CONTEXT_FADE };
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
  statusPaint(look, edge.status).stroke ??
  (edge.spot === 'ring'
    ? haloInk(look)
    : diff || edge.spot === 'dim'
      ? look.muted
      : look.connection);

/**
 * The document drawn in emphasis state `id`. Listed objects (a group with all its members) and
 * listed connections are in focus, and so is a connection between two focused nodes. With
 * `rest=dim`, everything else fades, except the containers that hold something in focus, so the
 * context still reads. With `rest=plain` nothing fades, so focus also takes an accent ring.
 * Nothing moves.
 */
export function withState(doc: Diagram, id: string): Diagram {
  const state = doc.appearance.states?.find(s => s.id === id);
  if (!state) return doc;
  const focus = new Set<string>();
  for (const x of state.ids) {
    focus.add(x);
    if (doc.graph.groups.some(g => g.id === x)) for (const d of descendants(doc, x)) focus.add(d);
  }
  const parent = new Map(
    [...doc.graph.nodes, ...doc.graph.groups].map(o => [o.id, o.parentId] as const),
  );
  const frames = new Set<string>();
  for (const x of focus) for (let p = parent.get(x); p; p = parent.get(p)) frames.add(p);
  const rest = state.rest === 'dim' ? ('dim' as const) : undefined,
    on = state.rest === 'dim' ? ('focus' as const) : ('ring' as const),
    spotOf = (x: string) => (focus.has(x) ? on : frames.has(x) ? undefined : rest),
    styles = { ...doc.styles };
  for (const o of [...doc.graph.nodes, ...doc.graph.groups]) {
    const spot = spotOf(o.id);
    if (spot) styles[o.id] = { ...styleOf(doc, o.id), spot };
  }
  const edges = doc.graph.edges.map(e => {
    const spot = focus.has(e.id) || (focus.has(e.from) && focus.has(e.to)) ? on : rest;
    return spot ? { ...e, spot } : e;
  });
  return { ...doc, styles, graph: { ...doc.graph, edges } };
}

/**
 * The marks a document uses that the legend explains, in legend order, each with how many
 * objects and connections carry it, so the key doubles as the change's size.
 */
export function usedStatuses(doc: Diagram): StatusCount[] {
  const ids = new Set([...doc.graph.nodes, ...doc.graph.groups].map(o => o.id)),
    marks = [
      ...Object.entries(doc.styles)
        .filter(([id]) => ids.has(id))
        .map(([, s]) => s.status),
      ...doc.graph.edges.map(e => e.status),
    ];
  return (Object.keys(STATUS_LABELS) as Status[])
    .map(status => ({ status, count: marks.filter(m => m === status).length }))
    .filter(c => c.count);
}

/** The color key's rows: a diff draws no family colors, so it lists only its statuses. */
export const drawnLegend = (doc: Diagram): LegendEntry[] =>
  isDiff(doc) ? [] : (doc.appearance.legend ?? []);
