import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { resolveAppearance } from '../src/model/appearance';
import { drawnShade } from '../src/model/colors';

const drawn = (source: string) => {
  const doc = projectScene(checkSource(source)),
    look = resolveAppearance(doc.appearance);
  return (id: string) => drawnShade(doc, look, id);
};

describe('drawn colors', () => {
  it('steps nested containers of one family instead of repeating the fill', () => {
    const shade = drawn(`diagram "Nest" version=1
group outer "Outer" color=red
group middle "Middle" in=outer
group inner "Inner" in=middle color=red
node a "A" in=inner
`);
    expect([shade('outer'), shade('middle'), shade('inner')]).toEqual([100, 200, 300]);
    // The default 500 is two steps from a 300 frame, so the shape takes 600.
    expect(shade('a')).toBe(600);
  });

  it('moves a pale member clear of a container in its own family', () => {
    const shade = drawn(`diagram "Verify" version=1
group verify "Verify" color=rose
node check "Check" in=verify shade=100
node far "Far" in=verify shade=200
node other "Other" in=verify color=blue shade=100
`);
    expect(shade('check')).toBe(400);
    expect(shade('far')).toBe(400);
    expect(shade('other')).toBe(100);
  });

  it('steps toward lighter shades in a dark theme', () => {
    const shade = drawn(`diagram "Dark" version=1
theme blueprint
group outer "Outer" color=teal
group inner "Inner" in=outer
`);
    expect([shade('outer'), shade('inner')]).toEqual([900, 800]);
  });

  it('keeps an explicit shade that already stands apart', () => {
    const shade = drawn(`diagram "Apart" version=1
group g "G" color=amber
node a "A" in=g shade=700
group h "H" in=g shade=50
`);
    expect(shade('a')).toBe(700);
    // One step paler than its frame reads as the same fill, so it steps past the frame instead.
    expect(shade('h')).toBe(200);
  });
});
