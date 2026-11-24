import { describe, expect, it } from 'vitest';
import type { TimelineRow } from '../src/dsl/timeline';
import { groupRows, logPlan, snapshotStatus } from '../src/dsl/timeline-log';

function row(overrides: Partial<TimelineRow> & Pick<TimelineRow, 'id' | 'label'>): TimelineRow {
  return {
    band: overrides.band ?? 'Billing',
    key: overrides.key ?? overrides.id,
    steps: overrides.steps ?? [],
    ...overrides,
  };
}

describe('ordinal timeline log', () => {
  it('puts every event on one date in the same group', () => {
    const groups = groupRows([
      row({ id: 'invoice', label: 'Invoice observation', at: '2026-11-03' }),
      row({ id: 'patch', label: 'Code change', at: '2026-11-03' }),
      row({
        id: 'release',
        label: 'Release 2.4',
        at: '2026-11-04',
        milestone: true,
      }),
    ]);

    expect(groups.map(group => group.date)).toEqual(['2026-11-03', '2026-11-04']);
    expect(groups[0].events.map(event => event.row.id)).toEqual(['invoice', 'patch']);
  });

  it('labels an ordinary point as an event and keeps an unknown start explicit', () => {
    const plan = logPlan(
      [
        row({ id: 'invoice', label: 'Invoice observation', at: '2026-11-03' }),
        row({
          id: 'bug',
          label: 'Intermittent timeout',
          from: '?2026-11-03',
          to: 'open',
        }),
      ],
      { today: '2026-11-10' },
    );
    const labels = plan.marks.filter(mark => mark.kind === 'text').map(mark => mark.text);

    expect(labels).toContain('Event');
    expect(labels).not.toContain('Release');
    expect(labels).toContain('Started before');
    expect(labels).toContain('Exact start unknown · began before this date');
  });

  it('shows spans on today with an explicit status for a same-day end', () => {
    const ongoing = row({
      id: 'ongoing',
      label: 'Current issue',
      from: '2026-11-01',
      to: 'open',
    });
    const ending = row({
      id: 'ending',
      label: 'Issue ending today',
      from: '2026-11-01',
      to: '2026-11-10',
    });
    const old = row({
      id: 'old',
      label: 'Resolved issue',
      from: '2026-11-01',
      to: '2026-11-09',
    });

    expect(snapshotStatus(ongoing, '2026-11-10')).toBe('Active');
    expect(snapshotStatus(ending, '2026-11-10')).toBe('Ends today');
    expect(snapshotStatus(old, '2026-11-10')).toBeUndefined();

    const plan = logPlan([ongoing, ending, old], { today: '2026-11-10' });
    const snapshotText = plan.marks.filter(mark => mark.kind === 'text').map(mark => mark.text);
    expect(snapshotText).toContain('2 spans overlap this date');
    expect(snapshotText).toContain('Ends today');
    expect(plan.boxes.ongoing).toBeDefined();
    expect(plan.boxes.ending).toBeDefined();
    expect(plan.boxes.old).toBeDefined();
  });

  it('does not invent a today snapshot when no date is configured', () => {
    const plan = logPlan(
      [row({ id: 'invoice', label: 'Invoice observation', at: '2026-11-03' })],
      {},
    );
    const labels = plan.marks.filter(mark => mark.kind === 'text').map(mark => mark.text);

    expect(labels.some(label => label.startsWith('TODAY'))).toBe(false);
    expect(labels).not.toContain('TODAY');
    expect(plan.height).toBeGreaterThan(72);
  });
});
