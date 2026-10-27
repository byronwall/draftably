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
  /** Width of the header's icon and title from the group's left edge; the rest of the band is open. */
  titleWidth?: number;
  /** Height of the title band the router keeps clear; 28 when unset. */
  titleHeight?: number;
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
  tidied?: number;
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
  /** A reading direction for every edge without its own `cfg.flow`; forward edges run along it. */
  direction?: 'right' | 'down';
  /**
   * Keep fans on the sides facing their other ends, off far sides, and a full standoff away
   * from their own end boxes. On unless false.
   */
  facing?: boolean;
  /**
   * Keep lines out of a group's title band, except a line straight into or out of a member's
   * top. On unless false.
   */
  titleBands?: boolean;
  /** Even out ports, fans and corridors after routing. On unless false. */
  tidy?: boolean;
  /**
   * In the tidy pass, straighten steps under 12px by sliding a run (and its port, or through a
   * fold lane's waypoints) onto the next. On unless false.
   */
  jogs?: boolean;
}

export const RouteLab: {
  compute(input: RouteInput, options?: RoutingOptions): RoutingResult;
  settings(raw?: Partial<RoutingSettings>): RoutingSettings;
  defaults: RoutingSettings;
};
