import type { Diagram, LayoutSettings, NodeGeometry, Point } from '../model/types';
import type { LayoutMetrics, LayoutOptions, LayoutReport } from './layout-engine';

export type BrushMode = 'tidy' | 'flow' | 'space' | 'restore' | 'protect';

export interface BrushSettings {
  radius: number;
  strength: number;
  softness: number;
  step: number;
  mode: BrushMode;
  holdRestored: boolean;
}

export interface DabOptions extends Partial<BrushSettings> {
  point?: Point;
  worldRadius?: number;
  reference?: NodeGeometry | null;
  protectedIds?: string[];
}

export interface DabResult {
  document: Diagram;
  weights: Record<string, number>;
  locked: string[];
  moved: string[];
  maxDisplacement: number;
  blocked: boolean;
  attenuation?: number;
  mode: BrushMode;
}

export interface TimelineFrame {
  nodes: NodeGeometry;
  iteration: number;
  phase: string;
  metrics: LayoutMetrics;
  index: number;
  moved: number;
  travel: number;
  cumulative: number;
  maxMove: number;
}

export interface TimelineBookmark {
  index: number;
  title: string;
}

export interface Timeline {
  schemaVersion: 1;
  kind: 'diagram-studio-journey';
  baseline: Diagram;
  settings: LayoutSettings;
  execution: Record<string, unknown>;
  report: LayoutReport;
  frames: TimelineFrame[];
  finalDocument: Diagram;
  bookmarks: TimelineBookmark[];
  createdAt: string;
  /** Added by the app: routes in effect when the timeline was recorded. */
  routePrior?: unknown[];
}

export const SculptLab: {
  defaults: BrushSettings;
  settings(input?: Partial<BrushSettings>): BrushSettings;
  dab(input: Diagram, options?: DabOptions): DabResult;
  journey(input: Diagram, options?: LayoutOptions): Promise<Timeline>;
  lookahead(frames: TimelineFrame[], index: number, pixels?: number, scale?: number): number;
};
