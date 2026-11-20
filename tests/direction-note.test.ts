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
