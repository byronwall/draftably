import { describe, expect, it } from 'vitest';
import { checkSource, compile, type Scene } from '../src/dsl/compile';

// A long chain: reading right it is very wide, reading down very tall.
const chain = (fit: string) =>
  [
    'diagram "Fit" version=1',
    ...Array.from({ length: 6 }, (_, i) => `node n${i} "Step ${i + 1}"`),
    ...Array.from({ length: 5 }, (_, i) => `edge e${i} n${i} -> n${i + 1}`),
    `layout root engine=layered direction=down fold=never${fit}`,
  ].join('\n');

const aspect = (scene: Scene) => {
  const o = scene.objects;
  return (
    (Math.max(...o.map(b => b.x + b.w)) - Math.min(...o.map(b => b.x))) /
    (Math.max(...o.map(b => b.y + b.h)) - Math.min(...o.map(b => b.y)))
  );
};

describe('fit= on the root layout', () => {
  it('picks the reading direction whose shape is closest to the target, and says so', async () => {
    const plain = await compile(chain('')),
      wide = await compile(chain(' fit=wide'));
    expect(aspect(plain)).toBeLessThan(1);
    expect(aspect(wide)).toBeGreaterThan(1);
    expect(wide.diagnostics.find(d => d.code === 'fit')?.message).toContain('reading right');
  });

  it('keeps the file as written when it already fits best', async () => {
    const tall = await compile(chain(' fit=tall'));
    expect(aspect(tall)).toBeCloseTo(aspect(await compile(chain(''))), 5);
    expect(tall.diagnostics.find(d => d.code === 'fit')?.message).toContain('as written');
  });

  it('is only allowed on the root', () => {
    expect(() =>
      checkSource('diagram "F" version=1\ngroup g "G"\nnode a "A" in=g\nlayout g column fit=wide'),
    ).toThrow('Unknown layout attribute: fit');
  });
});
