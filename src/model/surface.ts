import { bandSwatch, panelSwatch, type ResolvedAppearance } from './appearance';
import { drawnSwatch } from './colors';
import { visibleRects } from '../dsl/project';
import type { Diagram, Point, Rect } from './types';

/** What is drawn at a point: an opaque fill, and a phase band's tint over it. */
export interface Surface {
  fill: string;
  tint?: { fill: string; opacity: number };
}

const within = (p: Point, r: Rect) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** The tint of each sequence phase band: alternate bands are stronger, so neighbours read apart. */
export const phaseOpacity = (i: number) => (i % 2 ? 0.03 : 0.12);

/**
 * A sequence's panel border only when its lanes leave a participant outside them. Lanes that
 * hold every participant already bound the exchange, and a second frame around them is cruft.
 */
export function panelDrawn(doc: Diagram) {
  if (!doc.layout.sequence) return false;
  const framed = new Set(doc.graph.groups.filter(g => g.frame !== 'none').map(g => g.id));
  return doc.graph.nodes.some(n => n.lifeline && !(n.parentId && framed.has(n.parentId)));
}

/**
 * The surface under a point, as the scene paints it: the canvas, the sequence panel, the
 * innermost group fill, then a phase band's tint. Halos and label cards take it, so a break in a
 * line reads as the lane it sits on, not a patch of canvas. A label card is one piece with the
 * surface under its center, so a label over a group's edge never reads as a half-tinted box. The
 * group rects are read once here and
 * not cached on `doc`: the editor's store keeps one `doc` object and updates it in place.
 */
export function surfaces(doc: Diagram, look: ResolvedAppearance) {
  const { vg, rects } = visibleRects(doc),
    seq = doc.layout.sequence,
    panel = !!seq && panelDrawn(doc);
  return (p: Point): Surface => {
    let fill = look.canvas;
    if (seq && panel && within(p, seq.panel)) fill = panelSwatch(look).fill;
    for (const g of vg.groups) {
      const r = rects.get(g.id);
      if (!r || g.frame === 'none') continue;
      const hull = g.frame === 'soft' && g.hull?.length ? g.hull : [{ x: 0, y: 0, w: r.w, h: r.h }];
      if (hull.some(h => within(p, { x: r.x + h.x, y: r.y + h.y, w: h.w, h: h.h })))
        fill = drawnSwatch(doc, look, g.id, 'group').fill;
    }
    const i = seq ? seq.phases.findIndex(ph => p.y >= ph.y && p.y <= ph.y + ph.h) : -1;
    return i < 0 || !within(p, seq!.panel)
      ? { fill }
      : {
          fill,
          tint: { fill: bandSwatch(look).stroke, opacity: phaseOpacity(i) },
        };
  };
}

/**
 * A halo path's pieces, grouped by the surface under them. A piece that crosses from one surface
 * to another, as at a group's border, splits there: each part takes the surface it lies on, so
 * a group's fill never paints past its border and the border still breaks under the line.
 */
export function haloPieces(under: (p: Point) => Surface, halo: string) {
  const out = new Map<string, { surface: Surface; d: string }>();
  const add = (a: Point, b: Point, surface: Surface) => {
    const key = JSON.stringify(surface),
      d = `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`,
      piece = out.get(key);
    if (piece) piece.d += d;
    else out.set(key, { surface, d });
  };
  for (const m of halo.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)) {
    const [x1, y1, x2, y2] = m.slice(1).map(Number),
      at = (t: number) => ({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }),
      keyAt = (t: number) => JSON.stringify(under(at(t))),
      steps = Math.max(1, Math.ceil(2 * Math.hypot(x2 - x1, y2 - y1)));
    // Sample the middle of each half-unit step; where the surface changes, bisect to the cut.
    const cuts = [0];
    let prev = keyAt(0.5 / steps);
    for (let i = 1; i < steps; i++) {
      const key = keyAt((i + 0.5) / steps);
      if (key === prev) continue;
      let lo = (i - 0.5) / steps,
        hi = (i + 0.5) / steps;
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        if (keyAt(mid) === prev) lo = mid;
        else hi = mid;
      }
      cuts.push((lo + hi) / 2);
      prev = key;
    }
    cuts.push(1);
    for (let i = 1; i < cuts.length; i++)
      add(at(cuts[i - 1]), at(cuts[i]), under(at((cuts[i - 1] + cuts[i]) / 2)));
  }
  return [...out.values()];
}

const r = (n: number) => Math.round(n * 100) / 100;
