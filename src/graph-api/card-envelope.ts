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
