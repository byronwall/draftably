import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { parseModel } from '../src/dsl/syntax';
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
});
