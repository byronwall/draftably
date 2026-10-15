/**
 * Example `.draft` diagrams from the repository's `examples/` folder, bundled into the viewer so
 * they open without a server. An example opens as a scratch copy; it is never written to disk
 * unless the user saves it as a new file.
 */
import { parseModel } from '../dsl/syntax';

const files = import.meta.glob<string>('../../examples/*.draft', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export interface ExampleInfo {
  id: string;
  title: string;
  /** The first comment in the file. */
  summary: string;
  source: string;
  nodes: number;
  groups: number;
  edges: number;
  /** Deepest container nesting: 0 for a flat diagram. */
  depth: number;
}

function describe(id: string, source: string): ExampleInfo {
  const model = parseModel(source);
  const parents = new Map(model.objects.map(o => [o.id, o.parent]));
  const depthOf = (id: string) => {
    let depth = 0;
    for (let p = parents.get(id); p && p !== 'root'; p = parents.get(p)) depth++;
    return depth;
  };
  const groups = model.objects.filter(o => o.type === 'group');
  return {
    id,
    title: model.title || id,
    summary: /^\s*#\s*(.+)$/m.exec(source)?.[1].trim() ?? '',
    source,
    nodes: model.objects.length - groups.length,
    groups: groups.length,
    edges: model.edges.length,
    depth: groups.length ? Math.max(...groups.map(g => depthOf(g.id) + 1)) : 0,
  };
}

/** All examples, flattest first, so the list reads as a ladder of nesting depth. */
export const EXAMPLES: ExampleInfo[] = Object.entries(files)
  .map(([file, source]) => describe(file.replace(/^.*\/|\.draft$/g, ''), source))
  .sort((a, b) => a.depth - b.depth || a.groups - b.groups || a.title.localeCompare(b.title));

export const findExample = (id: string) => EXAMPLES.find(e => e.id === id);
