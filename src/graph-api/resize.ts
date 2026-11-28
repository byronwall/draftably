import { replayGrid } from './resize-grid';
import { createContext } from '../engines/routing/context';
import { find } from '../engines/routing/find';
import { improve } from '../engines/routing/improve';
import { repair } from '../engines/routing/repair';
import { centre, nudge } from '../engines/routing/nudge';
import { validPath } from '../engines/routing/paths';
import { port } from '../engines/routing/ports';
import { tidy } from '../engines/routing/tidy';
import { round, same } from '../engines/routing/geometry';
import type { Route, RouteInput, RoutingOptions } from '../engines/routing/types';
import type { PlacedNodeIn } from './core';

/** Move tracks with their nearest card face. Face coordinates shared by multiple cards must
 * agree on the new coordinate. A column that splits or changes order needs a fresh route. */
function columnMap(before: PlacedNodeIn[], after: PlacedNodeIn[]) {
  const faces = new Map<number, number>();
  for (let i = 0; i < before.length; i++) {
    const a = before[i],
      b = after[i];
    for (const [x, next] of [
      [a.x, b.x],
      [a.x + a.width, b.x + b.width],
    ]) {
      if (faces.has(x) && faces.get(x) !== next) return;
      faces.set(x, next);
    }
  }
  const xs = [...faces.keys()].sort((a, b) => a - b);
  if (!xs.length || xs.some((x, i) => i && faces.get(x)! <= faces.get(xs[i - 1])!)) return;
  return (x: number) => {
    const face = xs.reduce((a, b) => (Math.abs(x - a) <= Math.abs(x - b) ? a : b));
    return round(x + faces.get(face)! - face);
  };
}

export interface Previous {
  key: string;
  nodes: PlacedNodeIn[];
  routes: Route[];
}
export function resize(
  old: Previous,
  nodes: PlacedNodeIn[],
  input: RouteInput,
  options: RoutingOptions,
) {
  const move = columnMap(old.nodes, nodes);
  if (!move) return;
  const ctx = createContext(input, options);
  const byId = new Map(old.routes.map(r => [r.id, r]));
  const missing = [];
  for (const e of ctx.edges) {
    const r = byId.get(e.id)!;
    const ps = r.points.map(p => ({ x: move(p.x), y: p.y }));
    const { fromSide: fs, toSide: ts } = r;
    const a = port(ctx.rects.get(e.from)!, fs, e.cfg.fromAt);
    const b = port(ctx.rects.get(e.to)!, ts, e.cfg.toAt);
    if (
      !r.blocked &&
      same(a, ps[0]) &&
      same(b, ps.at(-1)!) &&
      validPath(ps, e, fs, ts, ctx.obsFor(e))
    ) {
      ctx.state.routes.push({ ...r, points: ps });
      ctx.state.fixedPlans.add(e.id);
    } else missing.push(e);
  }
  if (missing.length > ctx.edges.length / 3) return;
  for (const e of missing) ctx.state.routes.push(find(ctx, e, ctx.state.routes));
  if (missing.length) {
    improve(ctx);
    repair(ctx);
    nudge(ctx);
    tidy(ctx);
    centre(ctx);
  }
  replayGrid(ctx);
  return ctx.state.routes.sort((a, b) => (a.id < b.id ? -1 : 1));
}
