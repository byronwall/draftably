import {
  ExplorerLab,
  type CandidateResult,
  type CandidateSpec,
  type ComparisonConfig,
} from '../engines/explorer-engine.js';
import { LayoutLab, type LayoutOptions, type LayoutResult } from '../engines/layout-engine.js';
import { SculptLab, type Timeline } from '../engines/sculpt-engine.js';
import { RouteLab } from '../engines/routing-engine.js';
import { compile } from '../dsl/compile';
import { projectScene } from '../dsl/project';
import type { Diagram } from '../model/types';

export type EngineTask =
  | { kind: 'layout'; doc: Diagram; options: LayoutOptions }
  | { kind: 'candidate'; baseline: Diagram; spec: CandidateSpec; config: ComparisonConfig }
  | { kind: 'timeline'; doc: Diagram; options: LayoutOptions }
  /** A diagram file variant, compiled exactly as the file would be. */
  | { kind: 'source'; source: string; spec: CandidateSpec };

export type EngineResult<T extends EngineTask> = T extends { kind: 'layout' }
  ? LayoutResult
  : T extends { kind: 'candidate' | 'source' }
    ? CandidateResult
    : Timeline;

export function runEngineTask(
  task: EngineTask,
): Promise<LayoutResult | CandidateResult | Timeline> {
  if (task.kind === 'layout') return LayoutLab.compute(task.doc, task.options);
  if (task.kind === 'candidate')
    return ExplorerLab.candidate(task.baseline, task.spec, task.config);
  if (task.kind === 'source') return compileCandidate(task.source, task.spec);
  return SculptLab.journey(task.doc, task.options);
}

/** Compile a source variant and route it with no prior routes, as the viewer and CLI do. */
async function compileCandidate(source: string, spec: CandidateSpec): Promise<CandidateResult> {
  const document = projectScene(await compile(source));
  const routing = RouteLab.compute(ExplorerLab.sceneInput(document), {
    ...document.settings.routing,
    previous: [],
  });
  return { spec, document, report: null, routing };
}

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
  }
}

export interface RunningTask<T> {
  promise: Promise<T>;
  /** Stop the computation. The promise rejects with `CancelledError`. */
  cancel(): void;
  /** `worker`, or `main thread` when workers are unavailable. */
  thread: () => string;
}

/**
 * Run an engine computation in a worker. If the browser blocks workers, the same computation
 * runs on the main thread instead.
 */
export function startEngineTask<T extends EngineTask>(
  input: T,
  { timeout }: { timeout?: number } = {},
): RunningTask<EngineResult<T>> {
  // Tasks may contain reactive store proxies, which workers cannot receive. Send plain data.
  const task: T = JSON.parse(JSON.stringify(input));
  let worker: Worker | null = null,
    timer: number | undefined,
    thread = 'worker',
    rejectRun: (error: Error) => void = () => {};
  const cleanup = () => {
    window.clearTimeout(timer);
    worker?.terminate();
    worker = null;
  };
  const fallback = () => {
    thread = 'main thread';
    return runEngineTask(task) as Promise<EngineResult<T>>;
  };
  const promise = new Promise<EngineResult<T>>((resolve, reject) => {
    rejectRun = reject;
    try {
      worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (error) {
      console.warn('[engine] Worker unavailable; computing on the main thread', error);
      fallback().then(resolve, reject);
      return;
    }
    if (timeout)
      timer = window.setTimeout(() => {
        cleanup();
        reject(
          Error(
            `Computation exceeded ${timeout / 1000} seconds. Try a smaller diagram or lower effort.`,
          ),
        );
      }, timeout);
    worker.onmessage = (
      e: MessageEvent<{ ok: boolean; result: EngineResult<T>; error: string }>,
    ) => {
      cleanup();
      if (e.data.ok) resolve(e.data.result);
      else reject(Error(e.data.error));
    };
    worker.onerror = e => {
      e.preventDefault();
      cleanup();
      console.warn('[engine] Worker failed to start; computing on the main thread', e.message);
      fallback().then(resolve, reject);
    };
    worker.postMessage(task);
  });
  return {
    promise,
    cancel() {
      cleanup();
      rejectRun(new CancelledError());
    },
    thread: () => thread,
  };
}
