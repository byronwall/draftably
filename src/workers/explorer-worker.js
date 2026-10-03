import { ExplorerLab } from '../engines/explorer-engine.js';

self.onmessage = async ({ data }) => {
  try {
    const result = await ExplorerLab.candidate(data.baseline, data.spec, data.config);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, message: error instanceof Error ? error.message : String(error) });
  }
};
