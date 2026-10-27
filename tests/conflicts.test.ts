import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { hintMoves, sceneConflicts } from '../src/dsl/conflicts';

const conflicts = async (lines: string[]) =>
  sceneConflicts(await compile(['diagram "Conflicts" version=1', ...lines].join('\n')));

describe('drawing conflicts', () => {
  it('blames the pin that boxes a line in, with new coordinates', async () => {
    // Pins close the target in on every side; the way in runs through w.
    const found = await conflicts([
      'node src "Source"',
      'node dst "Target"',
      'node n "North"',
      'node s "South"',
      'node e "East"',
      'node w "West"',
      'edge go src -> dst',
      'pin src x=0 y=200',
      'pin dst x=400 y=200',
      'pin n x=400 y=140',
      'pin s x=400 y=260',
      'pin w x=230 y=200',
      'pin e x=570 y=200',
    ]);
    const hit = found.find(d => d.code === 'edge-through-node')!;
    expect(hit.ids).toEqual(['go', 'w']);
    expect(hit.line).toBe(13);
    expect(hit.message).toMatch(/Remove the pin on line 13, or change it to x=230 y=\d+\./);
  });

  it('reports a pinned box on another scope’s member', async () => {
    const found = await conflicts([
      'group g "Payments"',
      'node a "Charge" in=g',
      'node x "Ledger"',
      'pin g x=200 y=100',
      'pin x x=230 y=150',
    ]);
    const overlap = found.find(d => d.code === 'node-overlap')!;
    expect(overlap.ids).toEqual(['a', 'x']);
    expect(overlap.line).toBe(6);
  });

  it('measures how far a refinement moved its target', async () => {
    const source = [
      'diagram "Moves" version=1',
      'node a "A"',
      'node b "B"',
      'edge e a -> b',
      'pin b x=300 y=200',
    ].join('\n');
    const { rows } = await hintMoves(source, await compile(source));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'b', hint: 'pin', line: 5, final: { x: 300, y: 200 } });
    expect(rows[0].delta).toBeGreaterThan(100);
  });
});
