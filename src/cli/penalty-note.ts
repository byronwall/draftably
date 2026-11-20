/**
 * `check --metrics`: when a `routing` line raises `crossing-penalty` above the default, draw the
 * file once more at the default. If a line then drops a long detour for a crossing or two, say
 * so: the penalty buys that detour (#608). The author may want no crossings, so it is a note,
 * not a warning.
 */
import type { Diagnostic } from '../dsl/compile';
import { RouteLab } from '../engines/routing-engine';
import { draw } from './variants';

type Drawn = Awaited<ReturnType<typeof draw>>;
type Line = Drawn['routes'][number];

/** A detour worth a note: the line runs this share of its length, and this much, more. */
const SHARE = 0.4,
  SAVED = 200;

const lengthOf = (r: Line) =>
  r.points
    .slice(1)
    .reduce((n, p, i) => n + Math.hypot(p.x - r.points[i].x, p.y - r.points[i].y), 0);

export async function penaltyNotes(source: string, drawn: Drawn): Promise<Diagnostic[]> {
  const lines = source.split('\n'),
    index = lines.findIndex(l => /^\s*routing\b.*\bcrossing-penalty=\d+/.test(l)),
    fallback = RouteLab.defaults.crossingPenalty;
  if (index < 0) return [];
  const set = Number(lines[index].match(/\bcrossing-penalty=(\d+)/)![1]);
  if (set <= fallback) return [];
  lines[index] = lines[index].replace(/\bcrossing-penalty=\d+/, `crossing-penalty=${fallback}`);
  let alt: Drawn;
  try {
    alt = await draw(lines.join('\n'));
  } catch {
    return [];
  }
  const cur = drawn.metrics,
    more = alt.metrics.crossings - cur.crossings;
  if (more < 1 || alt.metrics.bends >= cur.bends) return [];
  // The line the default shortens most.
  const after = new Map(alt.routes.map(r => [r.id, r]));
  let best: { r: Line; was: number; now: number } | null = null;
  for (const r of drawn.routes) {
    const o = after.get(r.id);
    if (!o) continue;
    const was = lengthOf(r),
      now = lengthOf(o);
    if (!best || was - now > best.was - best.now) best = { r, was, now };
  }
  if (!best || best.was - best.now < SAVED || best.now > best.was * (1 - SHARE)) return [];
  const { r, was, now } = best,
    bends = (l: Line) => l.points.length - 2;
  return [
    {
      level: 'info',
      code: 'crossing-detour',
      message: `crossing-penalty=${set} sends ${r.id} (${r.from} -> ${r.to}) round other lines: ${Math.round(was)}px and ${bends(r)} bends. At the default ${fallback} it takes ${Math.round(now)}px and ${bends(after.get(r.id)!)} bends, and the drawing has ${more === 1 ? 'one crossing' : `${more} crossings`} more. Lower crossing-penalty, or reorder the boxes so the lines need not cross, unless no crossing is worth the detour.`,
      line: index + 1,
      ids: [r.id],
    },
  ];
}
