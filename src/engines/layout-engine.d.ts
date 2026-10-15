import type {
  Diagram,
  IntentPlacement,
  LayoutAlgorithmId,
  LayoutIntent,
  LayoutSettings,
  NodeGeometry,
  Point,
} from '../model/types';

export type LayoutSettingKey =
  | 'boundaryPull'
  | 'hierarchySweeps'
  | 'groupGap'
  | 'rankGap'
  | 'edgeLength'
  | 'repulsion'
  | 'flowStrength'
  | 'alignment'
  | 'compactness'
  | 'gridStrength'
  | 'ordering'
  | 'fold'
  | 'rootId';

export interface LayoutAlgorithm {
  id: LayoutAlgorithmId;
  name: string;
  family: string;
  short: string;
  detail: string;
  controls: LayoutSettingKey[];
}

export interface LayoutMetrics {
  overlaps: number;
  overlapArea: number;
  width: number;
  height: number;
  aspect: number;
  area: number;
  linkLength: number;
}

export type LayoutScope = 'all' | 'selection' | 'neighbourhood' | 'container';

export interface LayoutOptions extends Partial<LayoutSettings> {
  scope?: LayoutScope;
  containerId?: string;
  selected?: string[];
  fixedIds?: string[];
  viewport?: { w: number; h: number };
  warmStart?: boolean;
  settle?: boolean;
  maxIterations?: number;
  trace?: boolean;
  rebuild?: boolean;
}

export type Termination = 'settled' | 'objective plateau' | 'iteration limit' | 'bounded pass';

export interface LayoutReport {
  intent: Array<{
    role: string;
    id: string;
    placement: IntentPlacement;
    error: number;
    satisfied: boolean;
    pinned: boolean;
  }>;
  backwardEdges: number;
  directedEdges: number;
  feedbackEdges: number;
  algorithm: LayoutAlgorithmId;
  name: string;
  mode: 'pass' | 'rebuild' | 'journey';
  scope: LayoutScope;
  moved: number;
  maxDisplacement: number;
  rmsDisplacement: number;
  movementLimit: number | null;
  iterations: number;
  batches: number;
  before: LayoutMetrics;
  after: LayoutMetrics;
  warnings: string[];
  milliseconds: number;
  deterministic: boolean;
  termination: Termination;
  solverStops: Array<{ reason: string }>;
  /** Added by the app: where the computation ran. */
  thread?: string;
  /** Added by the app when a timeline step is kept. */
  selectedStep?: number;
}

export interface TraceFrame {
  nodes: NodeGeometry;
  iteration: number;
  phase: string;
  metrics: LayoutMetrics;
}

export interface LayoutResult {
  document: Diagram;
  report: LayoutReport;
  trace?: TraceFrame[];
}

export const LayoutLab: {
  algorithms: LayoutAlgorithm[];
  defaults: LayoutSettings;
  settings(values?: object): LayoutSettings;
  compute(doc: Diagram, opts: LayoutOptions): Promise<LayoutResult>;
  normalizeIntent(raw: unknown, validIds?: Set<string> | null): LayoutIntent;
  placements: Record<IntentPlacement, [number, number]>;
  topology(items: Array<{ id: string }>, edges: unknown[], intent?: LayoutIntent): unknown;
};

export type { Point };
