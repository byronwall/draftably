import { describe, expect, it } from 'vitest';
import { printSource, readSource, parseModel } from '../src/dsl/syntax';
import { statements } from '../src/dsl/source-edits';
import { timelineLayout, writeTimelineDrafts } from '../src/dsl/timeline-settings';

describe('timeline settings edits', () => {
  it('retains root layout attributes and commits drafts for every edited item', () => {
    const doc = readSource(
      [
        'layout root flow direction=down min-width=600 gap=150',
        'node a "A" at=2025-01-10',
        'node b "B" at=2025-01-12',
        '',
      ].join('\n'),
    );
    const root = timelineLayout(doc);
    root.attrs.push(['today', { value: '2025-01-31', quoted: false }]);
    writeTimelineDrafts(
      doc,
      new Map([
        [
          'a',
          { kind: 'point', start: '2025-01-11', end: '', unknown: false, open: false, steps: '' },
        ],
        [
          'b',
          { kind: 'point', start: '2025-01-13', end: '', unknown: false, open: false, steps: '' },
        ],
      ]),
    );
    const source = printSource(doc),
      model = parseModel(source);

    expect(source).toContain(
      'layout root timeline direction=down min-width=600 gap=150 today=2025-01-31',
    );
    expect(model.objects.find(o => o.id === 'a')?.dates?.at).toBe('2025-01-11');
    expect(model.objects.find(o => o.id === 'b')?.dates?.at).toBe('2025-01-13');
    expect(statements(doc).filter(line => line.command === 'node')).toHaveLength(2);
  });
});
