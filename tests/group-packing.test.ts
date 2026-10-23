import { describe, expect, it } from 'vitest';
import { compile, type Scene } from '../src/dsl/compile';

/** A server whose jobs feed a store and an API, beside a client: the hn-offline shape. */
const source = (engine: string) =>
  [
    'group server "Server"',
    'group jobs "Jobs" in=server',
    'node timer "Timer" in=jobs',
    'node fetch "Fetch" in=jobs',
    'node db "Store" in=server',
    'node api "API" in=server',
    'group client "Client"',
    'node cache "Cache" in=client',
    'node views "Views" in=client',
    'node upstream "Upstream"',
    'edge e1 timer -> fetch',
    'edge e2 fetch -> upstream',
    'edge e3 fetch -> db',
    'edge e4 db -> api',
    'edge e5 api -> cache',
    'edge e6 cache -> views',
    `layout root engine=${engine}`,
    '',
  ].join('\n');

const box = (scene: Scene, id: string) => scene.byId.get(id)!;
const cy = (scene: Scene, id: string) => box(scene, id).y + box(scene, id).h / 2;
const geometry = (scene: Scene) => scene.objects.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));

/** Gap between two boxes along x, or along y when they sit one above the other. */
function gap(scene: Scene, a: string, b: string) {
  const p = box(scene, a),
    q = box(scene, b);
  return Math.max(q.x - (p.x + p.w), p.x - (q.x + q.w), q.y - (p.y + p.h), p.y - (q.y + q.h));
}

describe('group packing', () => {
  for (const engine of ['compound-flow', 'layered']) {
    it(`${engine}: a chain inside a group reads as one straight row`, async () => {
      const scene = await compile(source(engine));
      // jobs → db → api, and timer → fetch inside jobs, share one centre line.
      expect(cy(scene, 'db')).toBeCloseTo(cy(scene, 'jobs'), 0);
      expect(cy(scene, 'api')).toBeCloseTo(cy(scene, 'db'), 0);
      expect(cy(scene, 'fetch')).toBeCloseTo(cy(scene, 'timer'), 0);
      expect(box(scene, 'db').x).toBeGreaterThan(box(scene, 'jobs').x + box(scene, 'jobs').w);
      expect(box(scene, 'api').x).toBeGreaterThan(box(scene, 'db').x + box(scene, 'db').w);
    });

    it(`${engine}: keeps one gap, at least the group gap, between sibling groups`, async () => {
      const scene = await compile(source(engine));
      expect(gap(scene, 'server', 'client')).toBeGreaterThanOrEqual(48);
    });

    it(`${engine}: compiles to the same geometry every time`, async () => {
      const text = source(engine);
      expect(geometry(await compile(text))).toEqual(geometry(await compile(text)));
    });
  }
});
