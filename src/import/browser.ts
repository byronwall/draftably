import { detectSource } from './detect';
import type { ImportResult } from './import-core';
import type { ParseFlowResult } from './mermaid-facade';

let mermaidParser: ((source: string) => Promise<ParseFlowResult>) | undefined;

/** Convert a supported text diagram without changing the current document. */
export async function importBrowser(source: string, filename = ''): Promise<ImportResult> {
  const detected = detectSource(source, { filename });
  if (detected.status === 'choose-fence')
    throw Error('This file has more than one diagram. Open one diagram at a time.');
  if (detected.status !== 'detected' || !['dot', 'mermaid', 'd2'].includes(detected.format))
    throw Error('Choose a DOT, Mermaid or D2 diagram file.');
  const title = filename.replace(/\.[^.]+$/, '') || 'Imported diagram';
  if (detected.format === 'dot') {
    const { importDot } = await import('./dot-importer');
    return importDot(detected.source, title);
  }
  if (detected.format === 'mermaid') {
    const { createMermaidFlowParser, makePlainLabel } = await import('./mermaid-facade');
    const { importMermaidFlow } = await import('./mermaid-importer');
    mermaidParser ??= createMermaidFlowParser(async () => (await import('mermaid')).default);
    return importMermaidFlow(await mermaidParser(detected.source), makePlainLabel(document), title);
  }
  return importD2InWorker(detected.source, title);
}

function importD2InWorker(source: string, title: string): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/import-d2.worker.ts', import.meta.url), {
      type: 'module',
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Error('D2 import timed out.'));
    }, 30000);
    worker.onmessage = (event: MessageEvent<ImportResult>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = event => {
      clearTimeout(timer);
      worker.terminate();
      reject(Error(event.message || 'D2 import could not start.'));
    };
    worker.postMessage({ source, title });
  });
}
