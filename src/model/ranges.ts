/**
 * How a code node draws its named ranges (`range sql.copy1 lines=3-6`): a band behind the lines,
 * a bar in the left margin and a label. By default the label sits outside the box's right edge, on
 * a leader from a dot just inside it; with `labels=inside` it sits in a column inside the box. The
 * label lane belongs to `codeLayout` and counts in the node's layout box, so code never runs under
 * a tag, layouts and routes keep clear of it, and every tag starts at the same x. The canvas and
 * `renderSvg` both draw from `rangeMarks`, so the viewer and every export agree.
 */
import { ensureContrast, swatchFor, type ResolvedAppearance } from './appearance';
import {
  CODE_TYPE,
  LEADER,
  LEADER_DOT,
  TAG_PAD,
  codeLayout,
  tagText,
  type CodeBlock,
  type CodeLayout,
  type CodeRange,
} from './code';
import { measureText } from './fonts';
import type { Diagram, Rect } from './types';

/** Radius of an outside label's leader dot. */
export const LEADER_DOT_R = 2.25;
/** Opacity of a band, so overlapping bands blend into a deeper tint. */
export const BAND_OPACITY = 0.7;
/** Bar width, and the step between the bars of nested or overlapping ranges. */
const BAR = 3;
const BAR_STEP = 4;
/** Bars fit in the left padding: at most this many side by side. */
const BAR_LANES = 3;

/** The family a status draws in; a range without a change mark keeps its own color. */
const STATUS_FAMILY: Record<string, string> = { added: 'green', changed: 'amber', removed: 'red' };

export interface RangeMark {
  range: CodeRange;
  /** The band, from the box's top edge. */
  y: number;
  h: number;
  band: string;
  /** The bar: its center x, color, width and dashes (a removed range). */
  barX: number;
  bar: string;
  barW: number;
  dash?: string;
  /** Fade for a dimmed or context range. */
  opacity: number;
  /** The label tag: its box and the text's right edge, from the box's top-left corner. */
  tag?: { x: number; y: number; w: number; h: number; text: string; ink: string };
  /**
   * An outside label's leader: a dot at (`x1`, `y1`) just inside the box on the range's first
   * row, a line out to `bend`, across to the label's row `y` when the label moved off the range's
   * row, and under the label to `x2`. A line that leaves the range on the right starts at the
   * box's edge level with the dot.
   */
  leader?: { x1: number; y1: number; bend: number; x2: number; y: number };
}

/**
 * The box a code node draws, in diagram coordinates: its layout rect without the lane its outside
 * range labels take. Lines meet this box, and only it counts as the node a line may not cross.
 */
export function drawnRect(
  n: Diagram['graph']['nodes'][number] | undefined,
  look: ResolvedAppearance,
  r: Rect,
) {
  if (!n?.code) return r;
  const laid = codeLayout(n.code, n.title, look, { width: r.w, height: r.h });
  return laid.frame === r.w ? r : { ...r, w: laid.frame };
}

/**
 * A code node's outside range labels, in diagram coordinates, for the router: each blocks from the
 * drawn box's edge to its label's end, down to its leader, so no line crosses a leader or a label.
 * `text` is the label alone: it blocks a line that leaves along this range's own leader.
 */
export function rangeLabelBoxes(
  n: Diagram['graph']['nodes'][number],
  look: ResolvedAppearance,
  r: Rect,
): Array<Rect & { id: string; text: Rect }> {
  if (!n.code?.ranges?.some(x => x.label)) return [];
  const laid = codeLayout(n.code, n.title, look, { width: r.w, height: r.h });
  if (!laid.tags?.outside) return [];
  return rangeMarks(n.code, laid, look, '#fff').flatMap(m => {
    const t = m.tag,
      l = m.leader;
    if (!t || !l) return [];
    return [
      {
        id: `${n.id}.${m.range.name}`,
        x: r.x + laid.frame,
        y: r.y + Math.min(t.y, l.y1),
        w: t.x + t.w - laid.frame,
        h: Math.max(l.y, l.y1) + 1 - Math.min(t.y, l.y1),
        text: { x: r.x + t.x, y: r.y + t.y, w: t.w, h: l.y - 1 - t.y },
      },
    ];
  });
}

/**
 * Where a line to a range meets its node, from the box's top: level with an outside label's
 * leader, so the line runs on from it, or else at the middle of the range's band.
 */
export function rangePort(
  code: CodeBlock,
  laid: CodeLayout,
  look: ResolvedAppearance,
  range: CodeRange,
) {
  const band = rangeBand(laid, range);
  if (!band) return undefined;
  const leader =
    laid.tags?.outside && range.label
      ? rangeMarks(code, laid, look, '#fff').find(m => m.range === range)?.leader
      : undefined;
  return leader ? leader.y1 : band.y + band.h / 2;
}

/** The rows of a range that the layout shows, as a band; undefined when all are cut off. */
export function rangeBand(laid: CodeLayout, r: CodeRange) {
  const rows = laid.rows.filter(row => row.line >= r.from && row.line <= r.to);
  if (!rows.length) return undefined;
  return { y: rows[0].y, h: rows[rows.length - 1].y + CODE_TYPE.lineHeight - rows[0].y };
}

