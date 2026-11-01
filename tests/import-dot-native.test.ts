import { expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { importDot } from '../src/import/dot-importer';

it('compiles an imported DOT graph as an editable native diagram', async () => {
  const result = importDot(
    'graph G { node [shape=box]; subgraph cluster_services { a; b; } a -- b [label="shared"]; a -- b [label="other"]; }',
  );
  expect(result.status).toBe('ready');
  const diagram = projectScene(await compile(result.nativeSource!));
  expect(diagram.graph.nodes.map(n => n.id)).toEqual(['a', 'b']);
  expect(diagram.graph.groups.map(g => g.id)).toEqual(['cluster_services']);
  expect(diagram.graph.nodes.every(n => n.parentId === 'cluster_services')).toBe(true);
  expect(diagram.graph.edges.map(e => [e.from, e.to, e.label, e.directed])).toEqual([
    ['a', 'b', 'shared', false],
    ['a', 'b', 'other', false],
  ]);
});
