import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';

// Path choice on the reproductions of issues #595, #601 and #604: where a line runs between
// group borders and how it passes a group title.
async function route(issue: string) {
  const source = fs.readFileSync(`docs/intent/diagram-quality/issues/${issue}/v0.draft`, 'utf8'),
    doc = projectScene(await compile(source)),
    { vg, rects } = visibleRects(doc),
    { result } = computeRoutes(doc, vg, rects, { previous: [] });
  const byId = new Map(result.routes.map(r => [r.id, r]));
  return { rect: (id: string) => rects.get(id)!, line: (id: string) => byId.get(id)! };
}

describe('route paths', () => {
  it('runs a lone line down the middle of the gap between two groups (#595)', async () => {
    const { rect, line } = await route('i595-gap-center');
    const left = rect('left'),
      right = rect('right'),
      run = line('sd').points.find((p, i, ps) => i > 0 && ps[i - 1].x === p.x)!;
    const a = run.x - (left.x + left.w),
      b = right.x - run.x;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });

  it('crosses a title band beside the title, straight down (#601)', async () => {
    const { line } = await route('i601-down-detour');
    for (const id of ['ab', 'bc']) {
      const ps = line(id).points;
      expect(ps).toHaveLength(2);
      expect(ps[0].x).toBe(ps[1].x);
    }
  });

  it("keeps a line out of a soft group's title text (#604)", async () => {
    const { rect, line } = await route('i604-title-stroke');
    const batch = rect('batch'),
      last = line('e8').points.at(-1)!;
    // The title "Second row of sample steps" sits at the group's top left; the line enters I
    // past its end, not through it.
    expect(last.y).toBe(rect('I').y);
    expect(last.x).toBeGreaterThan(batch.x + 140);
  });
});
