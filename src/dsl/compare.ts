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

/**
 * Merge two plain versions into one marked file. `moved` lists groups that changed container:
 * they keep one position, so the older panel draws them in their new container.
 */
export function compareSources(before: string, after: string): string {
  return compareDetailed(before, after).merged;
}

export function compareDetailed(before: string, after: string) {
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
  // A node in another container, or an edge that joins other objects or touches such a node, is
  // a different thing in each version: the old one is removed under a spare ID and the new one
  // added, so each panel draws its own and the merged drawing shows the move.
  const taken = new Set([...was.keys(), ...now.keys()]),
    spare = (kind: string, id: string) => {
      let n = `${id}-was`;
      for (let i = 2; taken.has(kind + n); i++) n = `${id}-was${i}`;
      taken.add(kind + n);
      return n;
    };
  const parentMoved = next.objects.filter(o =>
      old.objects.some(p => p.id === o.id && p.parent !== o.parent),
    ),
    movedNodes = new Map(
      parentMoved.filter(o => o.type === 'node').map(o => [o.id, spare('object:', o.id)]),
    ),
    moved = parentMoved.filter(o => o.type === 'group').map(o => o.id);
  const ends = (e: ModelEdge) => e.source + '\0' + e.target,
    split = new Set([
      ...[...movedNodes.keys()].map(id => 'object:' + id),
      ...next.edges
        .filter(e =>
          old.edges.some(
            o =>
              o.id === e.id &&
              (ends(o) !== ends(e) || [o.source, o.target].some(id => movedNodes.has(id))),
          ),
        )
        .map(e => 'edge:' + e.id),
    ]);
  // A removed line, joined to the old copies of moved nodes; a split one also takes a spare ID.
  const removedLine = (line: Statement): Statement => {
    const args = line.args.map(w => ({ ...w })),
      own = split.has(keyOf(line));
    if (line.command === 'edge') {
      if (own) args[0].value = spare('edge:', args[0].value);
      for (const i of [1, 3]) args[i].value = movedNodes.get(args[i].value) ?? args[i].value;
    } else if (own) args[0].value = movedNodes.get(args[0].value)!;
    return { ...line, args, mark: '-', comment: undefined };
  };

  const out: SourceLine[] = [];
  for (const line of docs[1].lines) {
    if (line.kind !== 'statement' || !DECLARATIONS.includes(line.command)) {
      out.push(line);
      continue;
    }
    const prior = was.get(keyOf(line));
    if (!prior || split.has(keyOf(line))) out.push({ ...line, mark: '+' });
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
    if (now.has(key) && !split.has(key)) {
      anchor = out.findIndex(
        l => l.kind === 'statement' && DECLARATIONS.includes(l.command) && keyOf(l) === key,
      );
      continue;
    }
    const removed = removedLine(line);
    if (anchor < 0) {
      const first = out.findIndex(l => l.kind === 'statement' && DECLARATIONS.includes(l.command));
      anchor = (first < 0 ? out.length : first) - 1;
    }
    out.splice(anchor + 1, 0, removed);
    anchor += 1;
  }
  const merged = printSource({ lines: out });
  parseModel(merged);
  return { merged, moved };
}
