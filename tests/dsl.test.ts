import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, contentOrigin, rankLayers } from '../src/dsl/compile';
import { canonicalGeometry, projectScene } from '../src/dsl/project';
import { DslError, formatSource, parseModel } from '../src/dsl/syntax';
import { normalize } from '../src/model/document';

const checkout = readFileSync(path.join(__dirname, '../examples/checkout.draft'), 'utf8');

const errorLine = (source: string) => {
  try {
    parseModel(source);
  } catch (error) {
    expect(error).toBeInstanceOf(DslError);
    return (error as DslError).line;
  }
  throw Error('expected a DslError');
};

describe('syntax', () => {
  it('reports the line of each kind of error', () => {
    expect(errorLine('node a "A"\nnode a "B"')).toBe(2);
    expect(errorLine('node a "A" in=nowhere')).toBe(1);
    expect(errorLine('node a "A"\n\nedge e a -> b')).toBe(3);
    expect(errorLine('node a "A" colour=blue')).toBe(1);
    expect(errorLine('node a "A\n')).toBe(1);
    expect(errorLine('group g "G"\nnode a "A" in=g\nnode b "B"\nnear a b')).toBe(4);
    expect(errorLine('layout root grid')).toBe(1);
  });

  it('formats consistently and keeps comments and unrelated statements', () => {
    const messy =
      '\n\n# heading\n  node   a  "A"   color=blue   # inline note\n\n\n\nnode b "B" // other style\n\n';
    expect(formatSource(messy)).toBe(
      '# heading\nnode a "A" color=blue # inline note\n\nnode b "B" // other style\n',
    );
    expect(formatSource(formatSource(checkout))).toBe(formatSource(checkout));
    expect(formatSource(checkout)).toContain('# Customer-facing entry points.');
  });
});

describe('compile', () => {
  it('places nested children inside their group content area', () => {
    const scene = checkSource(checkout);
    for (const o of scene.objects) {
      if (o.parent === 'root') continue;
      const g = scene.byId.get(o.parent)!,
        origin = contentOrigin(g);
      expect(o.x).toBe(origin.x + o.localX);
      expect(o.x + o.w).toBeLessThanOrEqual(g.x + g.w);
      expect(o.y + o.h).toBeLessThanOrEqual(g.y + g.h);
    }
    expect(scene.diagnostics.filter(d => d.level === 'error')).toEqual([]);
  });

  it('keeps pins at their parent-local coordinates when content is added', () => {
    const pinned = checkout + 'pin db x=900 y=40\n';
    const before = checkSource(pinned).byId.get('db')!;
    const after = checkSource(pinned + 'node cache "Cache"\nedge read api -> cache\n').byId.get(
      'db',
    )!;
    expect([before.localX, before.localY]).toEqual([900, 40]);
    expect([after.localX, after.localY]).toEqual([900, 40]);
  });

  it('places an object relative to a sibling', () => {
    const scene = checkSource(checkout + 'near payments orders side=below gap=40\n');
    const orders = scene.byId.get('orders')!,
      payments = scene.byId.get('payments')!;
    expect(payments.y).toBe(orders.y + orders.h + 40);
  });

  it('reports a relaxed preference instead of overlapping', () => {
    const scene = checkSource(checkout + 'nudge payments dx=-120\n');
    expect(scene.diagnostics.some(d => d.code === 'relaxed' && d.ids[0] === 'payments')).toBe(true);
  });

  it('honors a requested group size and reports a size the contents override', () => {
    const big = checkSource(
      checkout.replace('layout services row gap=56', 'layout services row gap=56 min-width=800'),
    );
    expect(big.byId.get('services')!.w).toBe(800);
    const small = checkSource(
      checkout.replace('layout services row gap=56', 'layout services row gap=56 min-width=100'),
    );
    expect(small.diagnostics.some(d => d.code === 'group-grew')).toBe(true);
  });

  it('rejects relative placement cycles with a line', () => {
    expect(() => checkSource('node a "A"\nnode b "B"\nnear a b\nnear b a\n')).toThrow(/Line [34]/);
  });
});

