export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Side = 'left' | 'right' | 'top' | 'bottom';
export type PortSide = Side | 'auto';
export type Direction = 'RIGHT' | 'DOWN';
export type Theme = 'light' | 'dark';
import type { DiagramAppearance, Shade } from './appearance';
import type { Spot, Status } from './status';

export type ShapeKind = 'box' | 'pill' | 'circle' | 'diamond' | 'text' | 'icon' | 'image';
/** A color family: a built-in one, one the file defines, or `auto` for the theme's surface. */
export type ColorKey = string;
export type LabelMode = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'detached';

export interface DiagramNode {
  id: string;
  title: string;
  /** Title before a change, from `was=` on a `~` line. */
  was?: string;
  /** A link to open from exported drawings. */
  href?: string;
  /** How many things this box stands for; drawn as a stack with a badge. */
  count?: number;
  parentId?: string;
  image?: string;
  /** A sequence participant: length of the dashed lifeline below the box. */
  lifeline?: number;
}

export interface DiagramGroup {
  id: string;
  title: string;
  /** Title before a change, from `was=` on a `~` line. */
  was?: string;
  /** A link to open from exported drawings. */
  href?: string;
  parentId?: string;
  /** `soft` draws a tint behind the members instead of a frame; `none` draws nothing. */
  frame?: 'soft' | 'none';
  /** A soft group's tint: rectangles relative to the group's top left; the first holds the label. */
  hull?: Rect[];
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  /** Label before a change, from `was=` on a `~` line. */
  was?: string;
  directed: boolean;
  emphasis: boolean;
  dashed: boolean;
  /** How it differs between two versions of the diagram. */
  status?: Status;
  /** How the drawn emphasis state treats it; see `withState`. */
  spot?: Spot;
}

export interface NodeLayout extends Rect {
  manual?: boolean;
  pinned?: boolean;
}

export interface EdgeLayout {
  fromSide?: PortSide;
  toSide?: PortSide;
  labelDx?: number;
  labelDy?: number;
  waypoints?: Point[];
  /** The reading direction of the layout that places both ends; the edge runs along it. */
  flow?: 'right' | 'down';
  /** Set by the compiler for a fold's wrap edge: the line it returns along, between two bands. */
  lane?: Lane;
  /** From a lane, at route time: where along its target's side the edge arrives, off centre. */
  toOffset?: number;
  /** A sequence message: drawn straight between the two lifelines at this height, not routed. */
  row?: number;
}

/**
 * A channel between two bands of a fold: a level line at `y`, or an upright one at `x`. With
 * `leave`, the edge leaves its source's side and turns onto the lane at that coordinate; with
 * `enter`, it runs on along the lane to that coordinate and turns into its target's side.
 * With `out`, it is a return or skip lane beyond both ends.
 */
export type Lane = ({ y: number } | { x: number }) & {
  leave?: number;
  enter?: number;
  /**
   * A lane beyond both ends, outside their band: the edge leaves by the side facing it, runs
   * along it, and at `enter` turns into the target's side that faces back toward the source.
   */
  out?: boolean;
  /**
   * With `out`: the gap beside the target holds another edge's label, so the edge arrives square
   * on the target's face toward the lane, at `enter` (its middle), instead of turning into that gap.
   */
  face?: boolean;
};

export interface LabelLayout {
  mode?: LabelMode;
  dx?: number;
  dy?: number;
  width?: number;
  leader?: boolean;
}

export interface ContainerLayout {
  direction: 'inherit' | Direction;
  padding: number;
  manualSize: boolean;
}

export type IntentRole = 'start' | 'end';
export type IntentPlacement =
  | 'top-left'
  | 'left-center'
  | 'center'
  | 'top-center'
  | 'top-right'
  | 'right-center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
export type LayoutIntent = Partial<Record<IntentRole, { id: string; placement: IntentPlacement }>>;

export interface NodeStyle {
  shape: ShapeKind;
  color: ColorKey;
  /** Numeric shade; omitted means the default for the object (500 for nodes, 100 for groups). */
  shade?: Shade;
  icon: string;
  /** How it differs between two versions of the diagram. */
  status?: Status;
  /** How the drawn emphasis state treats it; see `withState`. */
  spot?: Spot;
}

export type LayoutAlgorithmId =
  | 'compound-flow'
  | 'boundary-align'
  | 'compound-spring'
  | 'tidy'
  | 'stress'
  | 'force'
  | 'flow'
  | 'layered'
  | 'tree'
  | 'grid'
  | 'separate';

export type AspectSetting = 'canvas' | '1' | '1.333' | '1.6' | '2' | '0.75';

export interface LayoutSettings {
  algorithm: LayoutAlgorithmId;
  direction: Direction;
  mode: 'pass' | 'rebuild';
  maxMove: number;
  stability: number;
  iterations: number;
  nodeGap: number;
  rankGap: number;
  edgeLength: number;
  repulsion: number;
  flowStrength: number;
  alignment: number;
  compactness: number;
  gridStrength: number;
  aspect: AspectSetting;
  fold: 'auto' | 'never';
  respectDirection: boolean;
  ordering: 'stable' | 'crossings';
  rootId: string;
  respectManual: boolean;
  growContainers: boolean;
  boundaryPull: number;
  hierarchySweeps: number;
  groupGap: number;
}

export interface RoutingSettings {
  clearance: number;
  portGap: number;
  edgeGap: number;
  bendPenalty: number;
  crossingPenalty: number;
  sharedPenalty: number;
  parallelPenalty: number;
  portStability: number;
  fanoutPenalty: number;
  passes: number;
  cornerRadius: number;
  standoff: number;
}

export interface DiagramSettings extends LayoutSettings {
  snap: boolean;
  showManual: boolean;
  routing: RoutingSettings;
}

export interface Camera {
  x: number;
  y: number;
  k: number;
}

export interface Diagram {
  schemaVersion: 2;
  id: string;
  title: string;
  graph: { nodes: DiagramNode[]; edges: DiagramEdge[]; groups: DiagramGroup[] };
  layout: {
    nodes: Record<string, NodeLayout>;
    edges: Record<string, EdgeLayout>;
    labels: Record<string, LabelLayout>;
    containers: Record<string, ContainerLayout>;
    intent: LayoutIntent;
  };
  styles: Record<string, NodeStyle>;
  collapsed: string[];
  settings: DiagramSettings;
  camera: Camera;
  /** Editor light or dark mode; independent of the diagram's appearance. */
  theme: Theme;
  /** Diagram theme, overrides and color definitions. Saved with the diagram. */
  appearance: DiagramAppearance;
}

export type NodeGeometry = Record<string, NodeLayout>;

/** Any object that can be selected: a shape, a container, or a connection. */
export type Entity = DiagramNode | DiagramGroup | DiagramEdge;
