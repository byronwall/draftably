/**
 * The page's one render worker. Viewers share it: jobs run in order, and a job its viewer cancelled
 * before it started is skipped, so a burst of updates draws only the latest source.
 */
import { renderSvg } from './render';
import type { RenderOptions } from './types';

type Request = { id: number; source: string; options: RenderOptions } | { cancel: number };
const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<Request>) => void): void;
  postMessage(data: unknown): void;
};
const queue: Array<{ id: number; source: string; options: RenderOptions }> = [];
const cancelled = new Set<number>();
let draining = false;

async function drain() {
  while (queue.length) {
    // Yield, so cancels posted while the last job ran arrive before the next starts.
    await new Promise(resolve => setTimeout(resolve, 0));
    const { id, source, options } = queue.shift()!;
    if (cancelled.delete(id)) continue;
    try {
      scope.postMessage({ id, result: await renderSvg(source, options) });
    } catch {
      scope.postMessage({
        id,
        result: {
          ok: false,
          reason: 'internal',
          diagnostics: [
            {
              code: 'DRAFT_INTERNAL',
              severity: 'error',
              message: 'The diagram could not be rendered.',
              itemIds: [],
            },
          ],
        },
      });
    }
  }
  draining = false;
}

scope.addEventListener('message', event => {
  const data = event.data;
  if ('cancel' in data) {
    if (queue.some(job => job.id === data.cancel)) cancelled.add(data.cancel);
    return;
  }
  queue.push(data);
  if (draining) return;
  draining = true;
  void drain();
});
