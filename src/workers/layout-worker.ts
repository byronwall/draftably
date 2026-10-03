import { LayoutLab } from '../engines/layout-engine.js';

self.onmessage = async ({ data }) => {
  try {
    const result = await LayoutLab.compute(data.doc, data.opts);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
