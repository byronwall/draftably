import { parentPort, workerData } from 'node:worker_threads';
import { JSDOM } from 'jsdom';
import { createMermaidFlowParser } from './mermaid-facade.js';

if (!parentPort) throw new Error('This module must run inside an import worker.');
// JSDOM defaults: no scripts and no subresource loading. Never enable resources: usable or runScripts.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://import.invalid/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document });
// Imports are local installed modules; diagram text must not trigger fetch.
globalThis.fetch = async () => { throw new Error('Import resource loading is disabled.'); };
const parse = createMermaidFlowParser(async () => (await import('mermaid')).default);
try {
  parentPort.postMessage(await parse(String(workerData.source)));
} finally {
  dom.window.close();
}
