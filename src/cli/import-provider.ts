import { Worker } from 'node:worker_threads';
import type { ImportResult } from '../import/import-core';

/** The worker has a deadline, so parser work cannot hold the CLI indefinitely. */
export function importInWorker(
  entry: URL,
  format: 'mermaid' | 'd2',
  source: string,
  title: string,
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(entry, {
      workerData: { kind: 'foreign-import', format, source, title },
      resourceLimits: { maxOldGenerationSizeMb: 512, stackSizeMb: 4 },
    });
    let done = false;
    const finish = (error?: Error, result?: ImportResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else resolve(result!);
    };
    const timer = setTimeout(() => finish(Error(`${format} import timed out.`)), 30000);
    worker.once('message', result => finish(undefined, result as ImportResult));
    worker.once('error', error => finish(error));
    worker.once('exit', code => finish(Error(`Import worker stopped with status ${code}.`)));
  });
}
