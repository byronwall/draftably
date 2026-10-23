import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LayoutLab } from '../src/engines/layout-engine.js';
import { compile, type Scene } from '../src/dsl/compile';
import { GROUP_INSET, GROUP_TITLE_CHROME } from '../src/dsl/frame';
import { writeArrangement } from '../src/dsl/layout-edits';
import { projectScene } from '../src/dsl/project';
import { printSource, readSource } from '../src/dsl/syntax';
import { measureText } from '../src/model/fonts';

const examples = path.join(__dirname, '../examples');
const read = (name: string) => readFileSync(path.join(examples, name), 'utf8');

/** Space between each group's frame and the bounding box of its children. */
function paddings(scene: Scene) {
  return scene.objects
    .filter(o => o.type === 'group')
    .flatMap(g => {
      const kids = scene.objects.filter(o => o.parent === g.id);
      if (!kids.length) return [];
      const x0 = Math.min(...kids.map(k => k.x)),
        y0 = Math.min(...kids.map(k => k.y)),
        x1 = Math.max(...kids.map(k => k.x + k.w)),
        y1 = Math.max(...kids.map(k => k.y + k.h));
      const titleRoom = Math.ceil(measureText(g.label, scene.look.groupTitle)) + GROUP_TITLE_CHROME;
      return [
        {
          id: g.id,
          w: g.w,
          titleRoom,
          left: x0 - g.x,
          right: g.x + g.w - x1,
          top: y0 - g.y,
          bottom: g.y + g.h - y1,
        },
      ];
    });
}

/** Every object's box, for comparing two compiles exactly. */
const geometry = (scene: Scene) => scene.objects.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));

describe('group fit', () => {
  const files = readdirSync(examples).filter(f => f.endsWith('.draft'));

  it.each(files)('%s fits every group to its content with one inset', async file => {
    const scene = await compile(read(file));
    for (const p of paddings(scene)) {
      expect(p.left, `${p.id} left`).toBe(GROUP_INSET);
      expect(p.bottom, `${p.id} bottom`).toBe(GROUP_INSET);
      expect(p.top, `${p.id} top`).toBe(scene.look.groupHeader);
      // Only a title wider than the content may widen the frame, and then only to fit it.
      if (p.right !== GROUP_INSET) expect(p.w, `${p.id} right`).toBe(p.titleRoom);
    }
  });

  it('fits nested groups and groups arranged by engines', async () => {
    const source = [
      'group outer "Outer"',
      'group inner "Inner" in=outer',
      'node a "A" in=inner',
      'node b "B" in=inner',
      'group cells "Cells"',
      'node c "C" in=cells',
      'node d "D" in=cells',
      'node e "E" in=cells',
      'edge ab a -> b',
      'edge bc b -> c',
      'layout cells engine=grid',
      '',
    ].join('\n');
    for (const text of [source, source + 'layout root engine=compound-flow\n']) {
      const pads = paddings(await compile(text));
      expect(pads.map(p => p.id).sort()).toEqual(['cells', 'inner', 'outer']);
      for (const p of pads) expect([p.left, p.right, p.bottom]).toEqual([24, 24, 24]);
    }
  });

  it('widens a group to fit a title wider than its content', async () => {
    const title = 'A group whose title is much wider than its one small node';
    const scene = await compile(`group g "${title}"\nnode a "A" in=g\n`);
    const [p] = paddings(scene);
    expect(p.w).toBe(p.titleRoom);
    expect(p.w).toBeGreaterThan(scene.byId.get('a')!.w + 2 * GROUP_INSET);
    expect([p.left, p.bottom]).toEqual([24, 24]);
  });

  it('keeps an explicit minimum size', async () => {
    const text = read('checkout.draft').replace(
      'layout services row gap=56',
      'layout services row gap=56 min-width=900 min-height=400',
    );
    const services = (await compile(text)).byId.get('services')!;
    expect([services.w, services.h]).toEqual([900, 400]);
  });

  it('gives an empty group a usable size', async () => {
    const g = (await compile('group g "Empty"\n')).byId.get('g')!;
    expect([g.w, g.h]).toEqual([260, 110]);
  });
});

describe('group fit converges', () => {
  it.each(['ci-cd-pipeline.draft', 'order-pipeline.draft', 'kubernetes-cluster.draft'])(
    '%s compiles to the same geometry every time',
    async file => {
      const text = read(file);
      expect(geometry(await compile(text))).toEqual(geometry(await compile(text)));
    },
  );

  it('compiles a file the viewer saved to the drawing it saved, and saving again changes nothing', async () => {
    const text = read('order-pipeline.draft');
    const scene = await compile(text);
    const { document: after } = await LayoutLab.compute(projectScene(scene), {
      algorithm: 'force',
      mode: 'pass',
      maxMove: 120,
    });
    const source = readSource(text);
    expect(writeArrangement(source, scene, after).length).toBeGreaterThan(0);
    const saved = printSource(source);
    expect(saved).toMatch(/^stay /m);

    const once = await compile(saved),
      twice = await compile(saved);
    expect(geometry(twice)).toEqual(geometry(once));
    // Saving the compiled drawing back finds every object already where the file puts it.
    const again = readSource(saved);
    expect(writeArrangement(again, once, projectScene(once))).toEqual([]);
    expect(printSource(again)).toBe(saved);
    for (const p of paddings(once)) expect([p.left, p.bottom]).toEqual([24, 24]);
  });
});
