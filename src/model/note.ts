/**
 * Notes: sentences on a diagram that never move its layout, from `note` statements. An anchored
 * note (`near=`) is placed after layout in free space beside its object; a note without one sits
 * in the frame under the subtitle. The viewer, `inspect --svg` and the editor's exports all place
 * and draw them from here.
 */
import { swatchFor, type ResolvedAppearance } from './appearance';
import type { BoundedRoute } from './bounds';
import { measureText, wrapLines } from './fonts';
import { contains, overlaps } from './geometry';
import type { Diagram, Rect } from './types';

export const NOTE_SIDES = ['below', 'above', 'left', 'right'] as const;
export type NoteSide = (typeof NOTE_SIDES)[number];

export interface Note {
  text: string;
  /** The node or group the note sits beside; the frame when unset. */
  near?: string;
  /** Which side of `near`; `below` when unset. */
  side?: NoteSide;
  /** Wrap width; `NOTE_WIDTH` when unset. */
  width?: number;
}

/**
 * A note with its box and wrapped lines. `inFrame` notes sit under the subtitle; `overlaps` is set
 * on an anchored note when no clear spot was found.
 */
export interface PlacedNote {
  note: Note;
  rect: Rect;
  lines: string[];
  inFrame?: boolean;
  overlaps?: boolean;
}

/** Default wrap width, and the room between a note and its object. */
export const NOTE_WIDTH = 280;
const GAP = 16,
  PAD_X = 12,
  PAD_Y = 8;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The note's wrapped lines and box size, at 0,0. */
export function noteBox(look: ResolvedAppearance, note: Note): PlacedNote {
  const type = look.annotation,
    lines = wrapLines(note.text, (note.width ?? NOTE_WIDTH) - PAD_X * 2, type),
    w = Math.ceil(Math.max(...lines.map(l => measureText(l, type)))) + PAD_X * 2;
  return { note, lines, rect: { x: 0, y: 0, w, h: lines.length * type.lineHeight + PAD_Y * 2 } };
}

/**
 * Place every anchored note beside its object, clear of shapes, group borders, lines and earlier
 * notes when a nearby spot allows it. Frame notes, and notes whose object is not drawn, come back
 * `inFrame` at 0,0 for `diagramFrame` to place.
 */
export function placeNotes(
  doc: Diagram,
  look: ResolvedAppearance,
  rects: ReadonlyMap<string, Rect>,
  routes: readonly BoundedRoute[],
): PlacedNote[] {
  const groups = new Set(doc.graph.groups.map(g => g.id)),
    shapes = [...rects].filter(([id]) => !groups.has(id)).map(([, r]) => r),
    frames = [...rects].filter(([id]) => groups.has(id)).map(([, r]) => r),
    lines = routes.flatMap(r =>
      r.points.slice(1).map((p, i) => {
        const a = r.points[i];
        return {
          x: Math.min(a.x, p.x) - 2,
          y: Math.min(a.y, p.y) - 2,
          w: Math.abs(p.x - a.x) + 4,
          h: Math.abs(p.y - a.y) + 4,
        };
      }),
    ),
    placed: Rect[] = [];
  const clear = (r: Rect) =>
    !shapes.some(s => overlaps(s, r, 4)) &&
    !lines.some(s => overlaps(s, r)) &&
    !placed.some(s => overlaps(s, r, 8)) &&
    // A note may sit inside a group, but not across its border.
    frames.every(g => !overlaps(g, r) || contains(g, r));
  return (doc.appearance.notes ?? []).map(note => {
    const box = noteBox(look, note),
      at = note.near ? rects.get(note.near) : undefined;
    if (!at) return { ...box, inFrame: true };
    const { w, h } = box.rect,
      side = note.side ?? 'below',
      across = side === 'below' || side === 'above';
    // Along the side: start-aligned, centered, end-aligned; then the same a little further out.
    const spots = [GAP, GAP + 24, GAP + 56].flatMap(d =>
      [0, 0.5, 1].map(t => {
        const x = across
            ? at.x + (at.w - w) * t
            : side === 'right'
              ? at.x + at.w + d
              : at.x - d - w,
          y = across ? (side === 'below' ? at.y + at.h + d : at.y - d - h) : at.y + (at.h - h) * t;
        return { x: Math.round(x), y: Math.round(y), w, h };
      }),
    );
    const spot = spots.find(clear);
    placed.push(spot ?? spots[0]);
    return { ...box, rect: spot ?? spots[0], ...(spot ? {} : { overlaps: true }) };
  });
}

/** SVG markup for placed notes: a quiet panel with a bar on its left edge, then the text. */
export function noteMarkup(look: ResolvedAppearance, notes: readonly PlacedNote[]): string {
  const { family, size, weight, lineHeight } = look.annotation,
    panel = swatchFor(look, 'slate', 50, 'group');
  return notes
    .map(({ rect: r, lines }) => {
      const text = lines
        .map(
          (line, i) =>
            `<text x="${r.x + PAD_X}" y="${r.y + PAD_Y + (i + 0.5) * lineHeight}" dominant-baseline="central" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${look.text}">${esc(line)}</text>`,
        )
        .join('');
      return (
        `<g class="diagram-note">` +
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="${panel.fill}"/>` +
        `<rect x="${r.x}" y="${r.y}" width="3" height="${r.h}" rx="1.5" fill="${look.muted}"/>` +
        text +
        '</g>'
      );
    })
    .join('');
}
