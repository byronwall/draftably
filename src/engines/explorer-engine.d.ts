import type { Diagram, LayoutAlgorithmId, LayoutIntent } from '../model/types';
import type { LayoutReport, LayoutScope } from './layout-engine';
import type { PriorRoute, RouteInput, RoutingResult } from './routing-engine';

export type ParamValue = string | number | boolean;

export interface ParamDefinition {
  name: string;
  values: ParamValue[];
  passOnly?: boolean;
}

export type ComparisonMode = 'layout' | 'routing';
export type ComparisonRun = 'rebuild' | 'warm' | 'pass';

export interface ComparisonConfig {
  mode: ComparisonMode;
  kind: 'algorithms' | 'parameters';
  algorithm: LayoutAlgorithmId;
  algorithms: LayoutAlgorithmId[];
  axisA: string;
  valuesA: string;
  axisB: string;
  valuesB: string;
  run: ComparisonRun;
  maxIterations: number;
  scope: LayoutScope;
  autoPorts: boolean;
  selected: string[];
  containerId?: string;
  fixedIds: string[];
  intent: LayoutIntent;
  viewport: { w: number; h: number };
  priorRoutes: PriorRoute[];
}

export interface CandidateSpec {
  key: string;
  title: string;
  subtitle: string;
  patch: Record<string, ParamValue>;
}

export interface CandidateResult {
  spec: CandidateSpec;
  document: Diagram;
  report: LayoutReport | null;
  routing: RoutingResult;
}

export const ExplorerLab: {
  layoutParams: Record<string, ParamDefinition>;
  routeParams: Record<string, ParamDefinition>;
  parseValues(key: string, text: string, mode?: ComparisonMode): ParamValue[];
  effectiveParams(
    algorithm: LayoutAlgorithmId,
    run: ComparisonRun,
  ): Record<string, ParamDefinition>;
  specs(config: ComparisonConfig): CandidateSpec[];
  sceneInput(doc: Diagram): RouteInput;
  candidate(
    baseline: Diagram,
    spec: CandidateSpec,
    config: ComparisonConfig,
  ): Promise<CandidateResult>;
};
