/**
 * The two versions inside a document with change marks. Both keep the merged document's
 * positions, so every unchanged object sits at the same place in each panel.
 */
import type { Diagram } from './types';

export type PanelSide = 'before' | 'after';

/** The document as it was (`before`: no added objects, old labels) or is (`after`: no removed). */
export function panelDoc(doc: Diagram, side: PanelSide): Diagram {
  const hidden = side === 'before' ? 'added' : 'removed',
    keep = (id: string) => doc.styles[id]?.status !== hidden,
    old = side === 'before';
  const nodes = doc.graph.nodes
    .filter(n => keep(n.id))
    .map(n => (old && n.was !== undefined ? { ...n, title: n.was } : n));
  const ids = new Set(nodes.map(n => n.id));
  return {
    ...doc,
    graph: {
      nodes,
      groups: doc.graph.groups
        .filter(g => keep(g.id))
        .map(g => (old && g.was !== undefined ? { ...g, title: g.was } : g)),
      edges: doc.graph.edges
        .filter(e => e.status !== hidden && ids.has(e.from) && ids.has(e.to))
        .map(e => (old && e.was !== undefined ? { ...e, label: e.was } : e)),
    },
  };
}
