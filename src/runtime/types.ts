export type Severity = 'error' | 'warning' | 'info';

export interface SourceLocation {
  sourceId?: string;
  line: number;
  column?: number;
}

export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  location?: SourceLocation;
  itemIds: readonly string[];
  nativeCode?: string;
}

export interface CompileLimits {
  maxSourceChars: number;
  maxSourceBytes: number;
  maxObjects: number;
  maxEdges: number;
  maxDepth: number;
}

export interface RenderLimits extends CompileLimits {
  maxOutputBytes: number;
}

export interface RenderOptions {
  state?: string | null;
  sourceId?: string;
  signal?: AbortSignal;
  limits?: Partial<RenderLimits>;
}

export interface ValidateOptions {
  sourceId?: string;
  signal?: AbortSignal;
  limits?: Partial<CompileLimits>;
}

export interface ItemSummary {
  id: string;
  kind: 'node' | 'group' | 'edge';
  label: string;
  line: number;
  from?: string;
  to?: string;
}

export interface DiagramSummary {
  title: string;
  width: number;
  height: number;
  viewBox: readonly [number, number, number, number];
  items: readonly ItemSummary[];
  states: readonly { id: string; label: string }[];
  activeState: string | null;
}

export interface RenderedDiagram extends DiagramSummary {
  svg: string;
}

export type RenderFailure = {
  ok: false;
  reason: 'input' | 'limit' | 'aborted' | 'internal';
  diagnostics: readonly Diagnostic[];
};

export type RenderResult =
  { ok: true; value: RenderedDiagram; diagnostics: readonly Diagnostic[] } | RenderFailure;

export type ValidationResult = { ok: true; diagnostics: readonly Diagnostic[] } | RenderFailure;
