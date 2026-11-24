import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { printSource, readSource, parseModel } from '../src/dsl/syntax';
import { statements } from '../src/dsl/source-edits';
import {
  timelineLayout,
  validateTimelineDraft,
  writeTimelineDrafts,
  type TimelineDraft,
} from '../src/dsl/timeline-settings';

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
          {
            kind: 'point',
            start: '2025-01-11',
            end: '',
            unknown: false,
            open: false,
            steps: '',
            label: '',
          },
        ],
        [
          'b',
          {
            kind: 'point',
            start: '2025-01-13',
            end: '',
            unknown: false,
            open: false,
            steps: '',
            label: '',
          },
        ],
        [
          ':new',
          {
            kind: 'point',
            start: '2025-01-14',
            end: '',
            unknown: false,
            open: false,
            steps: '',
            label: 'Review',
          },
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
    expect(model.objects.find(o => o.id === 'event1')?.label).toBe('Review');
    expect(model.objects.find(o => o.id === 'event1')?.dates?.at).toBe('2025-01-14');
    expect(statements(doc).filter(line => line.command === 'node')).toHaveLength(3);
  });

  it('converts every shipped example root layout to a parser-valid timeline layout', () => {
    const examples = readdirSync('examples').filter(file => file.endsWith('.draft'));
    expect(examples).toHaveLength(33);
    for (const file of examples) {
      const doc = readSource(readFileSync(`examples/${file}`, 'utf8'));
      expect(() => parseModel(printSource(doc)), `${file} source`).not.toThrow();
      timelineLayout(doc);
      const root = statements(doc).find(
        line => line.command === 'layout' && line.args[0]?.value === 'root',
      );
      expect(root, file).toBeDefined();
      expect(() => parseModel(printSource({ lines: [root!] })), `${file} root`).not.toThrow();
    }
  });

  it('checks start, step order, end, and snapshot bounds before writing drafts', () => {
    const base: TimelineDraft = {
      kind: 'span',
      start: '2025-01-01',
      end: '2025-01-10',
      unknown: false,
      open: false,
      steps: '2025-01-03, 2025-01-05',
      label: 'Review',
    };
    expect(validateTimelineDraft('a', base, '2025-01-10')).toBeUndefined();
    expect(validateTimelineDraft('a', { ...base, end: base.start, steps: '' }, '2025-01-10')).toBe(
      undefined,
    );
    expect(validateTimelineDraft('a', { ...base, start: '' }, '2025-01-10')?.field).toBe('start');
    expect(
      validateTimelineDraft(
        'a',
        { ...base, start: 'not-a-date', steps: '2025-01-03' },
        '2025-01-10',
      )?.field,
    ).toBe('start');
    expect(validateTimelineDraft('a', { ...base, steps: '2025-01-01' }, '2025-01-10')?.field).toBe(
      'steps',
    );
    expect(
      validateTimelineDraft('a', { ...base, steps: '2025-01-05, 2025-01-03' }, '2025-01-10')?.field,
    ).toBe('steps');
    expect(validateTimelineDraft('a', { ...base, end: '2025-01-04' }, '2025-01-10')?.field).toBe(
      'steps',
    );
    expect(
      validateTimelineDraft('a', { ...base, open: true, steps: '2025-01-05' }, '2025-01-05')?.field,
    ).toBe('steps');
    expect(validateTimelineDraft('a', { ...base, open: true }, undefined)?.field).toBe('snapshot');
    expect(validateTimelineDraft('a', { ...base, open: true }, '2025-02-29')?.field).toBe(
      'snapshot',
    );
    expect(
      validateTimelineDraft(
        ':new',
        { ...base, kind: 'undated', start: '', end: '', steps: '' },
        undefined,
      ),
    ).toBeUndefined();
    expect(
      validateTimelineDraft(
        ':new',
        { ...base, label: '', start: '2025-01-08', end: '', steps: '' },
        undefined,
      )?.field,
    ).toBe('label');
    expect(
      validateTimelineDraft(
        ':new',
        {
          kind: 'point',
          start: '',
          end: '',
          unknown: false,
          open: false,
          steps: '',
          label: '',
        },
        undefined,
      ),
    ).toBeUndefined();
  });

  it('reports an incomplete new draft without writing any edits, then allows it to be discarded', () => {
    const doc = readSource('layout root timeline today=2025-01-31\nnode b "B" at=2025-01-12\n');
    timelineLayout(doc);
    const drafts = new Map<string, TimelineDraft>([
      [
        'b',
        {
          kind: 'point',
          start: '2025-01-13',
          end: '',
          unknown: false,
          open: false,
          steps: '',
          label: '',
        },
      ],
      [
        ':new',
        {
          kind: 'point',
          start: '',
          end: '',
          unknown: false,
          open: false,
          steps: '',
          label: 'Review',
        },
      ],
    ]);

    expect(writeTimelineDrafts(doc, drafts)).toMatchObject({ id: ':new', field: 'start' });
    expect(parseModel(printSource(doc)).objects.find(o => o.id === 'b')?.dates?.at).toBe(
      '2025-01-12',
    );
    drafts.delete(':new');
    expect(writeTimelineDrafts(doc, drafts)).toBeUndefined();
    expect(parseModel(printSource(doc)).objects.find(o => o.id === 'b')?.dates?.at).toBe(
      '2025-01-13',
    );
  });
});
