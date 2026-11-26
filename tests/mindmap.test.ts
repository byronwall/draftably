import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { parseModel, printSource, readSource } from '../src/dsl/syntax';
import { translateEdit } from '../src/dsl/translate';
import { removeReferences } from '../src/dsl/source-edits';
import { drawnShade } from '../src/model/colors';
import type { Diagram } from '../src/model/types';
import { normalize } from '../src/model/document';
import { resolveAppearance } from '../src/model/appearance';

const sample = fs.readFileSync(path.join(__dirname, '../examples/launch-plan.draft'), 'utf8');

describe('layout … mindmap', () => {
  it('needs a root that is a node in its scope', () => {
    const base = 'node a "A"\nnode b "B"\nedge e a -> b\n';
    expect(() => parseModel(base + 'layout root mindmap')).toThrow(/needs its center topic/);
    expect(() => parseModel(base + 'layout root mindmap root=zz')).toThrow(
      /Unknown node\/group zz/,
    );
    expect(() =>
      parseModel(base + 'group g "G"\nnode c "C" in=g\nlayout g mindmap root=a'),
    ).toThrow(/must be a member of g/);
    // A root inside a frame is not one of the scope's own members.
    expect(() =>
      parseModel(base + 'group g "G"\nnode c "C" in=g\nedge f c -> a\nlayout root mindmap root=c'),
    ).toThrow(/must be a top-level node/);
  });

  it('puts the root between its branches, in straight columns', async () => {
    const scene = await compile(sample),
      at = (id: string) => scene.byId.get(id)!,
      mid = (id: string) => at(id).x + at(id).w / 2,
      root = mid('launch');
    const sides = ['mk', 'eng', 'sup'].map(id => Math.sign(mid(id) - root));
    expect(sides).toContain(1);
    expect(sides).toContain(-1);
    // A branch's topics sit past it, on its side, and each level lines up.
    for (const [branch, kids] of [
      ['mk', ['blog', 'hn', 'video']],
      ['eng', ['docs', 'pricing', 'load']],
      ['sup', ['faq', 'status']],
    ] as const) {
      const sign = Math.sign(mid(branch) - root);
      for (const k of kids) expect(Math.sign(mid(k) - mid(branch))).toBe(sign);
    }
    expect(mid('mk')).toBe(mid('sup'));
    expect(mid('blog')).toBe(mid('faq'));
    // Only a cross-link reaches the forum: it sits past Show HN, on its row.
    expect(mid('forum')).toBeGreaterThan(mid('hn'));
    expect(at('forum').y).toBe(at('hn').y);
  });

  it('draws branch lines without heads and cross-links as written', async () => {
    const scene = await compile(sample),
      doc = projectScene(scene),
      edge = (id: string) => doc.graph.edges.find(e => e.id === id)!;
    expect(edge('b1').head).toBe('none');
    expect(edge('b11').head).toBe('none');
    expect(edge('e1').head).toBeUndefined();
    expect(edge('e2').head).toBeUndefined();
    expect(scene.diagnostics.filter(d => d.level !== 'info')).toEqual([]);
    // The parsed model stays as written, so compare and edits never see the drawn heads.
    expect(parseModel(sample).edges.some(e => e.head || e.branch)).toBe(false);
  });

  it('keeps a labeled branch in the tree, unless a plain line reaches the same topic', async () => {
    const source = [
      'node r "R"',
      'node a "A"',
      'node b "B"',
      'node c "C"',
      'edge e1 r -> a "owns"',
      'edge e2 a -> b',
      'edge e3 r -> c',
      'edge e4 r -> b "also"',
      'layout root mindmap root=r',
    ].join('\n');
    const scene = await compile(source),
      mid = (id: string) => scene.byId.get(id)!.x + scene.byId.get(id)!.w / 2;
    // e1 keeps A and its subtree on its own side of the root; e4 is a second line into B, which
    // the plain e2 already reaches, so it stays a cross-link.
    expect(scene.edges.filter(e => e.branch).map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(Math.sign(mid('b') - mid('r'))).toBe(Math.sign(mid('a') - mid('r')));
  });

  it('keeps an edge with a written style out of the tree', async () => {
    const lines = ['kind=sync', 'head=arrow', 'tail=none', 'directed=true'].map(
      (attr, i) => `node t${i} "T${i}"\nedge e${i} r -> t${i} ${attr}`,
    );
    const scene = await compile(['node r "R"', ...lines, 'layout root mindmap root=r'].join('\n'));
    expect(scene.edges.filter(e => e.branch)).toEqual([]);
  });

  it('leaves an inner map its own branches', async () => {
    const source = [
      'node r "R"',
      'node x "X"',
      'group g "G"',
      'node a "A" in=g',
      'node b "B" in=g',
      'node c "C" in=g',
      'edge e0 r -> x',
      'edge e1 r -> g',
      'edge e2 a -> b',
      'edge e3 a -> c',
      'layout root mindmap root=r',
      'layout g mindmap root=a',
    ].join('\n');
    const scene = await compile(source),
      mid = (id: string) => scene.byId.get(id)!.x + scene.byId.get(id)!.w / 2;
    expect(scene.edges.filter(e => e.branch).map(e => e.id)).toEqual(['e0', 'e1', 'e2', 'e3']);
    expect(Math.sign(mid('b') - mid('a'))).toBe(-Math.sign(mid('c') - mid('a')));
  });

  it('writes an edge end only when the edit changes it', async () => {
    const source = [
      'node r "R"',
      'node a "A"',
      'node b "B"',
      'edge e0 r -> a',
      'edge e1 r -> b head=arrow',
      'layout root mindmap root=r',
    ].join('\n');
    const edit = async (change: (d: Diagram) => void) => {
      // The Editor saves through `normalize`, so the test does too.
      const scene = await compile(source),
        before = normalize(structuredClone(projectScene(scene))),
        after = structuredClone(before);
      change(after);
      const doc = translateEdit({
        source: readSource(source),
        scene,
        before,
        after,
        label: 'Edit',
        selection: [],
      }).source;
      return printSource(doc);
    };
    const port = (id: string) => (d: Diagram) =>
      (d.layout.edges[id] = { ...d.layout.edges[id], fromSide: 'top' });
    // A port edit keeps a branch free of head= and a cross-link's written head=arrow.
    expect(await edit(port('e0'))).toContain('edge e0 r -> a from=top\n');
    expect(await edit(port('e1'))).toContain('edge e1 r -> b head=arrow from=top');
    // An arrow chosen on a branch is written out, so it stays.
    const arrow = await edit(d => delete d.graph.edges.find(e => e.id === 'e0')!.head);
    expect(arrow).toContain('edge e0 r -> a head=arrow');
    // Undirected, the line drops its ends instead of keeping one the parser refuses.
    const loose = await edit(d => (d.graph.edges.find(e => e.id === 'e1')!.directed = false));
    expect(loose).toContain('edge e1 r -> b directed=false\n');
  });

  it("takes only the scope's own members as topics", async () => {
    const scene = await compile(
      [
        'node r "R"',
        'group g "G"',
        'node a "A" in=g',
        'node b "B" in=g',
        'edge e0 r -> a',
        'edge e1 r -> b',
        'layout root mindmap root=r',
      ].join('\n'),
    );
    expect(scene.edges.filter(e => e.branch)).toEqual([]);
  });

  it('drops the layout line when its center is removed', () => {
    const doc = readSource('node r "R"\nnode a "A"\nedge e0 r -> a\nlayout root mindmap root=r\n');
    removeReferences(doc, 'r');
    expect(printSource(doc)).not.toContain('layout');
  });

  it('colors each branch in turn, with pale cards below the first level', async () => {
    const source = [
      'node c "Center"',
      'node a "A"',
      'node a1 "A one"',
      'node b "B" color=rose',
      'node b1 "B one"',
      'node b2 "B two" color=violet',
      'edge e1 c -> a',
      'edge e2 a -> a1',
      'edge e3 c -> b',
      'edge e4 b -> b1',
      'edge e5 b1 -> b2',
      'layout root mindmap root=c',
    ].join('\n');
    const doc = projectScene(await compile(source)),
      color = (id: string) => doc.styles[id].color;
    expect(color('c')).toBe('auto');
    expect(color('a')).toBe('blue');
    expect(color('a1')).toBe('blue');
    expect(color('b')).toBe('rose');
    expect(color('b1')).toBe('rose');
    // A card is the pale end of its family in either scheme; a branch topic keeps its own shade.
    for (const theme of ['drafting', 'drafting-dark'] as const) {
      const look = resolveAppearance({ ...doc.appearance, theme });
      expect(drawnShade(doc, look, 'a1')).toBe(theme === 'drafting' ? 50 : 950);
      // A deeper topic with its own color is a card of that color.
      expect(drawnShade(doc, look, 'b2')).toBe(theme === 'drafting' ? 50 : 950);
      expect(drawnShade(doc, look, 'a')).toBe(500);
    }
  });
});
