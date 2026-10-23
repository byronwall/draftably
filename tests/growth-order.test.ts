import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, type Scene } from '../src/dsl/compile';

const read = (file: string) => readFileSync(path.join(__dirname, '..', file), 'utf8');

/** Pairs of objects in both scenes that swapped sides by more than 20px. */
function flips(a: Scene, b: Scene) {
  const centre = (s: Scene, id: string) => {
    const o = s.byId.get(id)!;
    return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  };
  const ids = a.objects.map(o => o.id).filter(id => b.byId.has(id)),
    out: string[] = [];
  for (const [i, p] of ids.entries())
    for (const q of ids.slice(i + 1))
      for (const axis of ['x', 'y'] as const) {
        const before = centre(a, q)[axis] - centre(a, p)[axis],
          after = centre(b, q)[axis] - centre(b, p)[axis];
        if (Math.abs(before) > 20 && Math.abs(after) > 20 && Math.sign(before) !== Math.sign(after))
          out.push(`${p}/${q} ${axis}`);
      }
  return out;
}

const steps = Array.from({ length: 12 }, (_, i) => `s${i}`);
const pipeline = (extra: string[] = []) =>
  [
    'diagram "Pipeline" version=1',
    ...steps.map(id => `node ${id} "Step ${id}"`),
    ...steps.slice(1).map((id, i) => `edge e${i} ${steps[i]} -> ${id}`),
    ...extra,
    'layout root flow direction=right gap=48',
  ].join('\n');

describe('growth keeps the fold', () => {
  it('keeps every band when a side exit is added beside a step', () => {
    const before = checkSource(pipeline()),
      after = checkSource(
        pipeline(['node oops "Keep the window open"', 'edge x s8 -> oops "copy failed"']),
      );
    expect(flips(before, after)).toEqual([]);
  });

  it('keeps the held-out capture flow in order after its new exit', () => {
    const dir = 'docs/intent/diagram-quality/heldout/regionshot-capture';
    const before = checkSource(read(`${dir}/v0.draft`)),
      after = checkSource(read(`${dir}/e1.draft`));
    expect(flips(before, after)).toEqual([]);
  });

  it('keeps the authored order within ranks when a layered pipeline grows', () => {
    const dir = 'docs/intent/diagram-quality/heldout/v2ctx-pipeline';
    const before = checkSource(read(`${dir}/v0.draft`)),
      after = checkSource(read(`${dir}/e1.draft`));
    expect(flips(before, after)).toEqual([]);
  });
});
