import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { laneBends } from '../src/model/routes';

const flow = [
  'node a "A"',
  'node b "B"',
  'node c "C"',
  'node d "D"',
  'edge ab a -> b',
  'edge bc b -> c',
  'edge cd c -> d',
  'edge back d -> a',
  'edge skip a -> c',
  'layout root flow direction=right fold=never',
  '',
].join('\n');

describe('return and skip lanes', () => {
  it('plans a skip above the row and a return below it', async () => {
    const scene = await compile(flow);
    const lane = (id: string) => scene.edges.find(e => e.id === id)!.lane;
    const top = Math.min(...scene.objects.map(o => o.y)),
      bottom = Math.max(...scene.objects.map(o => o.y + o.h));
    expect(lane('skip')).toMatchObject({ out: true, y: top - 20 });
    expect(lane('back')).toMatchObject({ out: true, y: bottom + 20 });
    // Neighbours connect straight across and get no lane.
    expect(lane('ab')).toBeUndefined();
  });

  it('leaves by the side facing the lane and turns into the side facing back', async () => {
    const scene = await compile(flow);
    const at = (id: string) => scene.byId.get(id)!,
      [a, c, d] = [at('a'), at('c'), at('d')];
    const skip = laneBends({ lane: scene.edges.find(e => e.id === 'skip')!.lane }, a, c),
      back = laneBends({ lane: scene.edges.find(e => e.id === 'back')!.lane }, d, a);
    expect([skip.fromSide, skip.toSide]).toEqual(['top', 'left']);
    expect([back.fromSide, back.toSide]).toEqual(['bottom', 'right']);
    // The turn into the target sits in the gap beside it, and the line arrives off centre.
    expect(skip.waypoints!.at(-1)!.x).toBeLessThan(c.x);
    expect(back.waypoints!.at(-1)!.x).toBeGreaterThan(a.x + a.w);
    expect(skip.toOffset).toBe(-16);
    expect(back.toOffset).toBe(16);
  });

  it('drops a lane once an end has moved past it', async () => {
    const scene = await compile(flow);
    const lane = scene.edges.find(e => e.id === 'skip')!.lane!,
      a = scene.byId.get('a')!,
      c = scene.byId.get('c')!;
    const moved = { ...c, y: ('y' in lane ? lane.y : 0) - c.h - 40 };
    expect(laneBends({ lane }, a, moved).waypoints).toBeUndefined();
  });
});
