import { SculptLab } from '../engines/sculpt-engine.js';

self.onmessage = async ({ data }) => {
  try {
    const result = await SculptLab.journey(data.doc, data.opts);
    self.postMessage({ ok: true, data: result });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