/** A chain of `n` nodes, `n0 -> n1 -> …`, with optional extra lines. */
const chain = (n: number, extra = '') =>
  Array.from({ length: n }, (_, i) => `node n${i} "Step ${i}"`).join('\n') +
  '\n' +
  Array.from({ length: n - 1 }, (_, i) => `edge e${i} n${i} -> n${i + 1}`).join('\n') +
  '\n' +
  extra;
const aspect = (scene: ReturnType<typeof checkSource>) => {
  const xs = scene.objects.flatMap(o => [o.x, o.x + o.w]),
    ys = scene.objects.flatMap(o => [o.y, o.y + o.h]);
  return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
};
const centre = (scene: ReturnType<typeof checkSource>, id: string) => {
  const o = scene.byId.get(id)!;
  return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
};

describe('flow ranks', () => {
  it('breaks a loop at its return edge instead of putting the loop in one layer', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const pairs: Array<[string, string]> = [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'b'],
      ['d', 'e'],
    ];
    expect(rankLayers(ids, pairs)).toEqual([['a'], ['b'], ['c'], ['d'], ['e']]);
  });

  it('starts from the first declared node when every node is on a cycle', () => {
    expect(
      rankLayers(
        ['x', 'y', 'z'],
        [
          ['y', 'z'],
          ['z', 'x'],
          ['x', 'y'],
        ],
      ),
    ).toEqual([['x'], ['y'], ['z']]);
  });

  it('keeps a looping pipeline along the requested direction', () => {
    const scene = checkSource(
      chain(4, 'edge back n3 -> n1 "retry"\nlayout root flow direction=right'),
    );
    const xs = ['n0', 'n1', 'n2', 'n3'].map(id => centre(scene, id).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(['n0', 'n1', 'n2', 'n3'].map(id => centre(scene, id).y)).size).toBe(1);
  });
});

describe('flow folding', () => {
  it('leaves a short chain on one line', () => {
    const scene = checkSource(chain(4, 'layout root flow direction=right'));
    expect(new Set(scene.objects.map(o => o.y)).size).toBe(1);
  });

  it('folds a long chain into rows that each read left to right', () => {
    const scene = checkSource(chain(12, 'layout root flow direction=right'));
    expect(aspect(scene)).toBeLessThanOrEqual(3);
    const rows = [...new Set(scene.objects.map(o => o.y))].sort((a, b) => a - b);
    expect(rows.length).toBeGreaterThan(1);
    // Reading row by row, left to right, visits the chain in order.
    const read = [...scene.objects].sort((a, b) => a.y - b.y || a.x - b.x).map(o => o.id);
    expect(read).toEqual(Array.from({ length: 12 }, (_, i) => `n${i}`));
    // Every row starts again at the left edge.
    for (const y of rows)
      expect(Math.min(...scene.objects.filter(o => o.y === y).map(o => o.x))).toBe(0);
  });

  it('folds a long downward chain into columns', () => {
    const scene = checkSource(chain(12, 'layout root flow direction=down'));
    expect(1 / aspect(scene)).toBeLessThanOrEqual(3);
    expect(new Set(scene.objects.map(o => o.x)).size).toBeGreaterThan(1);
  });

  it('keeps a long chain on one line with fold=never', () => {
    const scene = checkSource(chain(12, 'layout root flow direction=right fold=never'));
    expect(new Set(scene.objects.map(o => o.y)).size).toBe(1);
    expect(() => checkSource(chain(3, 'layout root row fold=never'))).toThrow(/fold/);
  });
});

describe('projection', () => {
  it('produces a valid editor document and reproducible geometry', () => {
    const doc = projectScene(checkSource(checkout));
    expect(normalize(doc)).toEqual(doc);
    expect(doc.layout.containers.platform.manualSize).toBe(true);
    expect(doc.styles.payments.shape).toBe('pill');
    expect(doc.styles.orders.color).toBe('mint');
    expect(doc.graph.edges.find(e => e.id === 'persist')!.dashed).toBe(true);
    const a = JSON.stringify(canonicalGeometry(doc)),
      b = JSON.stringify(canonicalGeometry(projectScene(checkSource(checkout))));
    expect(a).toBe(b);
    expect(canonicalGeometry(doc).routes).toHaveLength(5);
  });
});
