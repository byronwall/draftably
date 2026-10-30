/**
 * The frame round a diagram: the heading above the drawing and the key under it. `inspect --svg`,
 * the editor's exports and the viewer canvas all place them from here, so what the viewer shows is
 * what an export draws.
 */
import type { Heading, LegendEntry, ResolvedAppearance } from './appearance';
import { headingSize } from './heading';
import { legendSize } from './legend';
import type { Rect } from './types';
import type { StatusCount } from './status';

/** Space between the frame's edge and the drawing; the heading and the key align to it. */
export const FRAME_PAD = 40;
/** Narrowest frame a `diagram width=` line or a drag can set. */
export const MIN_FRAME_WIDTH = 160;

/**
 * Lay out the frame round `area`, the drawing with `FRAME_PAD` already round it. The heading sits
 * above the area and the key at its bottom, both left-aligned with the drawing. The frame is at
 * least as wide as the heading, the key and the heading's `width`; extra width goes to the right.
 */
export function diagramFrame(
  look: ResolvedAppearance,
  heading: Heading | undefined,
  legend: LegendEntry[],
  statuses: StatusCount[],
  area: Rect,
) {
  const head = headingSize(look, heading),
    key = legendSize(look, legend, statuses),
    natural = Math.max(area.w, head.w + FRAME_PAD * 2, key.w + FRAME_PAD * 2),
    y = area.y - head.h;
  return {
    x: area.x,
    y,
    w: Math.max(natural, heading?.width ?? 0),
    h: area.h + head.h + key.h,
    /** Width without the heading's `width`, which a drag never narrows past. */
    natural,
    head,
    key,
    heading: { x: area.x + FRAME_PAD, y: y + 28 },
    legend: { x: area.x + FRAME_PAD, y: area.y + area.h - 12 },
  };
}

export type DiagramFrame = ReturnType<typeof diagramFrame>;
