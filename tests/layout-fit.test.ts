import { describe, expect, it } from 'vitest';
import { compile, type Scene } from '../src/dsl/compile';

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
      wide = await compile(chain(' fit=wide').replace(' direction=down', ''));
    expect(aspect(plain)).toBeLessThan(1);
    expect(aspect(wide)).toBeGreaterThan(1);
    expect(wide.diagnostics.find(d => d.code === 'fit')?.message).toContain('reading right');
  });

  it('holds a stated direction, even when the other one would fit better', async () => {
    const wide = await compile(chain(' fit=wide'));
    expect(aspect(wide)).toBeLessThan(1);
    expect(wide.diagnostics.find(d => d.code === 'fit')?.message).toContain('reading down');
  });

  it('warns when a stated direction keeps the drawing too wide, but not too tall', async () => {
    const wide = await compile(chain(' fit=slide').replace('direction=down', 'direction=right'));
    expect(wide.diagnostics.find(d => d.code === 'fit-direction')?.message).toContain(
      'Remove direction=',
    );
    const tall = await compile(chain(' fit=wide'));
    expect(tall.diagnostics.some(d => d.code === 'fit-direction')).toBe(false);
  });

  it('keeps the file as written when it already fits best', async () => {
    const tall = await compile(chain(' fit=tall'));
    expect(aspect(tall)).toBeCloseTo(aspect(await compile(chain(''))), 5);
    expect(tall.diagnostics.find(d => d.code === 'fit')?.message).toContain('as written');
  });

  it('is only read on the root; elsewhere it is ignored with a warning', async () => {
    const scene = await compile(
      'diagram "F" version=1\ngroup g "G"\nnode a "A" in=g\nlayout g column fit=wide',
    );
    expect(scene.diagnostics.find(d => d.code === 'layout-attribute')?.message).toContain(
      'fit= goes on the layout root line',
    );
  });
});

describe('a layout line that goes wrong', () => {
  it('ignores a setting it does not take and names the right one', async () => {
    const scene = await compile(chain(' gap=48'));
    expect(scene.diagnostics.some(d => d.level === 'error')).toBe(false);
    expect(scene.diagnostics.find(d => d.code === 'layout-attribute')?.message).toContain(
      'node-gap=',
    );
  });

  it('keeps the later of two lines for one scope', async () => {
    const scene = await compile(chain('') + '\nlayout root engine=layered direction=right');
    expect(scene.diagnostics.find(d => d.code === 'layout-repeated')?.message).toContain(
      'this line wins',
    );
    expect(aspect(scene)).toBeGreaterThan(1);
  });
});
