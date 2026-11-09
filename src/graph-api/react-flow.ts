/**
 * React Flow (and Svelte Flow, which shares its node and edge shape) in, the same shape out.
 * Nodes come back with `position` relative to their parent, as sub-flows expect, and a size.
 * Edges keep their fields and gain `type: 'draftably'` (unless they have a type) and
 * `data.draftably`: the routed path and label box that `DraftablyEdge` draws.
 */
import type {
  EdgeOut,
  GraphIn,
  LayoutResult,
  NodeIn,
  PlacedNodeIn,
  RouteIn,
  Routed,
  Shape,
} from './core';
import type { Side } from '../model/types';

/**
 * The fields of a React Flow 11 or 12 node that layout reads; other fields pass through. No index
 * signature, so React Flow's own `Node` and `Edge` types fit.
 */
export interface FlowNode {
  id: string;
  position?: { x: number; y: number };
  data?: { label?: unknown; [key: string]: unknown };
  type?: string;
  parentId?: string;
  /** React Flow 11's name for `parentId`. */
  parentNode?: string;
  width?: number | null;
  height?: number | null;
  measured?: { width?: number; height?: number };
  style?: { width?: number | string; height?: number | string };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: unknown;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  type?: string;
  data?: Record<string, unknown>;
}

export interface FlowGraph<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge> {
  nodes: N[];
  edges: E[];
}

export interface FlowOptions {
  /** A draftably shape for a node, such as `n => n.type === 'decision' ? 'diamond' : undefined`. */
  shape?: (node: FlowNode) => Shape | undefined;
}

/** What `layout` and `route` add to each edge, under `data.draftably`. */
export interface DraftablyEdgeData {
  path: string;
  points: EdgeOut['points'];
  label: EdgeOut['label'];
  sourceSide: Side;
  targetSide: Side;
  blocked: boolean;
}

/** A node as `layout` returns it: placed relative to its parent, with the size it was given. */
export type FlowNodeOut<N extends FlowNode> = N & {
  position: { x: number; y: number };
  width: number;
  height: number;
  style: NonNullable<N['style']> & { width: number; height: number };
};

export type FlowEdgeOut<E extends FlowEdge> = E & {
  type: string;
  data: E['data'] & { draftably: DraftablyEdgeData };
};

const SIDES = new Set(['left', 'right', 'top', 'bottom']);
/** A handle whose ID names a side (`right`, `bottom`, …) fixes that end's side. */
const side = (handle?: string | null) =>
  handle && SIDES.has(handle) ? (handle as Side) : undefined;
const size = (v: unknown) => (typeof v === 'number' && v > 0 ? v : undefined);
const parentOf = (n: FlowNode) => n.parentId ?? n.parentNode;
const labelOf = (n: FlowNode) => (typeof n.data?.label === 'string' ? n.data.label : n.id);
/** The size React Flow measured, or one the app set. */
const measured = (n: FlowNode) => ({
  width: size(n.measured?.width) ?? size(n.width) ?? size(n.style?.width),
  height: size(n.measured?.height) ?? size(n.height) ?? size(n.style?.height),
});
/** Group nodes: those another node names as its parent, and `type: 'group'`. */
const groupIds = (nodes: FlowNode[]) =>
  new Set([
    ...nodes.flatMap(n => (parentOf(n) ? [parentOf(n)!] : [])),
    ...nodes.filter(n => n.type === 'group').map(n => n.id),
  ]);

export function fromFlow({ nodes, edges }: FlowGraph, options: FlowOptions = {}): GraphIn {
  const groups = groupIds(nodes);
  return {
    groups: nodes
      .filter(n => groups.has(n.id))
      .map(n => ({ id: n.id, label: labelOf(n), parent: parentOf(n) })),
    nodes: nodes
      .filter(n => !groups.has(n.id))
      .map((n): NodeIn => {
        const { width, height } = measured(n);
        return {
          id: n.id,
          label: labelOf(n),
          parent: parentOf(n),
          shape: options.shape?.(n),
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
        };
      }),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
      dashed: e.animated,
      sourceSide: side(e.sourceHandle),
      targetSide: side(e.targetHandle),
    })),
  };
}

function withRoutes<E extends FlowEdge>(edges: E[], routed: Routed['edges']): FlowEdgeOut<E>[] {
  return edges.map(e => {
    const r = routed[e.id],
      draftably: DraftablyEdgeData = r
        ? {
            path: r.path,
            points: r.points,
            label: r.label,
            sourceSide: r.sourceSide,
            targetSide: r.targetSide,
            blocked: r.blocked,
          }
        : {
            path: '',
            points: [],
            label: null,
            sourceSide: 'right',
            targetSide: 'left',
            blocked: true,
          };
    return { ...e, type: e.type ?? 'draftably', data: { ...e.data, draftably } };
  });
}

export function toFlow<N extends FlowNode, E extends FlowEdge>(
  { nodes, edges }: FlowGraph<N, E>,
  out: LayoutResult,
): FlowGraph<FlowNodeOut<N>, FlowEdgeOut<E>> {
  const box = (id: string) => out.nodes[id] ?? out.groups[id];
  return {
    nodes: nodes.map(n => {
      const b = box(n.id),
        p = parentOf(n) ? box(parentOf(n)!) : undefined;
      if (!b) return n as FlowNodeOut<N>;
      const dims = { width: b.width, height: b.height };
      return {
        ...n,
        position: { x: b.x - (p?.x ?? 0), y: b.y - (p?.y ?? 0) },
        ...dims,
        style: { ...n.style, ...dims },
      } as FlowNodeOut<N>;
    }),
    edges: withRoutes(edges, out.edges),
  };
}

/**
 * The boxes React Flow shows now, for `route`: each position made absolute through its parents.
 * A node without a size is skipped, with its edges, until React Flow has measured it.
 */
export function placedFlow({ nodes, edges }: FlowGraph, options: FlowOptions = {}): RouteIn {
  const by = new Map(nodes.map(n => [n.id, n])),
    groups = groupIds(nodes);
  const at = (n: FlowNode): { x: number; y: number } => {
    const p = parentOf(n) ? by.get(parentOf(n)!) : undefined,
      base = p ? at(p) : { x: 0, y: 0 };
    return { x: base.x + (n.position?.x ?? 0), y: base.y + (n.position?.y ?? 0) };
  };
  const boxes = nodes.flatMap(n => {
    const { width, height } = measured(n);
    return width && height ? [{ n, box: { ...at(n), width, height } }] : [];
  });
  const known = new Set(boxes.map(b => b.n.id));
  return {
    groups: boxes
      .filter(({ n }) => groups.has(n.id))
      .map(({ n, box }) => ({ id: n.id, label: labelOf(n), parent: parentOf(n), ...box })),
    nodes: boxes
      .filter(({ n }) => !groups.has(n.id))
      .map(({ n, box }): PlacedNodeIn => ({
        id: n.id,
        parent: parentOf(n),
        shape: options.shape?.(n),
        ...box,
      })),
    edges: fromFlow({ nodes: [], edges }).edges!.filter(
      e => known.has(e.source) && known.has(e.target),
    ),
  };
}

export function routedFlow<E extends FlowEdge>(edges: E[], routed: Routed): FlowEdgeOut<E>[] {
  // An edge whose ends React Flow has not measured yet keeps its old route, if it has one.
  return withRoutes(edges, routed.edges).map((e, i) =>
    routed.edges[e.id] || !edges[i].data?.draftably ? e : (edges[i] as FlowEdgeOut<E>),
  );
}
