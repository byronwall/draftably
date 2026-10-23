import { describe, expect, it } from 'vitest';
import { compile, type Scene } from '../src/dsl/compile';

/** A server whose jobs feed a store and an API, beside a client: the hn-offline shape. */
const source = (engine: string, params = '') =>
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
    `layout root engine=${engine}${params}`,
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
      // Unfolded: on one row this drawing is more than five times wider than it is deep.
      const scene = await compile(source(engine, ' fold=never'));
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

  for (const engine of ['compound-flow', 'layered']) {
    it(`${engine}: a drawing over 5:1 folds its longest group and keeps the groups in order`, async () => {
      const scene = await compile(source(engine)),
        server = box(scene, 'server'),
        client = box(scene, 'client');
      // jobs stays left of db, and db and api fold onto a row below it.
      expect(box(scene, 'db').y).toBeGreaterThan(box(scene, 'jobs').y + box(scene, 'jobs').h);
      expect(client.x).toBeGreaterThan(server.x + server.w);
      const w = Math.max(...scene.objects.map(o => o.x + o.w)),
        h = Math.max(...scene.objects.map(o => o.y + o.h));
      expect(w / h).toBeLessThanOrEqual(5);
    });
  }

  it('wraps a chain of groups that cannot fold into rows', async () => {
    const groups = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const text = [
      ...groups.flatMap(g => [`group ${g} "${g.toUpperCase()}"`, `node ${g}1 "Step ${g}" in=${g}`]),
      ...groups.slice(1).map((g, i) => `edge e${i} ${groups[i]}1 -> ${g}1`),
      'layout root engine=compound-flow',
      '',
    ].join('\n');
    const scene = await compile(text);
    // Rows read like text: a later group starts a new row below.
    expect(box(scene, 'g').y).toBeGreaterThan(box(scene, 'a').y + box(scene, 'a').h);
    const w = Math.max(...scene.objects.map(o => o.x + o.w)),
      h = Math.max(...scene.objects.map(o => o.y + o.h));
    expect(w / h).toBeLessThanOrEqual(5);
  });

  it('puts a called group beside its caller instead of a rank past it', async () => {
    const text = [
      'group server "Server"',
      'node jobs "Jobs" in=server',
      'node api "API" in=server',
      'group upstream "Upstream APIs"',
      'node firebase "Firebase" in=upstream',
      'group device "Phone"',
      'node store "Store" in=device',
      'node views "Views" in=device',
      'edge e1 jobs -> firebase',
      'edge e2 jobs -> api',
      'edge e3 api -> store',
      'edge e4 store -> views',
      'layout root engine=compound-flow',
      '',
    ].join('\n');
    const scene = await compile(text),
      server = box(scene, 'server'),
      upstream = box(scene, 'upstream');
    // Upstream shares the server's column, and the phone still follows the server.
    expect(upstream.x).toBeLessThan(server.x + server.w);
    expect(box(scene, 'device').x).toBeGreaterThan(server.x + server.w);
  });
});
