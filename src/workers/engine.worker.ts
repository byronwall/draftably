import { runEngineTask, type EngineTask } from '../lib/engine-tasks';

// Layout, comparison and timeline computations run here so pointer input stays responsive.
self.onmessage = async ({ data }: MessageEvent<EngineTask>) => {
  try {
    self.postMessage({ ok: true, result: await runEngineTask(data) });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
