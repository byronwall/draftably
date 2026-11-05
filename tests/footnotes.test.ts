import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { printSource, readSource } from '../src/dsl/syntax';
import { translateEdit } from '../src/dsl/translate';
import { normalize } from '../src/model/document';
import { measureText } from '../src/model/fonts';
import { clone } from '../src/model/geometry';
import { headingTypes } from '../src/model/heading';
import { defaultAppearance, resolveAppearance } from '../src/model/appearance';
import { plainText, richLines } from '../src/model/rich-text';
import type { Diagram } from '../src/model/types';
import { setTextValue, textId } from '../src/state/canvas-text';

const SOURCE = `diagram "Retries" version=1
config link-base="https://github.com/org/repo/"
node api "API"
node queue "Queue"
edge m1 api -> queue "retry later [1]"
footnote 1 "[#1997](pull/1997) moved retries to the queue."
footnote "Times are from the staging run."
legend slate "Services"
`;

describe('footnotes', () => {
  it('draws entries between the drawing and the key, with links joined to link-base', () => {
    const scene = checkSource(SOURCE),
      svg = renderSvg(projectScene(scene), {
        href: h => new URL(h, 'https://github.com/org/repo/').href,
      });
    expect(scene.diagnostics.filter(d => d.level !== 'info')).toEqual([]);
    expect(svg).toContain(
      '<a href="https://github.com/org/repo/pull/1997" target="_blank" rel="noopener"><tspan',
    );
    const at = (s: string) => svg.indexOf(s);
    // The drawing, then the footnotes in file order, then the key.
    expect(at('moved retries')).toBeGreaterThan(at('>Queue<'));
    expect(at('Times are from')).toBeGreaterThan(at('moved retries'));
    expect(at('>Services<')).toBeGreaterThan(at('Times are from'));
    const y = (s: string) => Number(new RegExp(`y="([\\d.]+)"[^>]*>[^<]*${s}`).exec(svg)![1]);
    expect(y('Services')).toBeGreaterThan(y('Times are from'));
  });

  it('warns about a label that points at a missing marker, never heading-prose', () => {
    const codes = (s: string) => checkSource(s).diagnostics.map(d => d.code);
    expect(codes(SOURCE)).not.toContain('heading-prose');
    expect(codes(SOURCE.replace('[1]"', '[2]"'))).toContain('footnote-missing');
  });

  it('wraps linked text as its plain words wrap', () => {
    const type = headingTypes(resolveAppearance(defaultAppearance())).subtitle,
      text = 'See [the long design document](docs/design.md) before you change it.',
      lines = richLines(text, 120, type);
    expect(lines.map(l => l.map(r => r.text).join(''))).toEqual(
      richLines(plainText(text), 120, type).map(l => l[0].text),
    );
    const link = lines.flat().filter(r => r.href);
    expect(link.map(r => r.text).join(' ')).toBe('the long design document');
    expect(link[0].w).toBeCloseTo(measureText(link[0].text, type));
  });

  it('saves a canvas edit to its footnote line', () => {
    const scene = checkSource(SOURCE),
      before = projectScene(scene),
      after: Diagram = clone(before);
    setTextValue(after, textId('footnote', 1), 'Times are from production.');
    const out = translateEdit({
      source: readSource(SOURCE),
      scene,
      before: normalize(JSON.parse(JSON.stringify(before))),
      after: normalize(JSON.parse(JSON.stringify(after))),
      label: 'Edit',
      selection: [],
    });
    expect(printSource(out.source)).toBe(
      SOURCE.replace('Times are from the staging run.', 'Times are from production.'),
    );
  });
});
