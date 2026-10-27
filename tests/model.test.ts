import { describe, expect, it } from 'vitest';
import { emptyDiagram, normalize, routingFingerprint } from '../src/model/document';
import * as edits from '../src/model/edits';
import { ancestors, descendants, findNode, selectionRoots, visibleGraph } from '../src/model/graph';
import { fitCamera } from '../src/model/camera';
import { loadSample, SAMPLES } from '../src/model/samples';
import type { Diagram } from '../src/model/types';

const origin = { x: 0, y: 0 };

function twoBoxes(): Diagram {
  const doc = emptyDiagram();
  edits.addNode(doc, { id: 'a', title: 'A' }, { x: 100, y: 100 });
  edits.addNode(doc, { id: 'b', title: 'B' }, { x: 400, y: 100 });
  edits.addEdge(doc, { id: 'ab', from: 'a', to: 'b' });
  return doc;
}

describe('samples', () => {
  it('loads every example as a valid, independent document', () => {
    const ids = new Set<string>();
    for (const sample of SAMPLES) {
      const doc = loadSample(sample.id);
      expect(doc.graph.nodes.length).toBeGreaterThan(0);
      expect(normalize(doc)).toEqual(doc);
      ids.add(doc.id);
    }
    expect(ids.size).toBe(SAMPLES.length);
  });
});

describe('routingFingerprint', () => {
  // The editor store keeps old key order, so worker routes are adopted only if order is ignored.
  it('ignores the order of layout keys', () => {
    const doc = twoBoxes(),
      reordered = structuredClone(doc);
    reordered.layout.nodes = Object.fromEntries(Object.entries(doc.layout.nodes).reverse());
    expect(Object.keys(reordered.layout.nodes)).not.toEqual(Object.keys(doc.layout.nodes));
    expect(routingFingerprint(reordered)).toBe(routingFingerprint(doc));
  });
});

describe('normalize', () => {
  it('rejects unsafe and duplicate ids', () => {
    const bad = { graph: { nodes: [{ id: '__proto__', title: 'x' }], edges: [] } };
    expect(() => normalize(bad)).toThrow(/safe ID/);
    const dup = {
      graph: {
        nodes: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
        edges: [],
      },
    };
    expect(() => normalize(dup)).toThrow(/Duplicate/);
  });

  it('migrates a version 1 file and drops hidden objects', () => {
    const legacy = {
      title: 'Old',
      graph: {
        nodes: [
          { id: 'a', title: 'A', type: 'decision' },
          { id: 'b', title: 'B', parentId: 'g' },
        ],
        groups: [{ id: 'g', title: 'G' }],
        edges: [{ id: 'e', from: 'a', to: 'b' }],
      },
      views: [{ id: 'v', filter: { hiddenIds: ['g'] }, layout: { nodes: {} } }],
      activeViewId: 'v',
    };
    const doc = normalize(legacy);
    expect(doc.graph.nodes.map(n => n.id)).toEqual(['a']);
    expect(doc.graph.groups).toEqual([]);
    expect(doc.graph.edges).toEqual([]);
    expect(doc.styles.a.shape).toBe('diamond');
  });

  it('materializes frames for containers saved without geometry', () => {
    const doc = normalize({
      graph: {
        nodes: [{ id: 'a', title: 'A', parentId: 'g' }],
        groups: [{ id: 'g', title: 'G' }],
        edges: [],
      },
      layout: { nodes: { a: { x: 100, y: 100, w: 100, h: 50 } } },
    });
    const frame = doc.layout.nodes.g;
    expect(frame.x).toBeLessThan(100);
    expect(frame.y + frame.h).toBeGreaterThan(150);
  });
});

