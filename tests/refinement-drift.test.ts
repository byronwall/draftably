import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli/main';
import { checkSource, compile } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';

afterEach(() => vi.restoreAllMocks());

const flow = (extra: string[]) =>
  [
    'diagram "Drift" version=1',
    'node a "Collect the inputs"',
    'node b "Build the package"',
    'node c "Publish"',
    'edge e1 a -> b',
    'edge e2 b -> c',
    'layout root flow direction=right gap=48',
    ...extra,
  ].join('\n');

// Written for narrower boxes: the size line widens a, so c and b no longer fit where they were put.
const drifted = ['near c a side=below gap=4', 'stay b x=60 y=0', 'size a width=120 height=auto'];

describe('refinements that drift', () => {
  it('keeps a small nudge adjustment from growing when adding label room', () => {
    const scene = checkSource(`layout root column gap=48
node api "API"
node worker "Worker"
node db "DB"
edge ab api -> worker "Submit"
pin api x=0 y=0
nudge worker dx=103 dy=-105
nudge db dx=0 dy=-75`);
    expect(scene.byId.get('db')!.localY).toBe(136);
    expect(
      scene.diagnostics.some(
        d => d.code === 'relaxed' && d.ids.includes('db') && d.level === 'warning',
      ),
    ).toBe(false);
  });

  for (const placement of ['nudge c dx=-80 dy=0', 'pin c x=483 y=0'])
    it(`keeps the Cache corridor clear with ${placement}`, async () => {
      const source = `node a "API"
node b "Worker"
node c "DB"
node d "Cache"
size a width=100 height=56
edge ab a -> b "Request authorization"
edge bc b -> c "Write"
align y a b c d strength=required
pin a x=0 y=0
${placement}`;
      const doc = projectScene(await compile(source));
      const { vg, rects } = visibleRects(doc),
        cache = rects.get('d')!;
      for (const quick of [false, true]) {
        const routes = computeRoutes(doc, vg, rects, { previous: [], quick }).routes;
        expect(routes.filter(r => r.blocked).map(r => r.id)).toEqual([]);
        const ab = routes.find(r => r.id === 'ab')!;
        const onBorder = ab.points.slice(1).some((p, i) => {
          const q = ab.points[i];
          return (
            p.y === q.y &&
            (p.y === cache.y || p.y === cache.y + cache.h) &&
            Math.max(p.x, q.x) > cache.x &&
            Math.min(p.x, q.x) < cache.x + cache.w
          );
        });
        expect(onBorder).toBe(false);
      }
    });

  it('keeps a stayed sibling in order when label room cannot fit', () => {
    const source = `layout root row gap=48
node a "API"
node b "Worker"
node c "DB"
size a width=80 height=56
size b width=80 height=56
size c width=80 height=56
edge ab a -> b "Request authorization"
align y a b c strength=required
pin a x=0 y=0
pin c x=190 y=0
stay b x=90 y=0 weight=8`;
    const scene = checkSource(source),
      b = scene.byId.get('b')!,
      c = scene.byId.get('c')!;
    expect(b.x + b.w).toBeLessThanOrEqual(c.x);
    expect(b.localX).toBe(92);
    expect(scene.diagnostics.some(d => d.code === 'relaxed' && d.level === 'warning')).toBe(false);
  });

  it('does not increase a small unrelated stay adjustment for label room', () => {
    const scene = checkSource(`layout root column gap=48
node api "API"
node worker "Worker"
node db "DB"
edge ab api -> worker "Submit"
pin api x=0 y=0
stay worker x=103 y=0 weight=8
stay db x=0 y=134 weight=8`);
    expect(scene.byId.get('db')!.localY).toBe(136);
  });

  it('keeps an unrelated preferred near relation when adding label room', () => {
    const scene = checkSource(`layout root column gap=48
node api "API"
node worker "Worker"
node db "DB"
edge ab api -> worker "Submit"
pin api x=0 y=0
stay worker x=103 y=0 weight=8
near db api side=below gap=80 strength=prefer`);
    const api = scene.byId.get('api')!,
      db = scene.byId.get('db')!;
    expect(db.y - api.y - api.h).toBe(80);
  });

  it('keeps a required near relation when label room does not fit', () => {
    const source = `layout root row gap=48
node a "A"
node b "B"
node c "C"
size a width=80 height=56
size b width=80 height=56
size c width=80 height=56
edge ab a -> b "Request authorization"
align y a b c strength=required
pin a x=0 y=0
pin c x=183 y=0
near b c side=left gap=12 strength=required`;
    const scene = checkSource(source),
      plain = checkSource(source.replace(' "Request authorization"', '')),
      b = scene.byId.get('b')!,
      c = scene.byId.get('c')!;
    expect([b.x, c.x]).toEqual([plain.byId.get('b')!.x, plain.byId.get('c')!.x]);
    expect(c.x - (b.x + b.w)).toBeGreaterThanOrEqual(12);
    expect(scene.diagnostics.filter(d => d.level === 'error')).toEqual([]);
  });

  it('preserves an unrelated stay when label room would displace it', () => {
    const source = `layout root column gap=48
node api "API"
node worker "Worker"
node db "DB"
edge ab api -> worker "Submit"
pin api x=0 y=0
stay worker x=103 y=0 weight=8
stay db x=0 y=136 weight=8`;
    const scene = checkSource(source),
      db = scene.byId.get('db')!;
    expect([db.localX, db.localY]).toEqual([0, 136]);
    expect(scene.diagnostics.some(d => d.code === 'relaxed' && d.ids.includes('db'))).toBe(false);
  });
  it('warns when a refinement gives way by more than a few pixels', async () => {
    const notes = (await compile(flow(drifted))).diagnostics.filter(d => d.code === 'relaxed');
    expect(notes.map(d => [d.line, d.level])).toEqual([
      [9, 'warning'],
      [8, 'warning'],
    ]);
    expect(notes[0].message).toContain('format --drop-stale');
    // A few pixels of settling stays a note.
    const small = (await compile(flow(['stay b x=60 y=0']))).diagnostics.find(
      d => d.code === 'relaxed',
    );
    expect(small?.level).toBe('info');
  });

  it('format --drop-stale removes those lines and keeps the rest', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-drift-')), 'd.draft');
    fs.writeFileSync(file, flow(drifted));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await main(['format', file, '--drop-stale', '--write'])).toBe(0);
    const kept = fs.readFileSync(file, 'utf8');
    expect(kept).not.toMatch(/near c|stay b/);
    expect(kept).toContain('size a width=120 height=auto');
    expect((await compile(kept)).diagnostics.filter(d => d.level === 'warning')).toEqual([]);
  });

  it('size height=auto fits the title at the given width', () => {
    const long = 'node a "Collect the inputs from every upstream service"';
    const at = (size: string) =>
      checkSource(flow([size]).replace('node a "Collect the inputs"', long)).byId.get('a')!;
    const auto = at('size a width=120 height=auto'),
      fixed = at('size a width=120 height=40');
    expect(auto.w).toBe(120);
    expect(auto.h).toBeGreaterThan(fixed.h);
    expect(
      checkSource(flow(['size a width=120 height=auto'])).diagnostics.some(
        d => d.code === 'text-overflow',
      ),
    ).toBe(false);
  });
});
