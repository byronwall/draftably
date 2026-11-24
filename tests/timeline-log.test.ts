import { describe, expect, it } from 'vitest';
import { contrast, resolveAppearance } from '../src/model/appearance';
import { measureText, typeProfile } from '../src/model/fonts';
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

  it('uses readable ink for the snapshot date and event-kind labels in Blueprint', () => {
    const look = resolveAppearance({
      theme: 'blueprint',
      overrides: { canvas: '#FFFFFF' },
      colors: [],
    });
    const rows = [
      row({ id: 'event', label: 'Invoice observation', at: '2028-04-10' }),
      row({ id: 'start', label: 'Code change', from: '2028-04-01', to: 'open' }),
      row({ id: 'milestone', label: 'Release 2.4', at: '2028-04-10', milestone: true }),
    ];
    const plan = logPlan(rows, { today: '2028-04-10' }, look.annotation.role);
    const labels = plan.marks.filter(mark => mark.kind === 'text');
    const toneFor = (value: string) =>
      labels.find(mark => mark.kind === 'text' && mark.text === value)?.tone;

    expect(toneFor('TODAY · Apr 10, 2028')).toBe('shade-ink');
    expect(toneFor('TODAY')).toBe('ink');
    expect(toneFor('Apr 10, 2028')).toBe('ink');
    expect(toneFor('Event')).toBe('ink');
    expect(toneFor('Starts')).toBe('ink');
    expect(toneFor('Milestone')).toBe('shade-ink');
    expect(toneFor('Release 2.4')).toBe('shade-ink');
    expect(contrast(look.group.ink, look.group.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(look.text, look.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps a complete snapshot label when its measured width fits the field', () => {
    const look = resolveAppearance({ theme: 'signal', overrides: {}, colors: [] });
    const label = 'Windows installer 2.4.1';
    const profile = typeProfile(look.annotation.role, true, 10, 12);
    expect(measureText(label, profile)).toBeLessThanOrEqual(142);

    const plan = logPlan(
      [row({ id: 'installer', label, from: '2028-04-01', to: 'open' })],
      { today: '2028-04-10' },
      look.annotation.role,
    );
    const snapshotLabel = plan.marks.find(
      mark => mark.kind === 'text' && mark.id === 'installer' && mark.y === 83,
    );

    expect(snapshotLabel).toMatchObject({ kind: 'text', text: label, title: label });
  });

  it('truncates a very long snapshot label in one bounded scan', () => {
    const look = resolveAppearance({ theme: 'signal', overrides: {}, colors: [] });
    const label = 'Data '.repeat(4_000);
    const plan = logPlan(
      [row({ id: 'large', label, from: '2028-04-01', to: 'open' })],
      { today: '2028-04-10' },
      look.annotation.role,
    );
    const snapshotLabel = plan.marks.find(
      mark => mark.kind === 'text' && mark.id === 'large' && mark.y === 83,
    );

    expect(snapshotLabel?.kind).toBe('text');
    if (snapshotLabel?.kind === 'text') {
      expect(snapshotLabel.text.endsWith('…')).toBe(true);
      expect(
        measureText(snapshotLabel.text, typeProfile(look.annotation.role, true, 10, 12)),
      ).toBeLessThanOrEqual(142);
    }
  });
});