describe('edits', () => {
  it('adds a connected node beside its source without overlapping', () => {
    const doc = twoBoxes();
    const id = edits.addConnectedNode(doc, { from: 'b' }, origin);
    expect(doc.graph.edges.some(e => e.from === 'b' && e.to === id)).toBe(true);
    expect(doc.layout.nodes[id].x).toBeGreaterThan(doc.layout.nodes.b.x);
  });

  it('inserts a step into a connection', () => {
    const doc = twoBoxes();
    const id = edits.insertStep(doc, 'ab', undefined)!;
    expect(doc.graph.edges.find(e => e.id === 'ab')!.to).toBe(id);
    expect(doc.graph.edges.some(e => e.from === id && e.to === 'b')).toBe(true);
  });

  it('wraps objects in a container and ungroups them again', () => {
    const doc = twoBoxes();
    const group = edits.wrapInContainer(doc, ['a', 'b'], origin);
    expect(descendants(doc, group).sort()).toEqual(['a', 'b']);
    expect(ancestors(doc, 'a')).toEqual([group]);
    expect(selectionRoots(doc, ['a', group])).toEqual([group]);
    edits.ungroup(doc, [group]);
    expect(doc.graph.groups).toEqual([]);
    expect(findNode(doc, 'a')!.parentId).toBeUndefined();
  });

  it('deletes a container with or without its contents', () => {
    const shallow = twoBoxes();
    const g1 = edits.wrapInContainer(shallow, ['a'], origin);
    edits.deleteObjects(shallow, [g1]);
    expect(shallow.graph.nodes.map(n => n.id)).toEqual(['a', 'b']);

    const deep = twoBoxes();
    const g2 = edits.wrapInContainer(deep, ['a'], origin);
    edits.deleteObjects(deep, [g2], true);
    expect(deep.graph.nodes.map(n => n.id)).toEqual(['b']);
    expect(deep.graph.edges).toEqual([]);
    expect(deep.layout.nodes.a).toBeUndefined();
  });

  it('collapses containers out of the visible graph', () => {
    const doc = twoBoxes();
    const group = edits.wrapInContainer(doc, ['a'], origin);
    edits.toggleCollapsed(doc, group);
    const vg = visibleGraph(doc);
    expect(vg.nodes.map(n => n.id)).toEqual(['b']);
    expect(vg.edges[0]).toMatchObject({ id: 'ab', a: group, b: 'b' });
  });

  it('keeps containers from shrinking across their contents', () => {
    const doc = twoBoxes();
    const group = edits.wrapInContainer(doc, ['a'], origin);
    const start = doc.layout.nodes[group];
    const smaller = edits.resizedRect(doc, group, start, -400, -400, 'se');
    expect(smaller.x + smaller.w).toBeGreaterThanOrEqual(
      doc.layout.nodes.a.x + doc.layout.nodes.a.w,
    );
  });

  it('aligns and distributes selected objects', () => {
    const doc = twoBoxes();
    doc.layout.nodes.b.y = 300;
    edits.alignObjects(doc, ['a', 'b'], 'top');
    expect(doc.layout.nodes.b.y).toBe(doc.layout.nodes.a.y);
    expect(doc.layout.nodes.b.manual).toBe(true);
  });

  it('builds a chain from a list of titles', () => {
    const doc = emptyDiagram();
    const ids = edits.buildFromList(doc, ['One', 'Two', 'Three'], { origin, columns: 3 });
    expect(ids).toHaveLength(3);
    expect(doc.graph.edges.map(e => [e.from, e.to])).toEqual([
      [ids[0], ids[1]],
      [ids[1], ids[2]],
    ]);
    expect(() => edits.buildFromList(doc, [], { origin, columns: 3 })).toThrow();
  });

  it('pastes a copied fragment with new ids and an offset', () => {
    const doc = twoBoxes();
    const part = edits.copyFragment(doc, ['a', 'b']);
    expect(part.edges.map(e => e.id)).toEqual(['ab']);
    const { doc: pasted, selected } = edits.pasteFragment(doc, part);
    expect(pasted.graph.nodes).toHaveLength(4);
    expect(pasted.graph.edges).toHaveLength(2);
    const copy = pasted.layout.nodes[selected[0]];
    expect(copy.x).toBe(doc.layout.nodes.a.x + 32);
    expect(copy.manual).toBe(true);
  });

  it('sets start and end intent on different shapes', () => {
    const doc = twoBoxes();
    edits.setIntent(doc, 'start', 'a');
    edits.setIntent(doc, 'end', 'a');
    expect(doc.layout.intent.start).toBeUndefined();
    expect(doc.layout.intent.end).toEqual({ id: 'a', placement: 'bottom-right' });
    expect(() => edits.setIntent(doc, 'start', 'ab')).toThrow();
  });
});

describe('fitCamera', () => {
  const bounds = { x: -800, y: -260, w: 1540, h: 860 };

  it('fits bounds inside a padded viewport', () => {
    for (const viewport of [
      { width: 720, height: 560 },
      { width: 1150, height: 700 },
    ]) {
      const camera = fitCamera(bounds, viewport)!;
      expect(bounds.w * camera.k).toBeLessThanOrEqual(viewport.width - 36 + 1e-9);
      expect(bounds.h * camera.k).toBeLessThanOrEqual(viewport.height - 36 + 1e-9);
      expect(camera.cx).toBe(bounds.x + bounds.w / 2);
    }
  });

  it('skips hidden viewports', () => {
    expect(fitCamera(bounds, { width: 0, height: 0 })).toBeNull();
  });
});
