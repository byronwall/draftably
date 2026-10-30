/**
 * The frame round a diagram: the heading above the drawing and the key under it. `inspect --svg`,
 * the editor's exports and the viewer canvas all place them from here, so what the viewer shows is
 * what an export draws.
 */
import type { Heading, LegendEntry, ResolvedAppearance } from './appearance';
import { headingSize } from './heading';
import { legendSize } from './legend';
import type { PlacedNote } from './note';
import { rectUnion } from './geometry';
import type { Rect } from './types';
import type { StatusCount } from './status';

/** Space between the frame's edge and the drawing; the heading and the key align to it. */
export const FRAME_PAD = 40;
/** Narrowest frame a `diagram width=` line or a drag can set. */
export const MIN_FRAME_WIDTH = 160;

/** Space between the heading and the first frame note, and between notes. */
const NOTE_GAP = 8;

/**
 * Lay out the frame round `area`, the drawing with `FRAME_PAD` already round it. The heading sits
 * above the area and the key at its bottom, both left-aligned with the drawing. Frame notes stack
 * under the heading, and the area grows to hold anchored notes (`placeNotes`). The frame is at
 * least as wide as the heading, the notes, the key and the heading's `width`; extra width goes to
 * the right.
 */
export function diagramFrame(
  look: ResolvedAppearance,
  heading: Heading | undefined,
  legend: LegendEntry[],
  statuses: StatusCount[],
  drawing: Rect,
  notes: readonly PlacedNote[] = [],
) {
  const anchored = notes.filter(n => !n.inFrame).map(n => n.rect),
    area = anchored.length ? rectUnion([drawing, rectUnion(anchored, FRAME_PAD)]) : drawing,
    inFrame = notes.filter(n => n.inFrame),
    lines = headingSize(look, heading),
    block = inFrame.reduce((h, n) => h + n.rect.h + NOTE_GAP, lines.h ? 0 : -NOTE_GAP),
    head = inFrame.length
      ? { w: Math.max(lines.w, ...inFrame.map(n => n.rect.w)), h: (lines.h || 20) + block }
      : lines,
    key = legendSize(look, legend, statuses),
    natural = Math.max(area.w, head.w + FRAME_PAD * 2, key.w + FRAME_PAD * 2),
    y = area.y - head.h,
    left = area.x + FRAME_PAD;
  // Frame notes start under the title and subtitle, which take the heading's height less its gap.
  let top = y + 28 + (lines.h ? lines.h - 20 + NOTE_GAP : 0);
  const placed = notes.map(n => {
    if (!n.inFrame) return n;
    const rect = { ...n.rect, x: left, y: top };
    top += n.rect.h + NOTE_GAP;
    return { ...n, rect };
  });
  return {
    x: area.x,
    y,
    w: Math.max(natural, heading?.width ?? 0),
    h: area.h + head.h + key.h,
    /** Width without the heading's `width`, which a drag never narrows past. */
    natural,
    head,
    key,
    heading: { x: left, y: y + 28 },
    legend: { x: left, y: area.y + area.h - 12 },
    /** Every note, placed. */
    notes: placed,
  };
}

export type DiagramFrame = ReturnType<typeof diagramFrame>;
