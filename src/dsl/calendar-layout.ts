import { logPlan } from './timeline-log';
import type { Diagram } from '../model/types';
import { resolveAppearance } from '../model/appearance';
import { focusPlan } from './timeline-focus';
import {
  type TimelineRow,
  type TimelineOptions,
  readTimelineDates,
  readTimelineOptions,
  validateSpan,
} from './timeline';
import type { PlacedTimeline } from './timeline-plan';

/** Persist authored calendar facts. Drawing a comparison or a selection uses its own graph. */
export interface CalendarLayout {
  x: number;
  bottom: number;
  rows: TimelineRow[];
  options: TimelineOptions;
}
export function calendarFor(doc: Diagram): PlacedTimeline | undefined {
  const data = doc.layout.timeline;
  if (!data) return;
  const nodes = new Map(doc.graph.nodes.map(n => [n.id, n]));
  const groups = new Map(doc.graph.groups.map(g => [g.id, g.title]));
  const stored = new Map(data.rows.map(row => [row.id, row]));
  const rows = data.rows.flatMap(row => {
    const n = nodes.get(row.id);
    if (!n) return [];
    const current = n.dates
      ? {
          ...n.dates,
          id: n.id,
          key: n.dates.key ?? n.id,
          label: n.title,
          band: groups.get(n.parentId ?? '') ?? 'Diagram',
        }
      : row;
    return [{ ...current, label: n.title, band: groups.get(n.parentId ?? '') ?? 'Diagram' }];
  });
  for (const n of doc.graph.nodes) {
    if (!n.dates || stored.has(n.id)) continue;
    rows.push({
      ...n.dates,
      id: n.id,
      key: n.dates.key ?? n.id,
      label: n.title,
      band: groups.get(n.parentId ?? '') ?? 'Diagram',
    });
  }
  const plan = data.options.view === 'log' ? logPlan(rows, data.options) : focusPlan(rows, data.options, resolveAppearance(doc.appearance).annotation.face);
  return { ...plan, x: data.x, y: data.bottom - plan.height };
}
export function validateCalendar(data: CalendarLayout) {
  const fail = (msg: string): never => {
    throw Error('Invalid timeline: ' + msg);
  };
  if (!Array.isArray(data.rows) || !data.options || ![data.x, data.bottom].every(Number.isFinite))
    fail('invalid placement.');
  const attrs = (pairs: Record<string, string | undefined>) =>
    new Map(
      Object.entries(pairs).flatMap(([k, v]) =>
        v === undefined ? [] : ([[k, { value: v, quoted: false }]] as const),
      ),
    );
  const opts = readTimelineOptions(
    attrs({ ...data.options, zoom: data.options.zoom?.join('..') }),
    fail,
  );
  for (const row of data.rows) {
    if (
      !row ||
      [row.id, row.label, row.key, row.band].some(v => typeof v !== 'string') ||
      !Array.isArray(row.steps)
    )
      fail('invalid item.');
    const dates = readTimelineDates(
      attrs({
        at: row.at,
        from: row.from,
        to: row.to,
        steps: row.steps.length ? row.steps.join(',') : undefined,
      }),
      fail,
    );
    if (!dates) fail('expected dated item.');
    else validateSpan(dates, opts.today, fail);
  }
}
