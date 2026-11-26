/**
 * Mermaid input: the same importer the CLI's `draftably import` runs, on a linkedom document in
 * place of JSDOM. Mermaid's parser reads a few browser globals, so the first call installs a
 * small window; the isolate never renders HTML with it.
 */
import { CSSStyleDeclaration } from 'cssstyle';
import { parseHTML } from 'linkedom';
import { detectSource } from '../../../src/import/detect';
import type { ParseFlowResult } from '../../../src/import/mermaid-facade';
import { SourceError } from '../../../src/lib/render-url';
import { span } from './obs';

export type SourceType = 'draftably' | 'mermaid';

let parse: ((source: string) => Promise<ParseFlowResult>) | undefined;
let doc: Document | undefined;

/**
 * The source's language and the text to read: `type` when given, else Mermaid when it looks like
 * Mermaid. A Markdown document with one ```mermaid fence gives that fence's text, as the CLI's
 * import does.
 */
export function sourceType(
  source: string,
  type?: string | null,
): { type: SourceType; text: string } {
  if (type === 'draftably') return { type, text: source };
  if (type && type !== 'mermaid') throw new SourceError('type must be draftably or mermaid.');
  const found = detectSource(source, type ? { format: 'mermaid' } : {});
  if (found.status === 'detected' && (type || found.format === 'mermaid')) {
    // An explicit type keeps the whole text, unless it is one fence in Markdown.
    const fenced = type ? detectSource(source) : found;
    const text =
      fenced.status === 'detected' && fenced.via === 'fence' && fenced.format === 'mermaid'
        ? fenced.source
        : found.source;
    return { type: 'mermaid', text };
  }
  return { type: 'draftably', text: source };
}

/**
 * Whether the image depends on today's date: a Mermaid gantt chart, whose dates without a year,
 * or relative to today, import differently tomorrow. Its image is cached for a day, not a year.
 */
export const dated = (source: string, type?: string | null) =>
  sourceType(source, type).type === 'mermaid' && /^\s*gantt\b/m.test(source);

/**
 * For an image that depends on today's date: today's UTC date, for the cache key, and the
 * Cache-Control that ends at the next UTC midnight, when the drawing may change.
 */
export function freshness(source: string, type?: string | null, now = new Date()) {
  if (!dated(source, type)) return null;
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const seconds = Math.max(1, Math.floor((end - now.getTime()) / 1000));
  return { day: now.toISOString().slice(0, 10), cacheControl: `public, max-age=${seconds}` };
}

/** Mermaid's `box` parser tests a color with `new Option().style`; this is JSDOM's own parser. */
class Option {
  style = new CSSStyleDeclaration();
}

/** Draftably source for a Mermaid diagram, with the importer's warnings. */
export async function fromMermaid(source: string) {
  const [{ createMermaidFlowParser, makePlainLabel }, { importMermaidFlow }] = await Promise.all([
    import('../../../src/import/mermaid-facade'),
    import('../../../src/import/mermaid-importer'),
  ]);
  if (!doc) {
    const { window, document } = parseHTML('<!doctype html><html><body></body></html>');
    Object.assign(globalThis, { window, document, Option });
    Object.assign(window, { Option });
    doc = document as unknown as Document;
  }
  parse ??= createMermaidFlowParser(async () => (await import('mermaid')).default);
  // No title: an image heading the user did not write would be noise. Mermaid's own title stays.
  const result = importMermaidFlow(await parse(source), makePlainLabel(doc), '');
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
  const found = await span('source.detect', { given: type ?? 'none' }, s => {
    const found = sourceType(source, type);
    s.setAttribute('source_type', found.type);
    return found;
  });
  if (found.type !== 'mermaid') return { draft: source, warnings: [] as string[] };
  // `cold`: the first Mermaid call in this isolate also loads the parser.
  return span('mermaid.import', { source_bytes: found.text.length, cold: !parse }, async s => {
    const out = await fromMermaid(found.text);
    s.setAttribute('warnings', out.warnings.length);
    return out;
  });
}
