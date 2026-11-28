import type { Route } from '../engines/routing/types';
import type { Point, Rect } from '../model/types';

/** The outer faces of all cards, before routing clearance expands them. */
export function cardEnvelope(cards: Iterable<Rect>) {
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  for (const card of cards) {
    left = Math.min(left, card.x);
    right = Math.max(right, card.x + card.w);
    top = Math.min(top, card.y);
    bottom = Math.max(bottom, card.y + card.h);
  }
  return { left, right, top, bottom };
}

export function outsideCardBounds(points: Point[], box: ReturnType<typeof cardEnvelope>) {
  return points.some(p => p.x < box.left || p.x > box.right || p.y < box.top || p.y > box.bottom);
}

/** A fixed row port on an outward face must cross the card bounds. */
export function outwardPort(r: Route, bounds: ReturnType<typeof cardEnvelope>) {
  const a = r.points[0],
    b = r.points.at(-1)!;
  return (
    (r.fromSide === 'left' && a.x <= bounds.left) ||
    (r.fromSide === 'right' && a.x >= bounds.right) ||
    (r.toSide === 'left' && b.x <= bounds.left) ||
    (r.toSide === 'right' && b.x >= bounds.right)
  );
}
