import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { directionNotes } from '../src/cli/direction-note';
import { penaltyNotes } from '../src/cli/penalty-note';
import { draw } from '../src/cli/variants';

const down = `node a "Start"
group first "First collection"
node b "Middle" in=first
group last "Additional collection"
node c "Finish" in=last
size b width=100 height=72
edge ab a -> b
edge bc b -> c kind=async
layout root engine=compound-flow direction=down fit=slide`;

describe('check --metrics direction note', () => {
  it('names the other direction when it removes most bends, and stays quiet when it does not', async () => {
    const [note] = await directionNotes(down, await draw(down));
    expect(note?.message).toMatch(/^direction=right draws 0 bends instead of \d+/);
    const right = down.replace('direction=down', 'direction=right');
    expect(await directionNotes(right, await draw(right))).toEqual([]);
  });

  it('names the rightward compound-flow line for a chain through groups with no direction (#601)', async () => {
    const spring = `node a "First step"
group middle "Middle group"
node b "Second step" in=middle
group last "Last group"
node c "Final step" in=last
size a width=164 height=72
size b width=212 height=71
size c width=264 height=71
edge ab a -> b
edge bc b -> c kind=async
layout root engine=compound-spring aspect=1.6 fit=slide`;
    const [note] = await directionNotes(spring, await draw(spring));
    expect(note?.message).toMatch(
      /`layout root engine=compound-flow aspect=1\.6 fit=slide direction=right` draws it straight: 0 bends instead of [2-9]/,
    );
    const branched = `${spring}\nnode d "Side"\nedge ad a -> d`;
    expect(await directionNotes(branched, await draw(branched))).toEqual([]);
  });
});

describe('check --metrics crossing-penalty note', () => {
  it('names the line a high crossing penalty sends round others (#608)', async () => {
    const source = fs.readFileSync(
      'docs/intent/diagram-quality/issues/i608-detour-vs-crossing/v0.draft',
      'utf8',
    );
    const [note] = await penaltyNotes(source, await draw(source));
    expect(note?.code).toBe('crossing-detour');
    expect(note?.ids).toEqual(['e7']);
    const plain = source.replace('crossing-penalty=900', 'crossing-penalty=360');
    expect(await penaltyNotes(plain, await draw(plain))).toEqual([]);
  });
});
