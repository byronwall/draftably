import type { Model, Word } from './syntax';

export interface TimelineDates {
  at?: string;
  from?: string;
  to?: string;
  steps: string[];
  key?: string;
  introducedBy?: string;
  fixedBy?: string;
  platforms?: string;
  milestone?: boolean;
}
export interface TimelineRow extends TimelineDates {
  id: string;
  label: string;
  band: string;
  key: string;
}
export interface TimelineOptions {
  view?: 'focus' | 'log';
  today?: string;
  zoom?: [string, string];
}
export const dateAttrs = [
  'at',
  'from',
  'to',
  'steps',
  'key',
  'introduced-by',
  'fixed-by',
  'platforms',
  'milestone',
];
type Fail = (message: string) => never;
export function dateValue(value: string, fail: Fail) {
  const ms = Date.parse(value + 'T00:00:00Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(ms) ||
    new Date(ms).toISOString().slice(0, 10) !== value
  )
    fail('Expected a calendar date in YYYY-MM-DD format, got ' + value + '.');
  return value;
}

export function readTimelineOptions(attrs: Map<string, Word>, fail: Fail): TimelineOptions {
  const today = attrs.get('today')?.value;
  const zoom = attrs.get('zoom')?.value;
  const result: TimelineOptions = {};
  const view = attrs.get('view')?.value;
  if (view === 'log' || view === 'focus') result.view = view;
  else if (view !== undefined) fail('Use view=focus or view=log.');
  if (today !== undefined) result.today = dateValue(today, fail);
  if (zoom !== undefined && zoom !== 'none') {
    const parts = zoom.split('..');
    if (parts.length !== 2 || parts[0] >= parts[1])
      fail('Expected zoom=START..END with two increasing dates.');
    result.zoom = [dateValue(parts[0], fail), dateValue(parts[1], fail)];
  }
  return result;
}
export function readTimelineDates(attrs: Map<string, Word>, fail: Fail): TimelineDates | undefined {
  if (!dateAttrs.some(k => attrs.has(k))) return;
  const get = (k: string) => attrs.get(k)?.value;
  const at = get('at'),
    from = get('from'),
    to = get('to');
  if (
    at !== undefined
      ? from !== undefined || to !== undefined
      : from === undefined || to === undefined
  )
    fail('Use at=DATE or both from=DATE and to=DATE.');
  if (at !== undefined) dateValue(at, fail);
  if (from !== undefined) dateValue(from.replace(/^\?/, ''), fail);
  if (to !== undefined && to !== 'open') dateValue(to, fail);
  const milestone = get('milestone');
  if (milestone !== undefined && (at === undefined || milestone !== 'on'))
    fail('Use milestone=on on a dated point.');
  const steps =
    get('steps')
      ?.split(',')
      .map(v => dateValue(v, fail)) ?? [];
  if (steps.length && !from) fail('Steps belong to a span.');
  return {
    at,
    from,
    to,
    steps,
    milestone: milestone === 'on',
    key: get('key'),
    introducedBy: get('introduced-by'),
    fixedBy: get('fixed-by'),
    platforms: get('platforms'),
  };
}
export function validateSpan(d: TimelineDates, today: string | undefined, fail: Fail) {
  if (!d.from) return;
  const start = d.from.replace(/^\?/, ''),
    end = d.to === 'open' ? today : d.to;
  if (!end) fail('An open span needs layout root timeline today=DATE.');
  if (start > end) fail('The span ends before it starts.');
  if (d.steps.some((v, i) => v <= (d.steps[i - 1] ?? start) || v >= end))
    fail('Steps must increase strictly inside the span.');
}
export function timelineRows(model: Model): TimelineRow[] {
  const labels = new Map(model.objects.map(o => [o.id, o.label]));
  return model.objects.flatMap(o =>
    o.dates
      ? [
          {
            ...o.dates,
            id: o.id,
            label: o.label,
            key: o.dates.key ?? o.id,
            band: labels.get(o.parent) ?? 'Diagram',
          },
        ]
      : [],
  );
}
