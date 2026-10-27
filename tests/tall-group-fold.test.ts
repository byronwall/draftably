import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';

// Three groups side by side reading down; the third holds a chain four times as tall as the others.
const source = (extra = '') =>
  [
    'diagram "Tall group" version=1',
    'group a "Short one" color=teal',
    'node a1 "Open" in=a',
    'node a2 "Load" in=a',
    'group b "Short two" color=blue',
    'node b1 "Click" in=b',
    'node b2 "Save" in=b',
    `group c "Long chain" color=amber${extra}`,
    ...Array.from({ length: 8 }, (_, i) => `node c${i} "Step ${i + 1}" in=c`),
    'edge ea a1 -> a2',
    'edge eb b1 -> b2',
    ...Array.from({ length: 7 }, (_, i) => `edge ec${i} c${i} -> c${i + 1}`),
    'layout root engine=layered direction=down',
  ].join('\n');

const bounds = async (text: string) => {
  const scene = await compile(text),
    top = scene.objects.filter(o => o.parent === 'root');
  const w = Math.max(...top.map(o => o.x + o.w)) - Math.min(...top.map(o => o.x)),
    h = Math.max(...top.map(o => o.y + o.h)) - Math.min(...top.map(o => o.y));
  return { scene, w, h, area: w * h };
};

describe('a group much taller than the rest folds', () => {
  it('folds the tall chain into columns when that shrinks the drawing', async () => {
    const folded = await bounds(source()),
      kept = await bounds(source(' fold=never'));
    expect(folded.area).toBeLessThan(kept.area);
    expect(folded.h).toBeLessThan(kept.h);
    // Two columns: the chain's boxes no longer share one x.
    const xs = new Set(
      folded.scene.objects.filter(o => o.parent === 'c').map(o => Math.round(o.x)),
    );
    expect(xs.size).toBeGreaterThan(1);
  });

  it('leaves the group in one column with fold=never', async () => {
    const kept = await bounds(source(' fold=never'));
    const xs = new Set(kept.scene.objects.filter(o => o.parent === 'c').map(o => Math.round(o.x)));
    expect(xs.size).toBe(1);
  });
});
