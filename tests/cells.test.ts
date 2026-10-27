import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { computeRoutes } from '../src/model/routes';
import { normalize } from '../src/model/document';

const example = (name: string) =>
  readFileSync(path.join(__dirname, `../examples/${name}.draft`), 'utf8');

describe('cells', () => {
  it('lays a sequence edge to edge under its title band, sharing one height', () => {
    const scene = checkSource(example('prompt-request')),
      at = (id: string) => scene.byId.get(id)!;
    const cells = ['sys', 'tools', 'hist', 'turn'].map(at);
    for (const [a, b] of cells.slice(0, -1).map((c, i) => [c, cells[i + 1]]))
      expect(a.x + a.w).toBe(b.x);
    expect(new Set(cells.map(c => c.h)).size).toBe(1);
    const req = at('req');
    expect(cells[0].x).toBe(req.x);
    expect(cells.at(-1)!.x + cells.at(-1)!.w).toBe(req.x + req.w);
    expect(cells[0].y + cells[0].h).toBe(req.y + req.h);
    // The marker sits on the seam before the next cell and cuts the band too.
    const cp = at('cp');
    expect(cp.x + cp.w / 2).toBe(at('turn').x);
    expect(cp.y).toBe(req.y);
    expect(cp.y + cp.h).toBeGreaterThan(req.y + req.h);
  });

  it('ends a line on a marker from below, and survives normalizing', () => {
    const doc = projectScene(checkSource(example('prompt-request')));
    expect(normalize(structuredClone(doc)).layout.containers.req.cellsBand).toBeGreaterThan(0);
    const cp = doc.layout.nodes.cp,
      { vg, rects } = visibleRects(doc),
      routes = computeRoutes(doc, vg, rects, { previous: [] }).routes;
    expect(routes.find(r => r.id === 'hit')!.points.at(-1)).toEqual({
      x: cp.x + cp.w / 2,
      y: cp.y + cp.h,
    });
    expect(routes.filter(r => r.blocked).map(r => r.id)).toEqual([]);
  });

  it('keeps a cell in place and reports a position line on it', () => {
    const scene = checkSource(
      'group g "G"\nlayout g cells\nnode a "A" in=g\nnode b "B" in=g\npin b x=0 y=0',
    );
    expect(scene.byId.get('b')!.localX).toBe(scene.byId.get('a')!.w);
    expect(scene.diagnostics.map(d => d.code)).toContain('cell-position');
  });

  it('stacks cells in a column with direction=down', () => {
    const scene = checkSource(
      'group g "Table"\nlayout g cells direction=down\nnode a "id" in=g\nnode b "organisation" in=g',
    );
    const a = scene.byId.get('a')!,
      b = scene.byId.get('b')!;
    expect(a.y + a.h).toBe(b.y);
    expect(a.w).toBe(b.w);
  });

  it('fills a grid row by row, sharing column widths, with spans', () => {
    const scene = checkSource(
        'group g "G"\nlayout g cells columns=2\nnode a "id" in=g\nnode b "uuid" in=g\nnode c "organisation_id" in=g\nnode d "uuid" in=g\nnode e "A footer wider than both columns" in=g span=2',
      ),
      at = (id: string) => scene.byId.get(id)!;
    expect(at('a').w).toBe(at('c').w);
    expect(at('b').x).toBe(at('d').x);
    expect(at('c').y).toBe(at('a').y + at('a').h);
    expect(at('e').x).toBe(at('a').x);
    expect(at('e').w).toBe(at('a').w + at('b').w);
  });

  it('reaches a cell with no free side across the cells, and others by their free side', () => {
    const doc = projectScene(
        checkSource(
          'group g "G"\nlayout g cells columns=3\n' +
            ['a', 'b', 'c', 'd', 'm', 'f', 'h', 'i', 'j']
              .map(id => `node ${id} "${id}" in=g`)
              .join('\n') +
            '\nnode src "Source"\nnode sink "Sink"\nedge in src -> m\nedge out f -> sink',
        ),
      ),
      { vg, rects } = visibleRects(doc),
      routes = computeRoutes(doc, vg, rects, { previous: [] }).routes,
      m = rects.get('m')!,
      into = routes.find(r => r.id === 'in')!;
    expect(into.cross).toBeDefined();
    expect(routes.filter(r => r.blocked).map(r => r.id)).toEqual([]);
    expect(into.points.at(-1)).toEqual(into.cross![1]);
    // It ends on the middle cell's edge, at its middle.
    const end = into.cross![1];
    expect([m.x, m.x + m.w].includes(end.x) || [m.y, m.y + m.h].includes(end.y)).toBe(true);
    // f is on the right edge, so its line leaves from its right side.
    const f = rects.get('f')!,
      out = routes.find(r => r.id === 'out')!;
    expect(out.cross).toBeUndefined();
    expect(out.points[0].x).toBe(f.x + f.w);
  });
});
