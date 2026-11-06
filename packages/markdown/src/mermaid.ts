import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import type { Diagnostic } from '@draftably/runtime';

/**
 * Mermaid fences that Draftably draws natively. Mermaid's parser needs a DOM, so it runs with
 * jsdom in one worker thread per process. The parser picks the family; this only skips the worker
 * for fences that are plainly another family.
 */
const CANDIDATE = /^(?:flowchart|graph|sequenceDiagram)\b/;

export function isMermaidCandidate(text: string): boolean {
  const lines = text.replace(/^\uFEFF/, '').split('\n');
  let i = 0;
  if (lines[0]?.trim() === '---') {
    i = lines.findIndex((line, n) => n > 0 && line.trim() === '---') + 1;
    if (i === 0) return false;
  }
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('%%')) continue;
    return CANDIDATE.test(line);
  }
  return false;
}

interface Reply {
  id: number;
  source?: string;
  alt?: string;
  messages: string[];
}

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, (reply: Reply) => void>();

function start(): Worker {
  const created = new Worker(new URL(import.meta.url), {
    workerData: { kind: 'draftably-mermaid' },
    resourceLimits: { maxOldGenerationSizeMb: 512, stackSizeMb: 4 },
  });
  created.unref();
  const fail = (message: string) => {
    worker = undefined;
    for (const [id, resolve] of pending) resolve({ id, messages: [message] });
    pending.clear();
  };
  created.on('message', (reply: Reply) => {
    pending.get(reply.id)?.(reply);
    pending.delete(reply.id);
  });
  created.on('error', error => fail(`Mermaid parser failed: ${error.message}`));
  created.on('exit', code => fail(`Mermaid parser stopped with status ${code}.`));
  return created;
}

/** Native source for a Mermaid flowchart or sequence, or null to leave the fence to Mermaid. */
export async function convertMermaid(
  text: string,
  location: Diagnostic['location'],
): Promise<{ source: string | null; alt?: string; diagnostics: Diagnostic[] }> {
  if (!isMermaidCandidate(text)) return { source: null, diagnostics: [] };
  worker ??= start();
  const id = nextId++;
  const active = worker;
  const reply = await new Promise<Reply>(resolve => {
    const timer = setTimeout(() => {
      pending.delete(id);
      void active.terminate();
      resolve({ id, messages: ['Mermaid parsing timed out.'] });
    }, 30000);
    pending.set(id, value => {
      clearTimeout(timer);
      resolve(value);
    });
    active.ref();
    active.postMessage({ id, text });
  }).finally(() => {
    if (!pending.size) active.unref();
  });
  return {
    source: reply.source ?? null,
    alt: reply.alt,
    diagnostics: reply.source
      ? []
      : [
          {
            code: 'DRAFT_MERMAID',
            severity: 'warning',
            message: `Left this Mermaid fence to Mermaid: ${reply.messages.join(' ') || 'it could not be converted.'}`,
            location,
            itemIds: [],
          },
        ],
  };
}

async function runWorker(): Promise<void> {
  globalThis.fetch = async () => {
    throw Error('Mermaid resource loading is disabled.');
  };
  const { JSDOM } = await import('jsdom');
  const { createMermaidFlowParser, makePlainLabel } =
    await import('../../../src/import/mermaid-facade');
  const { importMermaidFlow } = await import('../../../src/import/mermaid-importer');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://import.invalid/',
  });
  // Mermaid's `box` parser tests its color with `new Option()`.
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Option: dom.window.Option,
  });
  const parse = createMermaidFlowParser(async () => (await import('mermaid')).default);
  const plain = makePlainLabel(dom.window.document);
  parentPort!.on('message', async ({ id, text }: { id: number; text: string }) => {
    let reply: Reply;
    try {
      const parsed = await parse(text);
      const snapshot = parsed.ok ? parsed.snapshot : undefined;
      // Mermaid draws no heading unless the source has a title, so only alt text names the family.
      const title = snapshot?.family === 'sequence' ? (snapshot.title ?? '') : '';
      const alt = title || (snapshot?.family === 'sequence' ? 'Sequence diagram' : 'Flowchart');
      const result = importMermaidFlow(parsed, plain, title);
      reply = {
        id,
        source: result.nativeSource,
        alt,
        messages: result.diagnostics.filter(d => d.severity === 'error').map(d => d.message),
      };
    } catch (error) {
      reply = { id, messages: [error instanceof Error ? error.message : String(error)] };
    }
    parentPort!.postMessage(reply);
  });
}

if (!isMainThread && workerData?.kind === 'draftably-mermaid') void runWorker();
