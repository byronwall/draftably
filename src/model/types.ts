export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Side = 'left' | 'right' | 'top' | 'bottom';
export type PortSide = Side | 'auto';
export type Direction = 'RIGHT' | 'DOWN';
export type Theme = 'light' | 'dark';
import type { DiagramAppearance, Shade } from './appearance';

export type ShapeKind = 'box' | 'pill' | 'circle' | 'diamond' | 'text' | 'icon' | 'image';
/** A color family: a built-in one, one the file defines, or `auto` for the theme's surface. */
export type ColorKey = string;
export type LabelMode = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'detached';

export interface DiagramNode {
  id: string;
  title: string;
  parentId?: string;
  image?: string;
}

export interface DiagramGroup {
  id: string;
  title: string;
  parentId?: string;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  directed: boolean;
  emphasis: boolean;
  dashed: boolean;
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
  /** Set by the compiler for a fold's wrap edge: the line it returns along, between two bands. */
  lane?: Lane;
}

/**
 * A channel between two bands of a fold: a level line at `y`, or an upright one at `x`. With
 * `leave`, the edge leaves its source's side and turns onto the lane at that coordinate; with
 * `enter`, it runs on along the lane to that coordinate and turns into its target's side.
 */
export type Lane = ({ y: number } | { x: number }) & { leave?: number; enter?: number };

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
