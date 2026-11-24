import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, compile } from '../src/dsl/compile';
import { removeIds } from '../src/cli/edit';
import { canonicalGeometry, visibleRects } from '../src/dsl/project';
import { drawingBounds } from '../src/model/bounds';
import { renderSvg } from '../src/runtime/svg-renderer';
import { projectScene } from '../src/dsl/project';
import { settleTimelines } from '../src/dsl/source-edits';
import { printSource, readSource } from '../src/dsl/syntax';
import { translateEdit, UnsupportedEdit } from '../src/dsl/translate';
import * as edits from '../src/model/edits';
import { holdTimelines } from '../src/model/graph';
import type { Diagram } from '../src/model/types';

const example = (name: string) =>
  readFileSync(path.join(__dirname, `../examples/${name}.draft`), 'utf8');

/**
 * Every editor action ends in one of these model edits. Each one, on a timeline's rows, bands,
 * milestones and group, must either be refused with a reason or leave a file that still compiles.
 * This is the check that catches the next editor path no one guarded by hand.
 */
const EDITS: Array<[string, (d: Diagram, id: string, other: string) => void]> = [
  ['move', (d, id) => edits.moveObject(d, id, 30, 40, true)],
  ['nudge', (d, id) => edits.nudge(d, [id], 12, -8)],
  ['align', (d, id, other) => edits.alignObjects(d, [id, other], 'top')],
  ['distribute', (d, id, other) => edits.alignObjects(d, [id, other], 'distribute-y')],
  ['resize', (d, id) => edits.setGeometry(d, id, 'w', (d.layout.nodes[id]?.w ?? 100) + 60)],
  ['set y', (d, id) => edits.setGeometry(d, id, 'y', (d.layout.nodes[id]?.y ?? 0) + 50)],
  ['fit', (d, id) => edits.fitContainer(d, id)],
  ['rename', (d, id) => edits.setTitle(d, id, 'A renamed title that is longer')],
  [
    'add inside',
    (d, id) =>
      edits.addNode(
        d,
        { parentId: d.graph.groups.some(g => g.id === id) ? id : (parentOf(d, id) ?? null) },
        { x: 10, y: 10 },
      ),
  ],
  ['add connected', (d, id) => void edits.addConnectedNode(d, { from: id }, { x: 0, y: 0 })],
  ['reparent out', (d, id) => edits.setParent(d, id, null)],
  ['delete', (d, id) => edits.deleteObjects(d, [id])],
  ['wrap', (d, id) => void edits.wrapInContainer(d, [id], { x: 0, y: 0 })],
  ['ungroup', (d, id) => edits.ungroup(d, [id])],
  ['paste copy', (d, id) => void edits.pasteFragment(d, edits.copyFragment(d, [id]))],
];

const parentOf = (d: Diagram, id: string) =>
  [...d.graph.nodes, ...d.graph.groups].find(o => o.id === id)?.parentId;

function targets(doc: Diagram) {
  const t = doc.layout.timelines![0];
  const rows = t.ids.filter(id => doc.graph.nodes.some(n => n.id === id && n.title)),
    bands = doc.graph.groups.filter(g => (g.parentId ?? 'root') === t.scope).map(g => g.id);
  const outside = doc.graph.nodes.find(n => !t.ids.includes(n.id))?.id;
  return [
    ...rows.slice(0, 2),
    ...bands.slice(0, 1),
    ...(t.scope !== 'root' ? [t.scope] : []),
    ...(outside ? [outside] : []),
  ].map(id => ({ id, other: rows.find(r => r !== id) ?? rows[0] }));
}

describe('timeline edits', () => {
  for (const name of ['bug-timeline', 'release-investigation', 'roadmap'])
    it(`keeps ${name} valid under every model edit`, () => {
      const source = example(name),
        scene = checkSource(source),
        before = projectScene(scene);
      const broken: string[] = [];
      let ran = 0;
      for (const { id, other } of targets(before))
        for (const [label, edit] of EDITS) {
          const after = structuredClone(before);
          try {
            edit(after, id, other);
          } catch {
            continue; // The model refuses this edit for this object on its own.
          }
          ran++;
          if (holdTimelines(before, after)) continue; // Refused with a reason.
          let doc;
          try {
            doc = translateEdit({
              source: readSource(source),
              scene,
              before,
              after,
              label,
              selection: [id],
            }).source;
          } catch (error) {
            if (error instanceof UnsupportedEdit) continue;
            broken.push(`${label} ${id}: ${(error as Error).message}`);
            continue;
          }
          settleTimelines(doc);
          try {
            checkSource(printSource(doc));
          } catch (error) {
            broken.push(`${label} ${id}: ${(error as Error).message}`);
          }
        }
      expect(ran).toBeGreaterThan(40);
      expect(broken).toEqual([]);
    });
});

describe('timeline geometry, from one source', () => {
  it('keeps an on-chart line out of layout ranking', async () => {
    const src = (extra: string) => `layout root flow direction=right
group t "T"
layout t timeline
node a "A" in=t at=2025-01-01
node c "C" in=t at=2025-01-09
node x "Source"
edge feed x -> c kind=async
${extra}`;
    const plain = await compile(src('')),
      lined = await compile(src('edge dep a -> c'));
    expect(lined.byId.get('x')!.x).toBe(plain.byId.get('x')!.x);
  });

  it('bounds a selected row by itself, and a whole root timeline by all of it', async () => {
    const doc = projectScene(await compile(example('bug-timeline')));
    const { vg, rects } = visibleRects(doc);
    const one = drawingBounds(
      doc,
      { ...vg, nodes: vg.nodes.filter(n => n.id === 'b1'), groups: [] },
      rects,
      [],
    );
    expect(one.h).toBe(rects.get('b1')!.h);
    const all = drawingBounds(doc, vg, rects, []);
    expect(all.w).toBeGreaterThanOrEqual(doc.layout.timelines![0].bounds.w);
  });

  it('reports on-chart lines in inspect geometry, and links bands in exports', async () => {
    const doc = projectScene(
      await compile(`layout root timeline
group g "Team" href="https://example.org/team"
node a "A" in=g at=2025-01-01 href="https://example.org/a"
node b "B" in=g at=2025-01-03
edge dep a -> b`),
    );
    expect(canonicalGeometry(doc).routes.map(r => r.id)).toContain('dep');
    const svg = renderSvg(doc);
    expect(svg).toContain('https://example.org/team');
    expect(svg).toContain('https://example.org/a');
  });

  it('removes a band with its last row from the CLI, as the editor does', () => {
    const out = removeIds(
      `layout root timeline
group b "Band"
node a "A" in=b at=2025-01-01
node c "C" at=2025-01-02`,
      ['a'],
    );
    expect(out).not.toMatch(/group b /);
  });
});
