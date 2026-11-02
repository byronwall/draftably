import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { parseModel, printSource, readSource } from '../src/dsl/syntax';
import { translateEdit } from '../src/dsl/translate';
import { clone } from '../src/model/geometry';
import type { Diagram } from '../src/model/types';
import { normalize } from '../src/model/document';

const SOURCE = `diagram "Checkout" version=1
subtitle "Orders now persist before payment"
node api "API"
node db "Postgres"
edge e api -> db
`;

describe('heading', () => {
  it('draws the title and subtitle above the drawing without moving anything', () => {
    const doc = projectScene(checkSource(SOURCE));
    expect(normalize(JSON.parse(JSON.stringify(doc))).appearance.heading).toEqual({
      title: 'Checkout',
      subtitle: 'Orders now persist before payment',
    });
    const svg = renderSvg(doc);
    expect(svg).toContain('>Checkout</text>');
    expect(svg).toContain('Orders now persist before payment');
    const plain = SOURCE.replace(/subtitle.*\n/, '').replace(/diagram.*\n/, '');
    const at = (s: string) => checkSource(s).objects.map(o => [o.id, o.x, o.y]);
    expect(at(SOURCE)).toEqual(at(plain));
    expect(renderSvg(projectScene(checkSource(plain)))).not.toContain('font-size="20"');
  });

  it('allows one subtitle', () => {
    expect(() => parseModel('subtitle "a"\nsubtitle "b"\n')).toThrow(/Duplicate/);
  });

  it('saves title, subtitle and frame width edits as the heading lines alone', () => {
    const edit = (source: string, fn: (d: Diagram) => void) => {
      const scene = checkSource(source),
        before = projectScene(scene),
        after = clone(before);
      fn(after);
      const { source: out } = translateEdit({
        source: readSource(source),
        scene,
        before: normalize(JSON.parse(JSON.stringify(before))),
        after: normalize(JSON.parse(JSON.stringify(after))),
        label: 'Edit',
        selection: [],
      });
      return printSource(out);
    };
    const text = edit(SOURCE, d => {
      d.title = 'Checkout v2';
      d.appearance.heading = { title: 'Checkout v2', width: 900 };
    });
    expect(text).toBe(SOURCE.replace(/.*\n.*\n/, 'diagram "Checkout v2" version=1 width=900\n'));
    const plain = 'node api "API"\n';
    expect(edit(plain, d => (d.appearance.heading = { subtitle: 'Why' }))).toBe(
      'diagram "" version=1\nsubtitle "Why"\n\nnode api "API"\n',
    );
  });
});
