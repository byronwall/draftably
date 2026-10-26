/**
 * Merge two versions of a diagram into one file with change marks (`+`, `-`, `~`), matching
 * nodes, groups and edges by ID. The result is the newer file, statement for statement, with
 * removed declarations put back where they stood in the older one, so a reader sees one drawing
 * that holds both versions instead of two near-identical files.
 */
import {
  DslError,
  parseModel,
  printSource,
  quoted,
  readSource,
  type ModelEdge,
  type ModelObject,
  type SourceLine,
  type Statement,
} from './syntax';

const DECLARATIONS = ['node', 'group', 'edge'];

/** Differences that make a declaration `~`; the layout and labels it implies, not its line. */
const objectKey = (o: ModelObject) => [o.label, o.parent, o.color, o.shade, o.shape].join('\0');
const edgeKey = (e: ModelEdge) => [e.source, e.target, e.label, e.dashed, e.from, e.to].join('\0');

const keyOf = (s: Statement) => (s.command === 'edge' ? 'edge:' : 'object:') + s.args[0]?.value;

export function compareSources(before: string, after: string): string {
  const docs = [readSource(before), readSource(after)];
  for (const doc of docs)
    for (const s of doc.lines)
      if (s.kind === 'statement' && s.mark)
        throw new DslError('Compare plain files; this one already has change marks.', s.line);
  const [old, next] = [parseModel(docs[0]), parseModel(docs[1])];
  const was = new Map<string, { key: string; label: string }>([
    ...old.objects.map(o => ['object:' + o.id, { key: objectKey(o), label: o.label }] as const),
    ...old.edges.map(e => ['edge:' + e.id, { key: edgeKey(e), label: e.label }] as const),
  ]);
  const now = new Map<string, string>([
    ...next.objects.map(o => ['object:' + o.id, objectKey(o)] as const),
    ...next.edges.map(e => ['edge:' + e.id, edgeKey(e)] as const),
  ]);
  const scopes = new Set(next.layouts.map(l => l.scope));

  const out: SourceLine[] = [];
  for (const line of docs[1].lines) {
    if (line.kind !== 'statement' || !DECLARATIONS.includes(line.command)) {
      out.push(line);
      continue;
    }
    const prior = was.get(keyOf(line));
    if (!prior) out.push({ ...line, mark: '+' });
    else if (prior.key !== now.get(keyOf(line))) {
      const label = line.args[line.command === 'edge' ? 4 : 1]?.value ?? '';
      out.push({
        ...line,
        mark: '~',
        attrs: label !== prior.label ? [...line.attrs, ['was', quoted(prior.label)]] : line.attrs,
      });
    } else out.push(line);
  }

  // Put each removed declaration back after the declaration that preceded it in the older file,
  // and keep the older layout line of a removed group so its contents arrange as they did.
  let anchor = -1;
  for (const line of docs[0].lines) {
    if (line.kind !== 'statement') continue;
    const scope = line.args[0]?.value,
      removedLayout =
        line.command === 'layout' &&
        !scopes.has(scope) &&
        !now.has('object:' + scope) &&
        old.objects.some(o => o.id === scope);
    if (removedLayout) {
      out.push(line);
      continue;
    }
    if (!DECLARATIONS.includes(line.command)) continue;
    const key = keyOf(line);
    if (now.has(key)) {
      anchor = out.findIndex(
        l => l.kind === 'statement' && DECLARATIONS.includes(l.command) && keyOf(l) === key,
      );
      continue;
    }
    const removed: Statement = { ...line, mark: '-', comment: undefined };
    if (anchor < 0) {
      const first = out.findIndex(l => l.kind === 'statement' && DECLARATIONS.includes(l.command));
      anchor = (first < 0 ? out.length : first) - 1;
    }
    out.splice(anchor + 1, 0, removed);
    anchor += 1;
  }
  const merged = printSource({ lines: out });
  parseModel(merged);
  return merged;
}
