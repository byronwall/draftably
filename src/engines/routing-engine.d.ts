import type { EdgeLayout, Point, Rect, RoutingSettings, ShapeKind, Side } from '../model/types';

export interface RouteNodeInput extends Rect {
  id: string;
  parentId?: string;
  shape: ShapeKind;
}

export interface RouteGroupInput extends Rect {
  id: string;
  parentId?: string;
  collapsed: boolean;
}

export interface RouteEdgeInput {
  id: string;
  from: string;
  to: string;
  directed?: boolean;
  cfg: EdgeLayout;
}

export interface RouteInput {
  nodes: RouteNodeInput[];
  groups: RouteGroupInput[];
  edges: RouteEdgeInput[];
}

export interface Route {
  id: string;
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  fromOffset: number;
  toOffset: number;
  points: Point[];
  blocked: boolean;
  reason?: string;
}

export interface PriorRoute {
  id: string;
  fromSide: Side;
  toSide: Side;
}

export interface RoutingReport {
  crossings: number;
  shared: number;
  lanePairs: number;
  laneDeficit: number;
  minimumConflictingGap: number | null;
  requestedEdgeGap: number;
  blocked: number;
  bends: number;
  length: number;
  initial: unknown;
  accepted: number;
  nudged: number;
  edges: number;
  milliseconds: number;
  passes: number;
}

export interface RoutingResult {
  routes: Route[];
  report: RoutingReport;
}

export interface RoutingOptions extends Partial<RoutingSettings> {
  previous?: PriorRoute[];
  quick?: boolean;
}

export const RouteLab: {
  compute(input: RouteInput, options?: RoutingOptions): RoutingResult;
  settings(raw?: Partial<RoutingSettings>): RoutingSettings;
  defaults: RoutingSettings;
};
