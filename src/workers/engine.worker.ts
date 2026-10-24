import { runEngineTask, type EngineTask } from '../lib/engine-tasks';

// Layout, comparison and timeline computations run here so pointer input stays responsive.
// A message is a task, or `{ id, task }` from the long-lived worker, whose replies carry the id.
self.onmessage = async ({ data }: MessageEvent<EngineTask | { id: number; task: EngineTask }>) => {
  const id = 'id' in data ? data.id : undefined,
    task = 'id' in data ? data.task : data;
  try {
    self.postMessage({ id, ok: true, result: await runEngineTask(task) });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
