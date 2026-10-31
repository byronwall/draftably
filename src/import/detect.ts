/** A bounded dispatcher, not a parser. Ambiguous plain text never becomes D2 by guess. */
export type KnownFormat = 'native' | 'mermaid' | 'dot' | 'd2' | 'plantuml' | 'dbml' | 'nomnoml';
export interface DetectedSource {
  status: 'detected';
  format: KnownFormat;
  source: string;
  via: 'explicit' | 'extension' | 'fence' | 'signature';
  /** One-based source line where the extracted content begins. */
  startLine: number;
}
export interface FencedSource {
  format: KnownFormat;
  source: string;
  startLine: number;
}
export type Detection =
  | DetectedSource
  | { status: 'choose-fence'; blocks: FencedSource[] }
  | { status: 'unknown'; reason: string };

const aliases: Record<string, KnownFormat> = {
  draft: 'native',
  draftably: 'native',
  mmd: 'mermaid',
  mermaid: 'mermaid',
  dot: 'dot',
  gv: 'dot',
  graphviz: 'dot',
  d2: 'd2',
  puml: 'plantuml',
  plantuml: 'plantuml',
  pu: 'plantuml',
  iuml: 'plantuml',
  dbml: 'dbml',
  nomnoml: 'nomnoml',
};
const alias = (value: string): KnownFormat | undefined =>
  Object.hasOwn(aliases, value) ? aliases[value] : undefined;

/** Focused conventional fences: <=3 leading spaces, backticks or tildes, closed.
 * A Markdown document is never sent wholesale to a diagram parser.
 * This intentionally does not implement every CommonMark container rule.
 */
export function fencedSources(text: string): FencedSource[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const blocks: FencedSource[] = [];
  let open:
    | { mark: string; length: number; format?: KnownFormat; startLine: number; body: string[] }
    | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!open) {
      const match = /^ {0,3}(\u0060{3,}|~{3,})(.*)$/.exec(line);
      if (!match) continue;
      const word = match[2]!.trim().split(/\s+/)[0]!.toLowerCase();
      open = {
        mark: match[1]![0]!,
        length: match[1]!.length,
        format: alias(word),
        startLine: i + 2,
        body: [],
      };
    } else {
      const trimmed = line.replace(/^ {0,3}/, '');
      const closing = trimmed.trimEnd();
      if (closing.length >= open.length && [...closing].every(c => c === open!.mark)) {
        if (open.format)
          blocks.push({
            format: open.format,
            source: open.body.join('\n'),
            startLine: open.startLine,
          });
        open = undefined;
      } else open.body.push(line);
    }
  }
  return blocks;
}

function signature(source: string): KnownFormat | undefined {
  // Only leading comment forms are skipped; the parser still receives the original text.
  const head = source
    .replace(/^\uFEFF/, '')
    .replace(/^(?:\s|\/\/[^\n]*(?:\n|$)|%%[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/, '');
  if (/^diagram\s+"/.test(head)) return 'native';
  if (
    /^(?:strict\s+)?(?:di)?graph(?:\s+(?:"(?:\\.|[^"\\])*"|[A-Za-z_\u0080-\uFFFF][\w\u0080-\uFFFF]*|-?(?:\.\d+|\d+(?:\.\d*)?)))?\s*\{/.test(
      head,
    )
  )
    return 'dot';
  if (
    /^(?:flowchart|graph)\s+(?:TB|TD|BT|LR|RL)\b/.test(head) ||
    /^(?:sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|journey|pie|mindmap|timeline|gitGraph|xychart-beta|block-beta|architecture-beta|sankey-beta|quadrantChart|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/.test(
      head,
    )
  )
    return 'mermaid';
  if (/^@start(?:uml|mindmap|wbs|gantt|json|yaml)\b/i.test(head)) return 'plantuml';
  if (/^(?:Table|TableGroup|Enum|Project)\s+[A-Za-z_][\w.]*\s*\{/i.test(head)) return 'dbml';
  return undefined;
}

export function detectSource(
  source: string,
  options: { filename?: string; format?: KnownFormat } = {},
): Detection {
  if (options.format)
    return { status: 'detected', format: options.format, source, via: 'explicit', startLine: 1 };
  const basename = options.filename?.split(/[\\/]/).at(-1) ?? '';
  const extension = basename.includes('.') ? basename.split('.').at(-1)!.toLowerCase() : '';
  const byExtension = alias(extension);
  if (byExtension)
    return { status: 'detected', format: byExtension, source, via: 'extension', startLine: 1 };
  const blocks = fencedSources(source);
  if (blocks.length === 1) return { status: 'detected', ...blocks[0]!, via: 'fence' };
  if (blocks.length > 1) return { status: 'choose-fence', blocks };
  const format = signature(source);
  if (format) return { status: 'detected', format, source, via: 'signature', startLine: 1 };
  return {
    status: 'unknown',
    reason: 'Choose a format. Short D2, nomnoml, and ordinary text are ambiguous.',
  };
}
