import { describe, expect, it } from 'vitest';
import { drawingBounds, ROUTE_INK } from '../src/model/bounds';
import { emptyDiagram } from '../src/model/document';
import * as edits from '../src/model/edits';
import { makeGeometry, visibleGraph } from '../src/model/graph';
import type { Rect } from '../src/model/types';

function oneEdge() {
  const doc = emptyDiagram();
  edits.addNode(doc, { id: 'a', title: 'A' }, { x: 100, y: 100 });
  edits.addNode(doc, { id: 'b', title: 'B' }, { x: 400, y: 100 });
  edits.addEdge(doc, { id: 'ab', from: 'a', to: 'b' });
  const vg = visibleGraph(doc),
    geometry = makeGeometry(doc),
    rects = new Map<string, Rect>(vg.nodes.map(n => [n.id, geometry(n.id)]));
  const boxes = [...rects.values()],
    left = Math.min(...boxes.map(r => r.x)),
    top = Math.min(...boxes.map(r => r.y)),
    right = Math.max(...boxes.map(r => r.x + r.w)),
    bottom = Math.max(...boxes.map(r => r.y + r.h));
  return { doc, vg, rects, left, top, right, bottom };
}

describe('drawingBounds', () => {
  it('reaches a route that loops outside the shapes, with its stroke and arrowhead', () => {
    const { doc, vg, rects, left, top, right } = oneEdge();
    const route = {
      points: [
        { x: right, y: top + 10 },
        { x: right + 30, y: top + 10 },
        { x: right + 30, y: top - 80 },
        { x: left - 60, y: top - 80 },
        { x: left - 60, y: top + 10 },
        { x: left, y: top + 10 },
      ],
      label: null,
    };
    const b = drawingBounds(doc, vg, rects, [route]);
    expect(b.x).toBe(left - 60 - ROUTE_INK);
    expect(b.y).toBe(top - 80 - ROUTE_INK);
    expect(b.x + b.w).toBe(right + 30 + ROUTE_INK);
  });

  it('reaches a connection label beyond the route and shapes, plus the margin', () => {
    const { doc, vg, rects, left, bottom } = oneEdge();
    const route = {
      points: [
        { x: left, y: bottom },
        { x: left, y: bottom + 20 },
      ],
      label: { x: left - 50, y: bottom + 40, w: 120, h: 20 },
    };
    const b = drawingBounds(doc, vg, rects, [route], 10);
    expect(b.x).toBe(left - 50 - 60 - 10);
    expect(b.y + b.h).toBe(bottom + 40 + 10 + 10);
  });
});