/** The bands, bars and tags of a code node's ranges, in file order. */
export function rangeMarks(
  code: CodeBlock,
  laid: CodeLayout,
  look: ResolvedAppearance,
  fill: string,
): RangeMark[] {
  const ranges = code.ranges ?? [];
  if (!ranges.length) return [];
  // Bars of overlapping ranges stand side by side: each takes the first lane none overlapping
  // it holds, the longer ranges first so a nested range sits inside its parent's bar.
  const lanes = new Map<CodeRange, number>();
  for (const r of [...ranges].sort((a, b) => a.from - b.from || b.to - a.to)) {
    const taken = new Set(
      [...lanes].filter(([o]) => o.from <= r.to && r.from <= o.to).map(([, lane]) => lane),
    );
    let lane = 0;
    while (taken.has(lane)) lane++;
    lanes.set(r, lane % BAR_LANES);
  }
  const usedRows = new Set<number>(),
    tagType = look.annotation;
  return ranges.flatMap(r => {
    const band = rangeBand(laid, r);
    if (!band) return [];
    const family = STATUS_FAMILY[r.status ?? ''] ?? r.color,
      bandFill = swatchFor(look, family, look.dark ? 900 : 100).fill,
      bar = ensureContrast(swatchFor(look, family, look.dark ? 400 : 500).fill, fill, 3),
      opacity = r.spot === 'dim' ? 0.35 : r.status === 'context' ? 0.45 : 1,
      focus = r.spot === 'focus' || r.spot === 'ring';
    const mark: RangeMark = {
      range: r,
      ...band,
      band: bandFill,
      barX: 2 + BAR / 2 + lanes.get(r)! * BAR_STEP,
      bar,
      barW: focus ? BAR + 1 : BAR,
      ...(r.status === 'removed' ? { dash: '4 3' } : {}),
      opacity,
    };
    if (r.label && laid.tags) {
      const text = tagText(r.label, laid, look),
        tw = measureText(text, tagType) + 2 * TAG_PAD,
        th = CODE_TYPE.lineHeight - 1,
        first = laid.rows.findIndex(row => row.line >= r.from),
        // The tag takes the range's first row. A row another tag holds passes it to the next free
        // row below, or failing that above, so tags of ranges on the same or next-door lines
        // stack instead of covering each other.
        order = [
          ...[...laid.rows.keys()].filter(i => i >= first),
          ...[...laid.rows.keys()].filter(i => i < first).reverse(),
        ],
        row = order.find(i => !usedRows.has(i)) ?? first;
      usedRows.add(row);
      const y = laid.rows[row].y + 0.5,
        ink = swatchFor(look, family, look.dark ? 100 : 800).fill;
      if (laid.tags.outside) {
        // Outside, the label sits just above its leader, which runs from the dot under the text:
        // nothing covers the line, and a line that leaves the range on the right runs on from it.
        // A tag moved off its range's row keeps its dot on the range: the leader bends to it.
        const lead = Math.round(y + th / 2),
          anchor = Math.round(laid.rows[first].y + 0.5 + th / 2);
        mark.leader = {
          x1: laid.frame - LEADER_DOT,
          y1: anchor,
          bend: laid.frame + LEADER / 2,
          x2: laid.tags.x + tw,
          y: lead,
        };
        mark.tag = {
          x: laid.tags.x,
          y: lead - th + 1,
          w: tw,
          h: th,
          text,
          ink: ensureContrast(ink, look.canvas, 4.5),
        };
      } else
        mark.tag = {
          x: laid.tags.x,
          y,
          w: tw,
          h: th,
          text,
          ink: ensureContrast(ink, bandFill, 4.5),
        };
    }
    return [mark];
  });
}

/**
 * The box of a range on its node, in diagram coordinates: the node's width, the range's rows.
 * A note `near=` a range sits beside this box, and a line to it ends at its middle.
 */
export function rangeRect(
  doc: Diagram,
  look: ResolvedAppearance,
  rects: ReadonlyMap<string, Rect>,
  id: string,
): Rect | undefined {
  const found = findRange(doc, id),
    r = found && rects.get(found.node.id);
  if (!r) return undefined;
  const laid = codeLayout(found!.node.code!, found!.node.title, look, { width: r.w, height: r.h }),
    band = rangeBand(laid, found!.range);
  return band ? { x: r.x, y: r.y + band.y, w: r.w, h: band.h } : undefined;
}

/** The node and range an ID such as `sql.copy1` names, if it names one. */
export function findRange(doc: Diagram, id: string) {
  for (const node of doc.graph.nodes) {
    if (!node.code?.ranges || !id.startsWith(node.id + '.')) continue;
    const range = node.code.ranges.find(r => `${node.id}.${r.name}` === id);
    if (range) return { node, range };
  }
  return undefined;
}

/** The range ID of a code range: `<node>.<name>`. */
export const rangeId = (node: string, r: CodeRange) => `${node}.${r.name}`;
