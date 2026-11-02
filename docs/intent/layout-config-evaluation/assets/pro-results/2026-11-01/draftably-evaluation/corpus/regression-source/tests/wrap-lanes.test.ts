import { describe, expect, it } from 'vitest';
import { crossings, fewestCrossings } from '../src/dsl/compile';
import { laneBends } from '../src/model/routes';

const a = { x: 400, y: 0, w: 100, h: 50 },
  b = { x: 0, y: 200, w: 100, h: 50 };

describe('wrap lanes', () => {
  it('bends a wrap down to its lane, back along it, and down into the target', () => {
    // Turns sit inside the corners the line runs toward, so any port on either side runs on.
    expect(laneBends({ lane: { y: 120 } }, a, b).waypoints).toEqual([
      { x: 412, y: 120 },
      { x: 88, y: 120 },
    ]);
  });

  it('fixes the sides the lane leaves and arrives by', () => {
    expect(laneBends({ lane: { y: 120 } }, a, b)).toMatchObject({
      fromSide: 'bottom',
      toSide: 'top',
    });
    expect(laneBends({ lane: { y: 120, leave: 520, enter: -20 } }, a, b)).toMatchObject({
      fromSide: 'right',
      toSide: 'left',
    });
  });

  it('turns beside the source and target when the lane says to', () => {
    expect(laneBends({ lane: { y: 120, leave: 520, enter: -20 } }, a, b).waypoints).toEqual([
      { x: 520, y: 38 },
      { x: 520, y: 120 },
      { x: -20, y: 120 },
      { x: -20, y: 212 },
    ]);
  });

  it('ignores a lane that no longer lies between its ends, or an edge with its own bends', () => {
    expect(laneBends({ lane: { y: 300 } }, a, b)).toEqual({});
    const own = [{ x: 10, y: 10 }];
    expect(laneBends({ lane: { y: 120 }, waypoints: own }, a, b)).toEqual({ waypoints: own });
  });

  it('orders lanes so the returns cross least', () => {
    // The return that starts further along also ends further along: it takes the lower lane, so
    // neither return runs through the other.
    const paths = (order: string[]) =>
      order.map((id, i) => {
        const [s, t] = id === 'far' ? [900, 300] : [600, 50],
          v = 100 + 20 * i;
        return [
          { u: s, v: 0 },
          { u: s, v },
          { u: t, v },
          { u: t, v: 200 },
        ];
      });
    expect(crossings(paths(['far', 'near']))).toBe(2);
    expect(fewestCrossings(['far', 'near'], o => crossings(paths(o)))).toEqual(['near', 'far']);
  });
});
