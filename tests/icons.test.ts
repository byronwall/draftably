import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { DslError, formatSource, parseModel } from '../src/dsl/syntax';
import { THEME_IDS } from '../src/model/appearance';
import { nodeLabel, ICON_TILE_ROOM } from '../src/model/labels';

const FILE = `group aws "AWS" color=slate icon=cloud
node api "Orders API" in=aws icon=zap
node db "Orders DB" in=aws icon=database icon-pos=top
node plain "Orders DB"
legend violet "Data stores" icon=database
`;

describe('icons', () => {
  it('reads icon= on nodes, groups and legend rows, and prints prefixed names bare', () => {
    const m = parseModel(FILE);
    expect(m.objects.map(o => [o.id, o.icon, o.iconPos])).toEqual([
      ['aws', 'cloud', undefined],
      ['api', 'zap', undefined],
      ['db', 'database', 'top'],
      ['plain', undefined, undefined],
    ]);
    expect(m.appearance.legend?.[0].icon).toBe('database');
    expect(formatSource('node a "A" icon=logos:aws-lambda\n')).toBe(
      'node a "A" icon=logos:aws-lambda\n',
    );
    for (const bad of [
      'node a "A" shape=diamond icon=zap',
      'node a "A" icon-pos=top',
      'node a "A" icon=Database',
      'group g "G" icon=zap icon-pos=top',
    ])
      expect(() => parseModel(bad), bad).toThrow(DslError);
  });

  it('embeds only the icons the file uses, and suggests a name for an unknown one', async () => {
    const scene = await compile(FILE + 'node q "Queue" icon=postgres\n');
    expect(Object.keys(scene.icons ?? {}).sort()).toEqual(['cloud', 'database', 'zap']);
    const warning = scene.diagnostics.find(d => d.code === 'unknown-icon');
    expect(warning?.message).toContain('`database`');
    const svg = renderSvg(projectScene(scene));
    // Lucide icons draw in the box's ink, and the unknown one draws a dashed square.
    expect(svg.match(/<g class="icon"/g)).toHaveLength(4);
    expect(svg).not.toContain('currentColor');
    expect(svg).toContain('class="icon missing"');
  });

  it('gives an icon one size in every theme and adds the tile room to the box', async () => {
    const sizes = new Set<string>();
    for (const theme of THEME_IDS) {
      const doc = projectScene(await compile(`theme ${theme}\n${FILE}`));
      for (const id of ['api', 'db']) {
        const r = doc.layout.nodes[id],
          l = nodeLabel(doc, id, id === 'api' ? 'Orders API' : 'Orders DB', r);
        sizes.add(`${id}:${l.icon?.size}`);
        // The icon sits inside the box.
        expect(l.icon!.x).toBeGreaterThanOrEqual(0);
        expect(l.icon!.y + l.icon!.size).toBeLessThanOrEqual(r.h);
      }
      expect(doc.layout.nodes.db.h - doc.layout.nodes.plain.h).toBe(ICON_TILE_ROOM);
    }
    expect([...sizes].sort()).toEqual(['api:18', 'db:32']);
  });
});
