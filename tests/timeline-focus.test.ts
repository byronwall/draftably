import { describe, expect, it } from 'vitest';
import { focusPlan } from '../src/dsl/timeline-focus';
import type { TimelineRow } from '../src/dsl/timeline';

const row = (value: Partial<TimelineRow> & Pick<TimelineRow, 'id' | 'label'>): TimelineRow => ({
  band: 'API',
  key: value.id,
  steps: [],
  ...value,
});

describe('timeline focus geometry', () => {
  it('draws an unknown-start bar to its real end and an open bar to the snapshot', () => {
    const rows = [
      row({
        id: 'uncertain',
        label: 'Long running change',
        from: '?2025-07-10',
        to: '2025-08-01',
        steps: ['2025-07-15'],
      }),
      row({
        id: 'open',
        label: 'Still active',
        from: '2025-07-01',
        to: 'open',
      }),
    ];
    const plan = focusPlan(rows, {
      today: '2025-08-15',
      zoom: ['2025-07-01', '2025-09-01'],
    });
    const graphX = 310,
      graphW = plan.width - graphX - 28;
    const scale = (date: string) =>
      graphX +
      ((Date.parse(`${date}T00:00:00Z`) - Date.parse('2025-07-01T00:00:00Z')) / (62 * 86_400_000)) *
        graphW;
    const leadIn = plan.marks.find(
      m => m.kind === 'line' && m.id === 'uncertain' && m.strokeWidth === 5 && m.dash,
    )!;
    const known = plan.marks.find(
      m => m.kind === 'line' && m.id === 'uncertain' && m.strokeWidth === 5 && !m.dash,
    )!;
    const open = plan.marks.find(m => m.kind === 'line' && m.id === 'open' && m.strokeWidth === 5)!;
    expect(leadIn).toMatchObject({
      kind: 'line',
      x: graphX,
      x2: scale('2025-07-10'),
      dash: true,
    });
    expect(known).toMatchObject({
      kind: 'line',
      x: scale('2025-07-10'),
      x2: scale('2025-08-01'),
      title: 'Known duration after 2025-07-10 to 2025-08-01',
    });
    expect(plan.marks.some(m => m.kind === 'text' && m.text === 'before 2025-07-10')).toBe(true);
    expect(open).toMatchObject({
      kind: 'line',
      x: scale('2025-07-01'),
      x2: scale('2025-08-15'),
    });
    expect(plan.marks.some(m => m.id === 'uncertain' && m.title === 'Step 2025-07-15')).toBe(true);
  });

  it('keeps out-of-window today and release guides out of the detail edges', () => {
    const rows = [
      row({
        id: 'release',
        label: 'Release 2',
        at: '2025-10-15',
        milestone: true,
      }),
    ];
    const plan = focusPlan(rows, {
      today: '2025-10-20',
      zoom: ['2025-08-01', '2025-09-01'],
    });
    const todayLines = plan.marks.filter(m => m.kind === 'line' && m.title === 'Snapshot date');
    expect(todayLines).toHaveLength(1); // Overview only.
    const releaseLines = plan.marks.filter(
      m => m.kind === 'line' && m.id === 'release' && m.tone === 'release',
    );
    expect(releaseLines).toHaveLength(1); // Overview only.
    expect(plan.boxes.release).toBeDefined();
  });

  it('layers release guides over row fills and keeps clipped endpoint dates visible', () => {
    const rows = [
      row({
        id: 'history',
        label: 'Old open range',
        from: '2024-10-13',
        to: 'open',
      }),
      row({
        id: 'release',
        label: 'Release',
        at: '2025-11-10',
        milestone: true,
      }),
    ];
    const plan = focusPlan(rows, {
      today: '2025-11-23',
      zoom: ['2025-11-03', '2025-11-23'],
    });
    const rowFill = plan.marks.findIndex(m => m.kind === 'rect' && m.id === 'history');
    const guide = plan.marks.findIndex(
      m => m.kind === 'line' && m.id === 'release' && m.tone === 'release' && m.y > 164,
    );
    const rangeBar = plan.marks.findIndex(
      m => m.kind === 'line' && m.id === 'history' && m.strokeWidth === 5,
    );
    expect(rowFill).toBeLessThan(guide);
    expect(guide).toBeLessThan(rangeBar);
    expect(plan.marks.some(m => m.kind === 'text' && m.text === '← 2024-10-13')).toBe(true);
  });

  it('uses full history without an explicit zoom and includes row metadata in the plan', () => {
    const plan = focusPlan(
      [
        row({
          id: 'old',
          label: 'Old event',
          at: '2024-02-12',
          introducedBy: '#619',
          fixedBy: '#621',
          platforms: 'linux, macOS',
        }),
      ],
      { today: '2025-01-01' },
    );
    expect(plan.marks.some(m => m.kind === 'text' && m.text === 'FULL HISTORY')).toBe(true);
    expect(
      plan.marks.some(
        m => m.kind === 'text' && m.text.includes('added #619 · fixed #621 · linux, macOS'),
      ),
    ).toBe(true);
    expect(plan.marks.some(m => m.kind === 'dot' && m.id === 'old')).toBe(true);
    expect(plan.boxes.old.h).toBeGreaterThan(0);
  });

  it('shows future closed-span steps and draws a snapshot guide only for authored today', () => {
    const rows = [
      row({
        id: 'future',
        label: 'Planned work',
        from: '2025-06-01',
        to: '2025-07-20',
        steps: ['2025-07-10'],
      }),
    ];
    const plan = focusPlan(rows, { today: '2025-07-01' });
    expect(plan.marks.some(m => m.title === 'Step 2025-07-10')).toBe(true);
    expect(plan.marks.filter(m => m.title === 'Snapshot date')).toHaveLength(2);
    const inferred = focusPlan(rows);
    expect(inferred.marks.some(m => m.title === 'Snapshot date')).toBe(false);
  });

  it('bounds long-range ticks and clips long labels while preserving hover text', () => {
    const label =
      'A very long release investigation label that should not run into the timeline chart';
    const plan = focusPlan([row({ id: 'long', label, from: '2000-01-01', to: '2025-01-01' })], {
      today: '2025-01-01',
    });
    const contextTicks = plan.marks.filter(m => m.kind === 'text' && m.y === 135);
    expect(contextTicks.length).toBeGreaterThan(0);
    expect(contextTicks.length).toBeLessThanOrEqual(8);
    const name = plan.marks.find(m => m.kind === 'text' && m.id === 'long' && m.title === label)!;
    expect(name.kind).toBe('text');
    if (name.kind === 'text') expect(name.text.endsWith('…')).toBe(true);
    expect(name.title).toBe(label);
  });

  it('stores arbitrary IDs safely in the hit-box map', () => {
    const plan = focusPlan([row({ id: '__proto__', label: 'Prototype key' })]);
    expect(Object.getPrototypeOf(plan.boxes)).toBeNull();
    expect(Object.hasOwn(plan.boxes, '__proto__')).toBe(true);
  });
});
