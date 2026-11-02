import { Worker } from 'node:worker_threads';
import { preflightMermaidFlow, type ParseFlowResult } from './mermaid-facade.js';

/** Compile to ESM .js before calling: the worker URL deliberately targets the emitted file. */
export async function parseMermaidFlowNode(source: string, timeoutMs = 5000): Promise<ParseFlowResult> {
  const diagnostics = preflightMermaidFlow(source);
  if (diagnostics.some((d) => d.severity === 'error')) return { ok: false, diagnostics };
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./mermaid-node-worker.js', import.meta.url), {
      workerData: { source }, resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
    });
    let settled = false;
    const finish = (result: ParseFlowResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, diagnostics: [{ code: 'IMPORT_TIMEOUT', severity: 'error', message: `Mermaid parsing exceeded ${timeoutMs} ms; the worker was terminated.` }] }), timeoutMs);
    worker.once('message', (result: ParseFlowResult) => finish(result));
    worker.once('error', (error) => finish({ ok: false, diagnostics: [{ code: 'MERMAID_WORKER_ERROR', severity: 'error', message: error instanceof Error ? error.message : String(error) }] }));
    worker.once('exit', (code) => {
      if (settled) return;
      finish({ ok: false, diagnostics: [{ code: 'MERMAID_WORKER_EXIT', severity: 'error', message: `Parser worker exited with status ${code} without a result.` }] });
    });
  });
}
