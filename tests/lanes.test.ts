import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSource } from '../src/dsl/compile';

const lanes = readFileSync(path.join(__dirname, '../examples/support-lanes.draft'), 'utf8');

describe('swim lanes', () => {
  it('put each step in its own lane, at one rank column across every lane', () => {
    const scene = checkSource(lanes),
      at = (id: string) => scene.byId.get(id)!;
    for (const o of scene.objects.filter(o => o.type === 'node')) {
      const lane = at(o.parent);
      expect(o.x).toBeGreaterThanOrEqual(lane.x);
      expect(o.y).toBeGreaterThanOrEqual(lane.y);
      expect(o.x + o.w).toBeLessThanOrEqual(lane.x + lane.w);
      expect(o.y + o.h).toBeLessThanOrEqual(lane.y + lane.h);
    }
    // Both branches of the outage check share a column, though they sit in different lanes.
    expect(at('link').x).toBe(at('triage').x);
    expect(at('classify').x).toBeGreaterThan(at('opens').x);
    expect(at('resolved').x).toBeGreaterThan(at('priority').x);
    // Lanes are stacked bands of one length, in file order.
    const bands = ['customer', 'bot', 'agents', 'billing_team'].map(at);
    expect(new Set(bands.map(b => b.w)).size).toBe(1);
    bands.slice(1).forEach((b, i) => expect(b.y).toBe(bands[i].y + bands[i].h));
  });

  it('need every node in a lane', () => {
    expect(() =>
      checkSource('group a "A"\nnode x "X" in=a\nnode y "Y"\nlayout root lanes'),
    ).toThrow(/every node sits in a lane; put y/);
    expect(() => checkSource('group a "A"\nnode x "X" in=a\nlayout a lanes')).toThrow(
      /layout root lanes/,
    );
  });
});
