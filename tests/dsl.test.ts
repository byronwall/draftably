import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, contentOrigin } from '../src/dsl/compile';
import { canonicalGeometry, projectScene } from '../src/dsl/project';
import { DslError, formatSource, parseModel } from '../src/dsl/syntax';
import { normalize } from '../src/model/document';

const checkout = readFileSync(path.join(__dirname, '../examples/checkout.meld'), 'utf8');

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

  it('maps Meld 0.1 colors onto the editor palette', () => {
    const m = parseModel('node a "A" color=teal\nnode b "B" color=orange');
    expect(m.objects.map(o => o.color)).toEqual(['mint', 'amber']);
  });
});

describe('compile', () => {
  it('places nested children inside their group content area', () => {
    const scene = compile(checkout);
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
    const before = compile(pinned).byId.get('db')!;
    const after = compile(pinned + 'node cache "Cache"\nedge read api -> cache\n').byId.get('db')!;
    expect([before.localX, before.localY]).toEqual([900, 40]);
    expect([after.localX, after.localY]).toEqual([900, 40]);
  });

  it('places an object relative to a sibling', () => {
    const scene = compile(checkout + 'near payments orders side=below gap=40\n');
    const orders = scene.byId.get('orders')!,
      payments = scene.byId.get('payments')!;
    expect(payments.y).toBe(orders.y + orders.h + 40);
  });

  it('reports a relaxed preference instead of overlapping', () => {
    const scene = compile(checkout + 'nudge payments dx=-120\n');
    expect(scene.diagnostics.some(d => d.code === 'relaxed' && d.ids[0] === 'payments')).toBe(true);
  });

  it('honors a requested group size and reports a size the contents override', () => {
    const big = compile(
      checkout.replace('layout services row gap=56', 'layout services row gap=56 min-width=800'),
    );
    expect(big.byId.get('services')!.w).toBe(800);
    const small = compile(
      checkout.replace('layout services row gap=56', 'layout services row gap=56 min-width=100'),
    );
    expect(small.diagnostics.some(d => d.code === 'group-grew')).toBe(true);
  });

  it('rejects relative placement cycles with a line', () => {
    expect(() => compile('node a "A"\nnode b "B"\nnear a b\nnear b a\n')).toThrow(/Line [34]/);
  });
});

describe('projection', () => {
  it('produces a valid editor document and reproducible geometry', () => {
    const doc = projectScene(compile(checkout));
    expect(normalize(doc)).toEqual(doc);
    expect(doc.layout.containers.platform.manualSize).toBe(true);
    expect(doc.styles.payments.shape).toBe('pill');
    expect(doc.styles.orders.color).toBe('mint');
    expect(doc.graph.edges.find(e => e.id === 'persist')!.dashed).toBe(true);
    const a = JSON.stringify(canonicalGeometry(doc)),
      b = JSON.stringify(canonicalGeometry(projectScene(compile(checkout))));
    expect(a).toBe(b);
    expect(canonicalGeometry(doc).routes).toHaveLength(5);
  });
});
