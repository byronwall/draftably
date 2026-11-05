/**
 * `check` warnings for lines that read against the drawing's direction: out of a box's left or
 * top, or into its right or bottom, in a `direction=right` layout (top and left, bottom and right
 * going down). The router takes such a side only when no forward route is clear, so the warning
 * makes that last resort visible. A side the file sets with `from=` or `to=` is the author's call.
 */
import type { DrawnRoute } from '../model/routes';
import type { Diagram, Rect } from '../model/types';
import type { Diagnostic, Scene } from './compile';

const BACK_OUT = { right: ['left', 'top'], down: ['top', 'left'] },
  BACK_IN = { right: ['right', 'bottom'], down: ['bottom', 'right'] };

export function flowSideNotes(
  scene: Scene,
  doc: Diagram,
  rects: Map<string, Rect>,
  routes: DrawnRoute[],
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const edges = new Map(scene.edges.map(e => [e.id, e]));
  for (const r of routes) {
    const e = edges.get(r.id),
      flow = doc.layout.edges[r.id]?.flow,
      a = e && rects.get(e.source),
      b = e && rects.get(e.target);
    if (!e || !a || !b || e.source === e.target || (flow !== 'right' && flow !== 'down')) continue;
    // Only a forward edge has a reading direction to keep, as the router decides it.
    const along = flow === 'down' ? b.y + b.h / 2 - a.y - a.h / 2 : b.x + b.w / 2 - a.x - a.w / 2;
    if (along <= 20) continue;
    const wrong = [
      ...(e.from === 'auto' && BACK_OUT[flow].includes(r.fromSide)
        ? [`leaves ${e.source} by its ${r.fromSide}`]
        : []),
      ...(e.to === 'auto' && BACK_IN[flow].includes(r.toSide)
        ? [`enters ${e.target} by its ${r.toSide}`]
        : []),
    ];
    if (!wrong.length) continue;
    out.push({
      level: 'warning',
      code: 'backward-side',
      message: `${r.id} (${e.source} -> ${e.target}) ${wrong.join(' and ')}, against direction=${flow}: no forward route was clear. Open a gap beside the boxes, or set from=/to= on the edge.`,
      line: e.line,
      ids: [r.id],
    });
  }
  return out;
}
