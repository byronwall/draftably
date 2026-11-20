/**
 * Mermaid or DOT text in the playground editor: the page draws the imported draft as a preview
 * and offers to convert the text, so a paste of another format is not just an error.
 */
import { detectSource, type KnownFormat } from '../../src/import/detect';

const NAMES: Partial<Record<KnownFormat, string>> = {
  mermaid: 'Mermaid',
  dot: 'Graphviz DOT',
  d2: 'D2',
  plantuml: 'PlantUML',
  dbml: 'DBML',
  nomnoml: 'nomnoml',
};

export interface Foreign {
  format: KnownFormat;
  name: string;
}

/** The other format this text is in, or null for draftably source and plain text. */
export function foreignFormat(text: string): Foreign | null {
  const found = detectSource(text);
  if (found.status !== 'detected' || found.format === 'native') return null;
  // A code node can hold a fenced block; only a paste that opens with the fence counts.
  if (found.via === 'fence' && !/^\s*(`{3}|~{3})/.test(text)) return null;
  return { format: found.format, name: NAMES[found.format] ?? found.format };
}

export interface Imported extends Foreign {
  /** The draftably source, or undefined when the import failed. */
  native?: string;
  warnings: string[];
  error?: string;
}

export async function importForeign(text: string, kind: Foreign): Promise<Imported> {
  if (!['mermaid', 'dot', 'd2'].includes(kind.format))
    return { ...kind, warnings: [], error: `${kind.name} import is not supported yet.` };
  try {
    const { importBrowser } = await import('../../src/import/browser');
    const result = await importBrowser(text);
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    const warnings = result.diagnostics.filter(d => d.severity === 'warning').map(d => d.message);
    if (!result.nativeSource || errors.length)
      return {
        ...kind,
        warnings,
        error: errors[0]?.message ?? `This ${kind.name} did not import.`,
      };
    return { ...kind, native: result.nativeSource, warnings };
  } catch (error) {
    return { ...kind, warnings: [], error: error instanceof Error ? error.message : String(error) };
  }
}
