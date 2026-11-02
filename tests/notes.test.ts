import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { checkSource } from '../src/dsl/compile';
import { sceneConflicts } from '../src/dsl/conflicts';
import { projectScene, visibleRects } from '../src/dsl/project';
import { overlaps } from '../src/model/geometry';
import { placeNotes } from '../src/model/note';

const SOURCE = `diagram "Plans" version=1
node ws "Workspace"
node plan "Plan"
node seat "Seat"
edge e1 ws -> plan
edge e2 ws -> seat
`;

describe('notes', () => {
  it('draws notes without moving anything, beside their object clear of the drawing', () => {
    const noted =
      SOURCE + 'note "A plan is one pricing tier."\nnote "Billed monthly." near=seat side=below\n';
    const at = (s: string) => checkSource(s).objects.map(o => [o.id, o.x, o.y]);
    expect(at(noted)).toEqual(at(SOURCE));
    const scene = checkSource(noted),
      doc = projectScene(scene),
      { rects } = visibleRects(doc),
      [frame, beside] = placeNotes(doc, scene.look, rects, []);
    expect(frame.inFrame).toBe(true);
    expect(beside.overlaps).toBeUndefined();
    expect(beside.rect.y).toBeGreaterThan(rects.get('seat')!.y + rects.get('seat')!.h);
    expect([...rects.values()].some(r => overlaps(r, beside.rect))).toBe(false);
    expect(renderSvg(doc)).toContain('Billed monthly.');
    expect(sceneConflicts(scene).some(d => d.code === 'note-overlap')).toBe(false);
  });

  it('rejects a note beside an unknown object', () => {
    expect(() => checkSource(SOURCE + 'note "x" near=nope\n')).toThrow(/Unknown node\/group nope/);
  });
});
