/**
 * Mermaid input: the same importer the CLI's `draftably import` runs, on a linkedom document in
 * place of JSDOM. Mermaid's parser reads a few browser globals, so the first call installs a
 * small window; the isolate never renders HTML with it.
 */
import { parseHTML } from 'linkedom';
import { detectSource } from '../../../src/import/detect';
import type { ParseFlowResult } from '../../../src/import/mermaid-facade';
import { SourceError } from '../../../src/lib/render-url';

export type SourceType = 'draftably' | 'mermaid';

let parse: ((source: string) => Promise<ParseFlowResult>) | undefined;
let doc: Document | undefined;

/** The source's language: `type` when given, else Mermaid when it looks like Mermaid. */
export function sourceType(source: string, type?: string | null): SourceType {
  if (type === 'mermaid' || type === 'draftably') return type;
  if (type) throw new SourceError('type must be draftably or mermaid.');
  const found = detectSource(source);
  return found.status === 'detected' && found.format === 'mermaid' ? 'mermaid' : 'draftably';
}

/** Draftably source for a Mermaid diagram, with the importer's warnings. */
export async function fromMermaid(source: string) {
  const [{ createMermaidFlowParser, makePlainLabel }, { importMermaidFlow }] = await Promise.all([
    import('../../../src/import/mermaid-facade'),
    import('../../../src/import/mermaid-importer'),
  ]);
  if (!doc) {
    const { window, document } = parseHTML('<!doctype html><html><body></body></html>');
    // Mermaid's `box` parser tests a color with `new Option()`.
    Object.assign(globalThis, { window, document, Option: window.Option });
    doc = document as unknown as Document;
  }
  parse ??= createMermaidFlowParser(async () => (await import('mermaid')).default);
  const found = detectSource(source, { format: 'mermaid' });
  if (found.status !== 'detected') throw new SourceError('This is not a Mermaid diagram.');
  // No title: an image heading the user did not write would be noise. Mermaid's own title stays.
  const result = importMermaidFlow(await parse(found.source), makePlainLabel(doc), '');
  if (!result.nativeSource || result.status === 'failed') {
    const d = result.diagnostics.find(x => x.severity === 'error') ?? result.diagnostics[0];
    throw new SourceError(d?.message ?? 'The Mermaid diagram could not be converted.');
  }
  return {
    draft: result.nativeSource,
    warnings: result.diagnostics.filter(d => d.severity === 'warning').map(d => d.message),
  };
}

/** Draftably source for `source` in either language. */
export async function toDraft(source: string, type?: string | null) {
  return sourceType(source, type) === 'mermaid'
    ? fromMermaid(source)
    : { draft: source, warnings: [] as string[] };
}
