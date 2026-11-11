/**
 * What every viewer on a page shares: one render worker and one font registry. A page with 20
 * diagrams starts one worker and loads each font face once.
 */
import type { RenderOptions, RenderResult } from './types';

type Reply = { id: number; result: RenderResult };
type Job = {
  resolve: (result: RenderResult) => void;
  reject: (error: Error) => void;
  timer: number;
};
type Pool = { worker: Worker; jobs: Map<number, Job>; idle?: number };

/** A worker with no jobs for this long ends; the next update starts a new one. */
const IDLE_MS = 30_000;
const pools = new Map<(() => Worker) | undefined, Pool>();
let nextId = 0;

const defaultWorker = () =>
  new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });

function end(create: (() => Worker) | undefined, pool: Pool, error?: Error) {
  if (pools.get(create) === pool) pools.delete(create);
  clearTimeout(pool.idle);
  pool.worker.terminate();
  for (const job of pool.jobs.values()) {
    clearTimeout(job.timer);
    job.reject(error ?? new Error('Viewer render worker stopped.'));
  }
  pool.jobs.clear();
}

function poolFor(create: (() => Worker) | undefined): Pool {
  const existing = pools.get(create);
  if (existing) return existing;
  let worker: Worker;
  try {
    worker = (create ?? defaultWorker)();
  } catch (error) {
    throw new Error(
      `Viewer render worker could not start${error instanceof Error ? `: ${error.message}` : ''}. ${WORKER_HELP}`,
      { cause: error },
    );
  }
  const pool: Pool = { worker, jobs: new Map() };
  pools.set(create, pool);
  worker.addEventListener('message', (event: MessageEvent<Reply>) => {
    const job = pool.jobs.get(event.data?.id);
    if (!job) return;
    pool.jobs.delete(event.data.id);
    clearTimeout(job.timer);
    job.resolve(event.data.result);
    if (!pool.jobs.size) pool.idle = setTimeout(() => end(create, pool), IDLE_MS) as never;
  });
  worker.addEventListener('error', event => {
    event.preventDefault();
    end(
      create,
      pool,
      new Error(`${event.message || 'Viewer render worker failed.'} ${WORKER_HELP}`),
    );
  });
  worker.addEventListener('messageerror', () =>
    end(create, pool, new Error('Viewer render worker returned an unreadable result.')),
  );
  return pool;
}

/** Names the worker and the usual fix, so "worker failed" is not a dead end. */
export const WORKER_HELP =
  "The worker is the module next to @draftably/runtime's viewer. With Vite, add optimizeDeps: { exclude: ['@draftably/runtime'] } to vite.config.";

/**
 * Render in the page's worker. An aborted job is cancelled in the worker if it has not started.
 * A job over `timeoutMs` stops the worker, and with it every job it holds.
 */
export function renderInWorker(
  source: string,
  options: RenderOptions,
  {
    create,
    timeoutMs = 5000,
    signal,
  }: {
    create?: () => Worker;
    timeoutMs?: number;
    signal?: AbortSignal;
  },
): Promise<RenderResult> {
  return new Promise((resolve, reject) => {
    let pool: Pool;
    try {
      pool = poolFor(create);
    } catch (error) {
      reject(error);
      return;
    }
    const id = ++nextId;
    clearTimeout(pool.idle);
    const done = () => signal?.removeEventListener('abort', abort);
    const abort = () => {
      if (!pool.jobs.delete(id)) return;
      clearTimeout(timer);
      pool.worker.postMessage({ cancel: id });
      reject(new Error('Viewer render was aborted.'));
    };
    const timer = setTimeout(
      () => end(create, pool, new Error('Viewer render worker timed out.')),
      timeoutMs,
    ) as unknown as number;
    pool.jobs.set(id, {
      timer,
      resolve: result => (done(), resolve(result)),
      reject: error => (done(), reject(error)),
    });
    signal?.addEventListener('abort', abort, { once: true });
    pool.worker.postMessage({ id, source, options });
  });
}

type Face = { face: FontFace; refs: number };
const fonts = new WeakMap<Document, Map<string, Face>>();

/** The page's registered face for `key`, if any. */
export const sharedFace = (doc: Document, key: string) => fonts.get(doc)?.get(key)?.face;

/** Take a reference to `face` under `key`, adding it to the page on first use. */
export function retainFace(doc: Document, key: string, face: FontFace) {
  const page = fonts.get(doc) ?? new Map<string, Face>();
  fonts.set(doc, page);
  const held = page.get(key);
  if (held) return void held.refs++;
  doc.fonts.add(face);
  page.set(key, { face, refs: 1 });
}

/** Drop a reference; the last one removes the face from the page. */
export function releaseFace(doc: Document, key: string) {
  const page = fonts.get(doc),
    held = page?.get(key);
  if (!held || --held.refs > 0) return;
  doc.fonts.delete(held.face);
  page!.delete(key);
}

/** Tests only: stop every worker and forget every face, as a new page would. */
export function resetPageShared() {
  for (const [create, pool] of [...pools]) end(create, pool);
  fonts.delete(globalThis.document);
}
