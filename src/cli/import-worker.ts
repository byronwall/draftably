import { parentPort, workerData } from 'node:worker_threads';
import type { ImportResult } from '../import/import-core';

/** Runs only inside the CLI worker, with input held in workerData. */
export async function runImportWorker(): Promise<void> {
  if (!parentPort) throw Error('Import worker has no parent.');
  globalThis.fetch = async () => {
    throw Error('Import resource loading is disabled.');
  };
  let result: ImportResult;
  if (workerData.format === 'mermaid') {
    const { JSDOM } = await import('jsdom');
    const { createMermaidFlowParser, makePlainLabel } = await import('../import/mermaid-facade');
    const { importMermaidFlow } = await import('../import/mermaid-importer');
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://import.invalid/',
    });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document });
    try {
      const parse = createMermaidFlowParser(async () => (await import('mermaid')).default);
      result = importMermaidFlow(
        await parse(workerData.source),
        makePlainLabel(dom.window.document),
        workerData.title,
      );
    } finally {
      dom.window.close();
    }
  } else {
    const { importD2Experimental } = await import('../import/d2-importer');
    result = await importD2Experimental(workerData.source, workerData.title);
  }
  parentPort.postMessage(result);
}
