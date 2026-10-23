import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource, compile, type Scene } from '../src/dsl/compile';
import { THEME_IDS } from '../src/model/appearance';

const read = (file: string) => readFileSync(path.join(__dirname, '..', file), 'utf8');
const withTheme = (source: string, theme: string) =>
  /^theme .*$/m.test(source)
    ? source.replace(/^theme .*$/m, `theme ${theme}`)
    : `${source}\ntheme ${theme}`;

const centres = (scene: Scene) =>
  new Map(
    scene.objects
      .filter(o => o.type !== 'group')
      .map(o => [o.id, { x: o.x + o.w / 2, y: o.y + o.h / 2 }]),
  );

/** Largest distance any node's centre moved between two scenes. */
function maxMove(a: Scene, b: Scene) {
  const pa = centres(a),
    pb = centres(b);
  return Math.max(
    ...[...pa].map(([id, p]) => Math.hypot(pb.get(id)!.x - p.x, pb.get(id)!.y - p.y)),
  );
}

function overlaps(scene: Scene) {
  const out: string[] = [];
  for (const scope of new Set(scene.objects.map(o => o.parent))) {
    const kids = scene.objects.filter(o => o.parent === scope);
    for (const [i, a] of kids.entries())
      for (const b of kids.slice(i + 1))
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
          out.push(`${a.id}/${b.id}`);
  }
  return out;
}

// A folded release flow whose titles wrap in some themes' type (midnight's mono, fieldnotes'
// serif) and not in others.
const release = read('docs/intent/diagram-quality/corpus/srcly-release/v0.draft');
// A tree engine layout: the engine arranges slots, too.
const tree = read('docs/intent/diagram-quality/heldout/annotations-modules/v0.draft');

describe('a theme switch holds the layout', () => {
  it('keeps every node within the still tolerance in a folded flow', () => {
    const base = checkSource(withTheme(release, 'signal'));
    for (const theme of ['graphite', 'fieldnotes', 'midnight']) {
      const scene = checkSource(withTheme(release, theme));
      expect(maxMove(base, scene), theme).toBeLessThanOrEqual(24);
    }
  });

  it('keeps rows and order in every theme, with no overlaps', () => {
    // Mulberry's padding is generous enough that some slots grow; rows and order still hold.
    const base = centres(checkSource(withTheme(release, 'graphite')));
    for (const theme of THEME_IDS) {
      const scene = checkSource(withTheme(release, theme)),
        at = centres(scene);
      expect(overlaps(scene), theme).toEqual([]);
      for (const [a, p] of base)
        for (const [b, q] of base) {
          if (Math.abs(q.y - p.y) > 20)
            expect(Math.sign(at.get(b)!.y - at.get(a)!.y), `${theme} ${a} ${b}`).toBe(
              Math.sign(q.y - p.y),
            );
          if (Math.abs(q.x - p.x) > 20)
            expect(Math.sign(at.get(b)!.x - at.get(a)!.x), `${theme} ${a} ${b}`).toBe(
              Math.sign(q.x - p.x),
            );
        }
    }
  });

  it('keeps an engine layout still', async () => {
    const base = await compile(withTheme(tree, 'signal'));
    const scene = await compile(withTheme(tree, 'fieldnotes'));
    expect(maxMove(base, scene)).toBeLessThanOrEqual(24);
    expect(overlaps(scene)).toEqual([]);
  });

  it('draws each node at its theme size, centred along the reading direction in its slot', () => {
    const graphite = checkSource(withTheme(release, 'graphite'));
    const midnight = checkSource(withTheme(release, 'midnight'));
    // Midnight's mono titles wrap, so some nodes are taller than graphite's, yet stay centred.
    const taller = midnight.objects.filter(o => o.h > graphite.byId.get(o.id)!.h);
    expect(taller.length).toBeGreaterThan(0);
    for (const o of taller) {
      const g = graphite.byId.get(o.id)!;
      expect(Math.abs(o.y + o.h / 2 - (g.y + g.h / 2)), o.id).toBeLessThanOrEqual(2);
    }
  });

  it('grows a slot when spilling would crowd its neighbours', () => {
    // Three boxes in a column with a 12px gap: no room to spill, so the slots hold the whole size.
    const source = (theme: string) =>
      [
        'diagram "Tight" version=1',
        `theme ${theme}`,
        'node a "Spatial canvas annotation workspace"',
        'node b "Second step in a long title"',
        'node c "Third"',
        'layout root column gap=12',
      ].join('\n');
    const scene = checkSource(source('fieldnotes'));
    expect(overlaps(scene)).toEqual([]);
    const [a, b] = ['a', 'b'].map(id => scene.byId.get(id)!);
    expect(b.y - (a.y + a.h)).toBeGreaterThanOrEqual(12);
  });
});
