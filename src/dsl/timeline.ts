/**
 * `layout root timeline`: every node is a row placed on a real date axis, every top-level group
 * a band of rows, and every `milestone` a rule across the bands. The layout is one display list
 * (`model/timeline.ts`) that the canvas and the SVG export both draw.
 */
import type { ResolvedAppearance } from '../model/appearance';
import { measureText, truncateText } from '../model/fonts';
import {
  timelineFont,
  type TimelineFont,
  type TimelineInk,
  type TimelineMark,
  type TimelinePlan,
} from '../model/timeline';
import type { Rect } from '../model/types';
import type { ModelEdge, ModelObject, Word } from './syntax';

/** A node's place in time. Days count from 1970-01-01 (UTC). */
export interface TimelineWhen {
  at?: number;
  from?: number;
  /** `from=?DATE`: the span began some time before `from`. */
  fromUnknown?: boolean;
  /** A day, or `open` for a span that runs on past `today`. */
  to?: number | 'open';
  steps: number[];
  milestone?: boolean;
  key?: string;
  detail?: string;
  tag?: string;
  startLabel?: string;
  endLabel?: string;
  /** Spans: how much is done, from 0 to 1. */
  progress?: number;
}

export interface TimelineOptions {
  today?: number;
  zoom?: [number, number];
  /** Width of the date axis. */
  width: number;
  /** `ordinal`: every distinct date takes one equal step, and long gaps are labeled. */
  scale: 'linear' | 'ordinal';
  /** Column headings over the gutter: the name column, then the tag column. */
  headers?: string[];
}

/** Node attributes a timeline reads. */
export const TIMELINE_ATTRS = [
  'at',
  'from',
  'to',
  'steps',
  'key',
  'detail',
  'tag',
  'start-label',
  'end-label',
  'progress',
];

type Fail = (message: string) => never;
const DAY = 86_400_000;

export function dayOf(value: string, fail: Fail): number {
  const ms = Date.parse(value + 'T00:00:00Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(ms) ||
    new Date(ms).toISOString().slice(0, 10) !== value
  )
    fail(`Expected a date as YYYY-MM-DD; got ${value}.`);
  return Math.round(ms / DAY);
}

const dateOf = (day: number) => new Date(day * DAY);

/** The same day of the month, n months on (clamped to the month's last day). */
function addMonths(day: number, n: number) {
  const d = dateOf(day),
    m = d.getUTCMonth() + n,
    year = d.getUTCFullYear() + Math.floor(m / 12),
    month = ((m % 12) + 12) % 12;
  const end = new Date(0);
  end.setUTCFullYear(year, month + 1, 0);
  const out = new Date(0);
  out.setUTCFullYear(year, month, Math.min(d.getUTCDate(), end.getUTCDate()));
  return Math.round(out.getTime() / DAY);
}

export function readTimelineOptions(attrs: Map<string, Word>, fail: Fail): TimelineOptions {
  const today = attrs.get('today')?.value,
    zoom = attrs.get('zoom')?.value,
    width = attrs.get('width')?.value,
    scale = attrs.get('scale')?.value,
    headers = attrs.get('headers')?.value;
  const out: TimelineOptions = { width: 880, scale: 'linear' };
  if (scale !== undefined) {
    if (scale !== 'linear' && scale !== 'ordinal')
      fail(`Expected scale=linear or scale=ordinal; got ${scale}.`);
    out.scale = scale;
  }
  if (headers !== undefined) out.headers = headers.split('|').map(h => h.trim());
  if (out.scale === 'ordinal' && zoom !== undefined && zoom !== 'none')
    fail('scale=ordinal already gives every date room; remove zoom=.');
  if (today !== undefined) out.today = dayOf(today, fail);
  if (zoom !== undefined && zoom !== 'none') {
    const parts = zoom.split('..');
    if (parts.length !== 2) fail(`Expected zoom=START..END, such as zoom=2025-11-03..2025-11-23.`);
    const [a, b] = parts.map(p => dayOf(p, fail));
    if (a >= b) fail('zoom= needs its start before its end.');
    out.zoom = [a, b];
  }
  if (width !== undefined) {
    const n = Number(width);
    if (!Number.isFinite(n) || n < 240 || n > 4000)
      fail(`Expected width= from 240 to 4000; got ${width}.`);
    out.width = n;
  }
  return out;
}

/** The dates and row text a node line gives, or nothing when it names no date. */
export function readWhen(
  attrs: Map<string, Word>,
  fail: Fail,
  milestone = false,
): TimelineWhen | undefined {
  if (!TIMELINE_ATTRS.some(k => attrs.has(k))) return;
  const get = (k: string) => attrs.get(k)?.value;
  const at = get('at'),
    from = get('from'),
    to = get('to');
  if (milestone) {
    // A milestone is a rule (at=) or a shaded period (from= to=) across every band.
    if (at !== undefined ? from !== undefined || to !== undefined : !from || !to || to === 'open')
      fail('A milestone takes at=DATE, or a period as from=DATE to=DATE.');
    if (from?.startsWith('?')) fail('A period needs a known start; remove the ?.');
  } else if (at !== undefined ? from !== undefined || to !== undefined : !from || !to)
    fail('Give a point as at=DATE, or a span as from=DATE to=DATE (to=open runs to today).');
  const when: TimelineWhen = { steps: [] };
  if (milestone) when.milestone = true;
  if (at !== undefined) when.at = dayOf(at, fail);
  if (from !== undefined) {
    when.fromUnknown = from.startsWith('?');
    when.from = dayOf(from.replace(/^\?/, ''), fail);
  }
  if (to !== undefined) {
    // to=+3d, +2w or +1m: a duration from the start, as Mermaid and PlantUML write one.
    const rel = /^\+(\d+)([dwm])$/.exec(to);
    if (rel && when.from === undefined) fail('A duration like to=+3d needs from=DATE.');
    when.to =
      to === 'open'
        ? 'open'
        : rel
          ? rel[2] === 'm'
            ? addMonths(when.from!, Number(rel[1]))
            : when.from! + Number(rel[1]) * (rel[2] === 'w' ? 7 : 1)
          : dayOf(to, fail);
  }
  const progress = get('progress');
  if (progress !== undefined) {
    const n = Number(progress.replace(/%$/, ''));
    if (when.from === undefined || !Number.isFinite(n) || n < 0 || n > 100)
      fail('progress= is a percent from 0 to 100 on a span (from= and to=).');
    when.progress = n / 100;
  }
  const steps = get('steps');
  if (steps !== undefined) {
    if (when.from === undefined) fail('steps= marks points along a span; give from= and to=.');
    when.steps = steps.split(',').map(s => dayOf(s.trim(), fail));
  }
  const text: Array<[string, keyof TimelineWhen]> = [
    ['key', 'key'],
    ['detail', 'detail'],
    ['tag', 'tag'],
    ['start-label', 'startLabel'],
    ['end-label', 'endLabel'],
  ];
  for (const [attr, field] of text) {
    const v = get(attr);
    if (v !== undefined) (when as unknown as Record<string, string>)[field] = v;
  }
  return when;
}

/** Errors a span can only show once the whole file is read, since `today` comes from the layout. */
export function checkWhen(when: TimelineWhen, today: number | undefined, fail: Fail) {
  if (when.from === undefined) return;
  if (when.milestone) {
    if ((when.to as number) <= when.from) fail('A period ends after it starts.');
    return;
  }
  if (when.to === 'open' && today === undefined)
    fail('to=open runs to today: add today=YYYY-MM-DD to the layout root timeline line.');
  const end = when.to === 'open' ? today! : when.to!;
  if (end < when.from) fail('This span ends before it starts.');
  let last = when.from;
  for (const s of when.steps) {
    if (s <= last || s >= end) fail('steps= must rise strictly and fall inside the span.');
    last = s;
  }
}

// --- Layout ----------------------------------------------------------------------------------

const ROW = 34,
  ROW_DETAIL = 46,
  BAND_HEAD = 34,
  BAND_GAP = 22,
  AXIS_ROW = 22,
  RAIL = 20,
  LEAD = 34,
  GUTTER_GAP = 28,
  NAME_MAX = 300,
  TAG_MAX = 170,
  PANEL_GAP = 40,
  BAR = 6,
  /** Families a band with color=auto takes, in band order. */
  AUTO_FAMILIES = ['blue', 'teal', 'orange', 'violet', 'rose', 'green', 'amber', 'red'],
  /** Periods wash in a cool color no band takes by default, so a period never reads as a bar. */
  PERIOD = 'sky';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthDay = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fullDate = (d: Date) => `${monthDay(d)}, ${d.getUTCFullYear()}`;

/** A readable range: "Nov 3–23, 2025", "Oct 29, 2024 – Nov 23, 2025". */
export function rangeText(a: number, b: number) {
  const x = dateOf(a),
    y = dateOf(b);
  if (x.getUTCFullYear() !== y.getUTCFullYear()) return `${fullDate(x)} – ${fullDate(y)}`;
  if (x.getUTCMonth() === y.getUTCMonth())
    return `${monthDay(x)}–${y.getUTCDate()}, ${y.getUTCFullYear()}`;
  return `${monthDay(x)} – ${monthDay(y)}, ${y.getUTCFullYear()}`;
}

interface Tick {
  day: number;
  text: string;
  /** A year or month boundary: drawn a little stronger. */
  major: boolean;
}

/** The first day of a month in day numbers; years 0 to 99 stay themselves (not 1900 to 1999). */
function monthStart(year: number, month: number) {
  const d = new Date(0);
  d.setUTCFullYear(year + Math.floor(month / 12), ((month % 12) + 12) % 12, 1);
  return Math.round(d.getTime() / DAY);
}

/**
 * Ticks for a domain: the finest step whose labels stand apart at this width. A step is judged
 * on its sample label before any tick is made, so a long domain never builds a tick per day.
 */
function axisTicks(d0: number, d1: number, width: number, look: ResolvedAppearance): Tick[] {
  const px = width / (d1 - d0),
    font = timelineFont(look, 'small'),
    fits = (texts: string[], spacing: number) =>
      spacing >= Math.max(0, ...texts.map(t => measureText(t, font))) + 12;
  const steps: Array<{ unit: 'day' | 'month' | 'year'; n: number; days: number; sample: string }> =
    [
      ...[1, 2, 7].map(n => ({ unit: 'day' as const, n, days: n, sample: 'Sep 30' })),
      ...[1, 2, 3, 6].map(n => ({ unit: 'month' as const, n, days: n * 28, sample: "Sep '25" })),
      ...[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].map(n => ({
        unit: 'year' as const,
        n,
        days: n * 365,
        sample: '2025',
      })),
    ];
  for (const step of steps) {
    if (!fits([step.sample], step.days * px)) continue;
    const ticks: Tick[] = [];
    if (step.unit === 'day') {
      let day = Math.ceil(d0);
      // Weekly ticks fall on Mondays.
      if (step.n === 7) while (dateOf(day).getUTCDay() !== 1) day++;
      let lastMonth = -1;
      for (; day <= d1; day += step.n) {
        const d = dateOf(day),
          first = d.getUTCMonth() !== lastMonth;
        lastMonth = d.getUTCMonth();
        ticks.push({
          day,
          text: first || step.n === 7 ? monthDay(d) : String(d.getUTCDate()),
          major: first,
        });
      }
    } else {
      const start = dateOf(Math.ceil(d0));
      // Months count from year 0, so a step stays on whole months and whole years.
      const per = step.unit === 'year' ? 12 * step.n : step.n;
      let k = Math.ceil((start.getUTCFullYear() * 12 + start.getUTCMonth()) / per) * per;
      for (; ; k += per) {
        const year = Math.floor(k / 12),
          month = k - year * 12,
          day = monthStart(year, month);
        if (day > d1) break;
        if (day < d0) continue;
        const yy = `'${String(year).slice(-2).padStart(2, '0')}`,
          // Three-month steps fall on Jan, Apr, Jul and Oct: name them as quarters.
          name = step.n === 3 && step.unit === 'month' ? `Q${month / 3 + 1}` : MONTHS[month];
        const text =
          step.unit === 'year'
            ? String(year)
            : month === 0 || !ticks.length
              ? `${name} ${yy}`
              : name;
        ticks.push({ day, text, major: month === 0 });
      }
    }
    if (
      ticks.length &&
      fits(
        ticks.map(t => t.text),
        step.days * px,
      )
    )
      return ticks;
  }
  return [];
}

interface Row {
  o: ModelObject;
  when: TimelineWhen;
  family: string;
  h: number;
}

interface Band {
  g?: ModelObject;
  family: string;
  rows: Row[];
}

/**
 * Lay out a timeline: rows for nodes, bands for top-level groups, rules for milestones. Returns
 * the drawing and a rectangle for every node (its row) and group (its band), for selection and
 * framing.
 */
export function layoutTimeline(
  members: ModelObject[],
  bandGroups: ModelObject[],
  options: TimelineOptions,
  look: ResolvedAppearance,
  links: ModelEdge[] = [],
  /** The ids an `order` line lists for a scope: the timeline (its bands) or a band (its rows). */
  orderOf: (scope: string) => string[] = () => [],
  scope = 'root',
): { plan: TimelinePlan; rects: Map<string, Rect>; drawn: string[] } {
  const under: TimelineMark[] = [],
    over: TimelineMark[] = [],
    rects = new Map<string, Rect>(),
    titles: NonNullable<TimelinePlan['titles']> = {};
  const w = (text: string, font: TimelineFont) => measureText(text, timelineFont(look, font));
  const text = (
    x: number,
    y: number,
    value: string,
    ink: TimelineInk,
    font: TimelineFont,
    anchor: 'start' | 'middle' | 'end' = 'start',
    max?: number,
    halo = false,
  ) => {
    const cut = max === undefined ? value : truncateText(value, max, timelineFont(look, font));
    if (halo) {
      // A canvas-colored backing keeps a label readable where a rule or gridline runs under it.
      const tw = w(cut, font),
        h = timelineFont(look, font).size + 4,
        left = anchor === 'start' ? x : anchor === 'middle' ? x - tw / 2 : x - tw;
      over.push({ k: 'rect', x: left - 3, y: y - h / 2, w: tw + 6, h, ink: 'canvas', r: 3 });
    }
    over.push({
      k: 'text',
      x,
      y,
      text: cut,
      ink,
      font,
      anchor,
    });
  };

  // Bands in the order given, rows in the order given within each. A row's band is the first
  // frameless group it sits in (`soft`), or its parent when the model still has it.
  const bandOf = (o: ModelObject) =>
    bandGroups.find(g => o.soft?.[0] === g.id || o.parent === g.id)?.id;
  // An `order` line puts its ids first, in its order; the rest keep file order.
  const ordered = <T extends { id: string }>(list: T[], ids: string[]) => {
    const rank = (id: string) => (ids.includes(id) ? ids.indexOf(id) : ids.length);
    return list
      .map((x, i) => ({ x, i }))
      .sort((a, b) => rank(a.x.id) - rank(b.x.id) || a.i - b.i)
      .map(e => e.x);
  };
  const groups = ordered(
    bandGroups.filter(g => members.some(o => bandOf(o) === g.id)),
    orderOf(scope),
  );
  let auto = 0;
  const loose = members.filter(o => o.type === 'node' && !bandOf(o) && !o.when?.milestone);
  const bands: Band[] = [];
  const familyOf = (o: ModelObject, fallback: string) => (o.color !== 'auto' ? o.color : fallback);
  const rowsOf = (members: ModelObject[], family: string): Row[] =>
    members.map(o => ({
      o,
      when: o.when!,
      family: familyOf(o, family),
      h: o.when!.detail ? ROW_DETAIL : ROW,
    }));
  if (loose.length) {
    const family = AUTO_FAMILIES[auto++];
    bands.push({ family, rows: rowsOf(loose, family) });
  }
  for (const g of groups) {
    const family = familyOf(g, AUTO_FAMILIES[auto++ % AUTO_FAMILIES.length]);
    bands.push({
      g,
      family,
      rows: rowsOf(
        ordered(
          members.filter(o => bandOf(o) === g.id && !o.when?.milestone),
          orderOf(g.id),
        ),
        family,
      ),
    });
  }
  const milestones = members.filter(o => o.when?.milestone);
  const today = options.today;

  // The days each row covers, for the domain and for picking its panel.
  const daysOf = (r: Row) => {
    const d = r.when;
    const out = [...d.steps];
    if (d.at !== undefined) out.push(d.at);
    if (d.from !== undefined) out.push(d.from);
    if (typeof d.to === 'number') out.push(d.to);
    if (d.to === 'open' && today !== undefined) out.push(today);
    return out;
  };
  const allDays = [
    ...bands.flatMap(b => b.rows.flatMap(daysOf)),
    ...milestones.flatMap(o =>
      o.when!.at !== undefined ? [o.when!.at] : [o.when!.from!, o.when!.to as number],
    ),
    ...(today !== undefined ? [today] : []),
  ];
  const drawn: string[] = [];
  if (!allDays.length)
    return { plan: { bounds: { x: 0, y: 0, w: 0, h: 0 }, under, over }, rects, drawn };

  // With zoom=, a band whose every date falls in the window is drawn in a detail panel; the
  // rest stay in the overview, where the window is shaded.
  const zoom = options.zoom;
  const inWindow = (b: Band) =>
    zoom !== undefined && b.rows.every(r => daysOf(r).every(d => d >= zoom[0] && d <= zoom[1]));
  const panels: Array<{ bands: Band[]; d0: number; d1: number; detail: boolean }> = [];
  // The overview covers the data and the zoom window, so the detail is never wider than it.
  const window = options.zoom && bands.some(b => inWindow(b)) ? options.zoom : [];
  const lo = Math.min(...allDays, ...window),
    hi = Math.max(...allDays, ...window);
  const pad = (a: number, b: number) => Math.max(0.6, (b - a) * 0.015);
  const overview = bands.filter(b => !inWindow(b)),
    detail = bands.filter(inWindow);
  // The overview stays when a band or a milestone lies outside the zoom window, so every dated
  // thing is drawn somewhere.
  const beyond = (day: number) => !zoom || day < zoom[0] || day > zoom[1];
  const outside =
    milestones.some(o =>
      o.when!.at !== undefined
        ? beyond(o.when!.at)
        : beyond(o.when!.from!) || beyond(o.when!.to as number),
    ) ||
    (today !== undefined && beyond(today));
  if (overview.length || !detail.length || outside) {
    const p = pad(lo, hi);
    panels.push({ bands: overview, d0: lo - p, d1: hi + p, detail: false });
  }
  if (zoom && detail.length)
    panels.push({ bands: detail, d0: zoom[0] - 0.6, d1: zoom[1] + 0.6, detail: true });
  const zoomed = panels.length === 2;

  // The gutter: key, name (and its detail line), tag. One set of columns for every panel.
  const rows = bands.flatMap(b => b.rows);
  const keyW = Math.max(0, ...rows.map(r => (r.when.key ? w(r.when.key, 'key') : 0)));
  const keyCol = keyW ? keyW + 14 : 0;
  const nameW = Math.min(
    NAME_MAX,
    Math.max(
      120,
      ...rows.map(r =>
        Math.max(w(r.o.label, 'name'), r.when.detail ? w(r.when.detail, 'detail') : 0),
      ),
    ),
  );
  const tagW = Math.min(
    TAG_MAX,
    Math.max(
      0,
      ...rows.map(r => (r.when.tag ? w(r.when.tag, 'small') : 0)),
      // A heading over the tag column widens it, but only when some row has a tag.
      ...(rows.some(r => r.when.tag) && options.headers?.[1]
        ? [w(options.headers[1], 'caps')]
        : []),
    ),
  );
  const tagX = keyCol + nameW + 20;
  const gutter = tagX + (tagW ? tagW + 20 : 0);
  const chartX = gutter + (rows.some(r => r.when.fromUnknown) ? LEAD + 10 : GUTTER_GAP),
    // An ordinal axis gives every distinct date one step, wide enough for its label.
    ordinal = options.scale === 'ordinal' ? [...new Set(allDays)].sort((a, b) => a - b) : [],
    chartW = Math.max(options.width, (ordinal.length - 1) * (w("Sep 30 '25", 'small') + 18)),
    chartR = chartX + chartW;
  const multiYear = dateOf(lo).getUTCFullYear() !== dateOf(hi).getUTCFullYear(),
    shortDate = (day: number) => (multiYear ? fullDate(dateOf(day)) : monthDay(dateOf(day)));
  // start-label=date and end-label=date print the date; =duration prints the span's length.
  const labelOf = (v: string | undefined, d: TimelineWhen, end: boolean) => {
    if (v === undefined) return undefined;
    const last = d.to === 'open' ? today! : (d.to as number);
    if (v === 'date')
      return d.at !== undefined
        ? shortDate(d.at)
        : end && d.to === 'open'
          ? 'open'
          : shortDate(end ? last : d.from!);
    if (v === 'duration')
      return d.at !== undefined
        ? undefined
        : `${durationText(last - d.from!)}${d.to === 'open' ? ' so far' : ''}`;
    return v;
  };
  let right = chartR;
  const bandHeads = bands.some(b => b.g);

  const drawnAsEvent = new Set<string>();
  const anchors = new Map<
    string,
    { start: number; end: number; y: number; panel: number; point: boolean }
  >();
  let y = 2;
  panels.forEach((panel, pi) => {
    const { d0, d1 } = panel;
    const linear = (day: number) => chartX + ((day - d0) / (d1 - d0)) * chartW;
    // Ordinal: the index of the date among the distinct dates, with a little room at each end.
    const edge = ordinal.length > 1 ? Math.min(24, chartW / (2 * ordinal.length)) : chartW / 2,
      step = ordinal.length > 1 ? (chartW - 2 * edge) / (ordinal.length - 1) : 0;
    const X = ordinal.length
      ? (day: number) => {
          let i = ordinal.findIndex(o => o >= day);
          if (i < 0) i = ordinal.length - 1;
          if (ordinal[i] === day || i === 0) return chartX + edge + i * step;
          const a = ordinal[i - 1],
            b = ordinal[i];
          return chartX + edge + (i - 1 + (day - a) / (b - a)) * step;
        }
      : linear;
    const inPanel = (day: number) => day >= d0 && day <= d1;

    // Panel heading: what range this panel shows and at what scale.
    if (ordinal.length) {
      text(chartR, y + 8, 'One step per date · gaps labeled', 'muted', 'caps', 'end');
      y += 22;
    }
    if (zoomed) {
      const caption = panel.detail
        ? `${rangeText(zoom![0], zoom![1])} · ${formatTimes(
            (panels[0].d1 - panels[0].d0) / (panel.d1 - panel.d0),
          )} wider`
        : `${rangeText(lo, hi)} · full history`;
      text(chartR, y + 8, caption, 'muted', 'caps', 'end');
      y += 22;
    }

    // Milestone tags on rails above the axis; a tag that would touch the one before it moves up
    // a rail. Milestones inside the zoom window are drawn in the detail panel only.
    const startOf = (o: ModelObject) => o.when!.at ?? o.when!.from!,
      endOf = (o: ModelObject) => o.when!.at ?? (o.when!.to as number);
    const shown = milestones.filter(
      o =>
        startOf(o) <= d1 &&
        endOf(o) >= d0 &&
        !(zoomed && !panel.detail && startOf(o) >= zoom![0] && endOf(o) <= zoom![1]),
    );
    // A rule's tag sits on its date; a period's tag is centered over the part this panel shows.
    const tags = shown
      .map(o => {
        const x0 = X(Math.max(startOf(o), d0)),
          x1 = X(Math.min(endOf(o), d1));
        const lw = w(o.label, 'caps'),
          period = o.when!.at === undefined,
          mid = (x0 + x1) / 2;
        // A period's tag stays over the chart, even when the period runs off one end.
        const x = period ? Math.min(Math.max(mid, chartX + lw / 2), chartR - lw / 2) : mid;
        return { o, x, x0, x1, w: lw, period };
      })
      .sort((a, b) => a.x - b.x);
    const rails: number[] = [];
    const tagRail = tags.map(t => {
      let level = 0;
      while ((rails[level] ?? -Infinity) > t.x - t.w / 2 - 14) level++;
      rails[level] = t.x + t.w / 2;
      return level;
    });
    const railRows = rails.length;
    const todayShown = today !== undefined && inPanel(today);
    y += railRows * RAIL;

    // The axis: tick labels, then a baseline.
    // Years written as years (every date a January 1st) label as years.
    const yearly = ordinal.every(day => {
      const d = dateOf(day);
      return d.getUTCMonth() === 0 && d.getUTCDate() === 1;
    });
    const ticks: Tick[] = ordinal.length
      ? ordinal.map((day, i) => {
          if (yearly) return { day, text: String(dateOf(day).getUTCFullYear()), major: true };
          const d = dateOf(day),
            prev = i ? dateOf(ordinal[i - 1]) : undefined,
            year = !prev || prev.getUTCFullYear() !== d.getUTCFullYear();
          return {
            day,
            text: year ? `${monthDay(d)} '${String(d.getUTCFullYear()).slice(-2)}` : monthDay(d),
            major: !prev || prev.getUTCMonth() !== d.getUTCMonth(),
          };
        })
      : axisTicks(d0, d1, chartW, look);
    const axisY = y + AXIS_ROW;
    const todayX = todayShown ? X(today!) : undefined;
    // The ticks that stand clear of the Today caption and inside the axis.
    const clear = (caption: string) =>
      ticks.filter(t => {
        const x = X(t.day),
          half = w(t.text, 'small') / 2;
        if (todayX !== undefined && Math.abs(x - todayX) < half + w(caption, 'caps') / 2 + 8)
          return false;
        return x - half >= chartX - 6 && x + half <= chartR + 30;
      });
    // An axis always names a date: Today's caption takes its date when it would hide the only
    // month name or every tick, and the ticks then clear the longer caption.
    let caption = 'Today',
      kept = clear(caption);
    const hidMonth = ticks.some(t => t.major && !kept.includes(t));
    if (todayX !== undefined && (!kept.length || hidMonth)) {
      caption = `Today · ${monthDay(dateOf(today!))}`;
      kept = clear(caption);
    }
    for (const t of kept)
      text(X(t.day), y + 8, t.text, t.major ? 'text' : 'muted', 'small', 'middle');
    if (todayX !== undefined) {
      text(todayX, y + 8, caption, 'text', 'caps', 'middle');
      right = Math.max(right, todayX + w(caption, 'caps') / 2 + 4);
    } else if (!kept.length) text(chartX, y + 8, fullDate(dateOf(Math.ceil(d0))), 'muted', 'small');
    if (options.headers && pi === 0) {
      if (options.headers[0])
        text(0, y + 8, options.headers[0], 'muted', 'caps', 'start', nameW + keyCol);
      if (options.headers[1] && tagW)
        text(tagX, y + 8, options.headers[1], 'muted', 'caps', 'start', tagW);
    }
    for (const t of tags) right = Math.max(right, t.x + t.w / 2 + 4);
    tags.forEach((t, i) => {
      const ty = axisY - AXIS_ROW - (tagRail[i] + 1) * RAIL + 9;
      text(t.x, ty, t.o.label, 'text', 'caps', 'middle');
      // A period across the zoom boundary shows in both panels; the first keeps the box.
      titles[t.o.id] ??= { x: t.x - t.w / 2, y: ty, w: t.w, font: 'caps' };
      // A milestone's box is its tag, so it can be selected, and it is never smaller than the
      // least box a document holds (24 by 20).
      const bw = Math.max(24, t.w + 8);
      if (!rects.has(t.o.id)) rects.set(t.o.id, { x: t.x - bw / 2, y: ty - 10, w: bw, h: 20 });
    });
    under.push({ k: 'line', x1: chartX, y1: axisY, x2: chartR, y2: axisY, ink: 'rule', w: 1 });
    y = axisY + 10;

    // Bands and rows.
    const top = axisY;
    const rowsTop = y;
    panel.bands.forEach((band, bi) => {
      let bandY = y;
      // The panel's first band names itself on the axis row; later ones take a heading row.
      if (band.g) {
        const first = bi === 0 && !(options.headers && pi === 0);
        titles[band.g.id] = { x: 0, y: first ? axisY - 9 : y + 13, w: gutter - 8, font: 'band' };
      }
      if (band.g && bi === 0 && !(options.headers && pi === 0)) {
        bandY = axisY - AXIS_ROW;
        text(
          0,
          axisY - 9,
          band.g.label,
          { family: band.family, tone: 'ink' },
          'band',
          'start',
          gutter - 8,
        );
      } else if (band.g) {
        text(
          0,
          y + 13,
          band.g.label,
          { family: band.family, tone: 'ink' },
          'band',
          'start',
          gutter - 8,
        );
        y += BAND_HEAD;
      } else if (bandHeads) y += 6;
      for (const r of band.rows) {
        const mid = y + r.h / 2,
          d = r.when,
          strong: TimelineInk = { family: r.family },
          ink: TimelineInk = { family: r.family, tone: 'ink' };
        rects.set(r.o.id, { x: 0, y, w: chartR, h: r.h });
        {
          const a = d.at !== undefined ? X(d.at) : X(d.from!),
            b = d.at !== undefined ? X(d.at) : X(d.to === 'open' ? today! : (d.to as number));
          anchors.set(r.o.id, { start: a, end: b, y: mid, panel: pi, point: d.at !== undefined });
        }
        under.push({
          k: 'line',
          x1: 0,
          y1: y + r.h,
          x2: gutter - 8,
          y2: y + r.h,
          ink: 'grid',
          w: 1,
        });
        // Gutter: key, name and its detail line, tag.
        const nameY = d.detail ? mid - 8 : mid;
        if (d.key) text(0, nameY, d.key, ink, 'key');
        text(keyCol, nameY, r.o.label, 'text', 'name', 'start', nameW);
        titles[r.o.id] = { x: keyCol, y: nameY, w: nameW, font: 'name' };
        if (d.detail) text(keyCol, mid + 9, d.detail, 'muted', 'detail', 'start', nameW);
        if (d.tag) text(tagX, nameY, d.tag, 'muted', 'small', 'start', tagW);

        // The mark on the chart.
        if (d.at !== undefined) {
          const x = X(d.at);
          over.push({ k: 'dot', x, y: mid, r: 6, ink: strong });
          over.push({ k: 'dot', x, y: mid, r: 2.2, ink: 'canvas' });
          const startLabel = labelOf(d.startLabel, d, false),
            endLabel = labelOf(d.endLabel, d, true);
          // A point's start label reads into the dot from the left, inside its own row; with no
          // room before the chart's edge it sits above the dot.
          if (startLabel && x - 12 - w(startLabel, 'small') >= chartX)
            text(x - 12, mid, startLabel, ink, 'small', 'end', undefined, true);
          else if (startLabel) {
            text(x, mid - 14, startLabel, ink, 'small', 'middle', undefined, true);
            right = Math.max(right, x + w(startLabel, 'small') / 2 + 4);
          }
          if (endLabel) {
            text(x + 12, mid, endLabel, 'text', 'label', 'start', undefined, true);
            right = Math.max(right, x + 12 + w(endLabel, 'label'));
          }
        } else {
          const open = d.to === 'open';
          const xs = X(d.from!),
            xe = X(open ? today! : (d.to as number));
          // A span too short to show a bar (one day on a long axis) draws as one event mark, not
          // as an end dot hiding its own start ring.
          const tiny =
            !open && !d.fromUnknown && xe - xs < 6 && !d.steps.length && d.progress === undefined;
          if (tiny) drawnAsEvent.add(r.o.id);
          if (d.fromUnknown) {
            over.push({
              k: 'line',
              x1: xs - LEAD,
              y1: mid,
              x2: xs - 3,
              y2: mid,
              ink: strong,
              w: 1.6,
              dash: '2 4',
              round: true,
            });
            over.push({ k: 'path', d: chevron(xs - LEAD - 1, mid), ink: strong, stroke: 1.6 });
          }
          const bar = (x2: number, ink: TimelineInk) =>
            over.push({
              k: 'line',
              x1: xs,
              y1: mid,
              x2,
              y2: mid,
              ink,
              w: BAR,
              round: !d.fromUnknown,
            });
          const barEnd = xe - (open ? 6 : 0);
          // progress=: the done part is solid, the rest a soft track of the same color.
          if (d.progress !== undefined) {
            bar(barEnd, { family: r.family, tone: 'track' });
            if (d.progress > 0) bar(xs + (barEnd - xs) * d.progress, strong);
          } else bar(barEnd, strong);
          if (!d.fromUnknown && !tiny) {
            over.push({ k: 'dot', x: xs, y: mid, r: 5, ink: strong });
            over.push({ k: 'dot', x: xs, y: mid, r: 2.5, ink: 'canvas' });
          }
          for (const s of d.steps) {
            over.push({ k: 'dot', x: X(s), y: mid, r: 4.8, ink: strong });
            over.push({ k: 'dot', x: X(s), y: mid, r: 2.6, ink: 'canvas' });
          }
          if (open) over.push({ k: 'path', d: arrowHead(xe + 4, mid), ink: strong });
          else if (tiny) {
            over.push({ k: 'dot', x: (xs + xe) / 2, y: mid, r: 6, ink: strong });
            over.push({ k: 'dot', x: (xs + xe) / 2, y: mid, r: 2.2, ink: 'canvas' });
          } else over.push({ k: 'dot', x: xe, y: mid, r: 5.6, ink: strong });
          const startLabel = labelOf(d.startLabel, d, false),
            endLabel = labelOf(d.endLabel, d, true);
          if (startLabel) right = Math.max(right, xs + w(startLabel, 'small') + 4);
          if (startLabel)
            text(
              xs + (d.fromUnknown ? 0 : -3),
              mid - 13,
              startLabel,
              ink,
              'small',
              'start',
              undefined,
              true,
            );
          if (endLabel) {
            const lx = xe + (open ? 14 : 11);
            text(lx, mid, endLabel, 'text', 'label', 'start', undefined, true);
            right = Math.max(right, lx + w(endLabel, 'label'));
          }
        }
        y += r.h;
      }
      if (band.g) rects.set(band.g.id, { x: 0, y: bandY, w: chartR, h: y - bandY });
      y += BAND_GAP;
    });
    if (panel.bands.length) y -= BAND_GAP;
    const bottom = Math.max(y + 6, axisY + 24);

    // Under the rows: tick gridlines, the zoom window's shade, milestone and today rules.
    for (const t of ticks) {
      const x = X(t.day);
      if (x < chartX || x > chartR) continue;
      under.push({
        k: 'line',
        x1: x,
        y1: top,
        x2: x,
        y2: bottom,
        ink: 'grid',
        w: t.major ? 1.2 : 1,
      });
    }
    if (zoomed && !panel.detail) {
      const a = Math.max(chartX, X(zoom![0])),
        b = Math.min(chartR, X(zoom![1]));
      under.unshift({
        k: 'rect',
        x: a,
        y: top - 4,
        w: Math.max(2, b - a),
        h: bottom - top + 4,
        ink: 'shade',
      });
      text(b, bottom + 12, 'Enlarged below', 'muted', 'small', 'end');
      y += 14;
    }
    tags.forEach((t, i) => {
      if (!t.period) return;
      // A period shades its dates from its tag down through every band, under the gridlines.
      const ty = axisY - AXIS_ROW - (tagRail[i] + 1) * RAIL + 9;
      under.unshift({
        k: 'rect',
        x: t.x0,
        y: ty + 9,
        w: Math.max(2, t.x1 - t.x0),
        h: bottom - ty - 9,
        ink: { family: PERIOD, tone: 'tint' },
      });
    });
    if (ordinal.length >= 2) {
      // Long gaps say how long they are, since an ordinal axis does not show it.
      const gaps = ordinal.slice(1).map((day, i) => day - ordinal[i]),
        median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
      gaps.forEach((gap, i) => {
        // A short timeline labels every gap; a long one only the gaps well above the median.
        if (ordinal.length <= 12 ? gap > 0 : gap > Math.max(1, median * 1.5))
          text(
            (X(ordinal[i]) + X(ordinal[i + 1])) / 2,
            axisY + 9,
            durationText(gap),
            'muted',
            'small',
            'middle',
            step - 8,
            true,
          );
      });
    }
    for (const t of tags) {
      if (t.period) continue;
      under.push({
        k: 'line',
        x1: t.x,
        y1: top - 5,
        x2: t.x,
        y2: bottom,
        ink: 'rule',
        w: 1,
        dash: '4 4',
      });
      under.push({
        k: 'path',
        d: `M${t.x - 4},${top - 7}L${t.x + 4},${top - 7}L${t.x},${top - 1}Z`,
        ink: 'rule',
      });
    }
    if (todayX !== undefined)
      under.push({
        k: 'line',
        x1: todayX,
        y1: top - 4,
        x2: todayX,
        y2: bottom,
        ink: 'text',
        w: 1.4,
      });
    void rowsTop;
    y = bottom + (pi < panels.length - 1 ? PANEL_GAP : 0);
  });

  // Lines between two rows: an elbow from the source's end (finish) down or up to the target's
  // row, then across into its start, so the arrow reads as "this, then that" on the dates.
  type Box = { x: number; y: number; w: number; h: number };
  const segments: Box[] = [],
    pending: Array<{
      label: string;
      tries: Array<{ x: number; y: number; anchor: 'start' | 'end' }>;
    }> = [];
  const ink: TimelineInk = 'muted';
  for (const e of links) {
    const a = anchors.get(e.source),
      b = anchors.get(e.target);
    // A line to itself is routed. Across panels the elbow still runs from one row's end (on its
    // panel's axis) to the other's start (on its own), so it reads in date order.
    if (!a || !b || e.source === e.target) continue;
    drawn.push(e.id);
    const down = b.y > a.y ? 1 : -1,
      into = b.point ? 8 : 6,
      x0 = a.end,
      y0 = a.y + down * (a.point ? 8 : 7),
      tx = b.start,
      mid = (y0 + b.y) / 2;
    const vertical = { x: x0 - 1, y: Math.min(y0, b.y), w: 2, h: Math.abs(b.y - y0) };
    segments.push(vertical);
    if (Math.abs(tx - x0) < 10) {
      // Same date: straight down into the target's mark.
      const y1 = b.y - down * (into + 1);
      over.push({ k: 'line', x1: x0, y1: y0, x2: x0, y2: y1 - down * 6, ink, w: 1.3 });
      over.push({ k: 'path', d: vHead(x0, y1, down), ink });
      if (e.label)
        pending.push({
          label: e.label,
          tries: [
            { x: x0 + 6, y: mid, anchor: 'start' },
            { x: x0 - 6, y: mid, anchor: 'end' },
          ],
        });
      continue;
    }
    const right = tx > x0 ? 1 : -1,
      x1 = tx - right * into;
    segments.push({ x: Math.min(x0, x1), y: b.y - 1, w: Math.abs(x1 - x0), h: 2 });
    over.push({
      k: 'path',
      d: `M${x0},${y0}L${x0},${b.y - 4 * down}Q${x0},${b.y} ${x0 + 4 * right},${b.y}L${x1 - right * 6},${b.y}`,
      ink,
      stroke: 1.3,
    });
    over.push({ k: 'path', d: hHead(x1, b.y, right), ink });
    if (e.label) {
      const side = right > 0 ? 'start' : 'end',
        back = right > 0 ? 'end' : 'start';
      pending.push({
        label: e.label,
        tries: [
          { x: x0 + right * 10, y: b.y - 10, anchor: side },
          { x: x0 + right * 6, y: mid, anchor: side },
          { x: x0 - right * 6, y: mid, anchor: back },
          { x: x0 + right * 10, y: b.y + 10, anchor: side },
        ],
      });
    }
  }
  // Each label takes the first spot clear of every arrow, every row's marks and every label
  // placed before it.
  const placed: Box[] = [...anchors.values()].flatMap(a => [
    { x: a.start - 8, y: a.y - 8, w: 16, h: 16 },
    { x: a.end - 8, y: a.y - 8, w: 16, h: 16 },
  ]);
  const hits = (r: Box, o: Box) =>
    r.x < o.x + o.w && o.x < r.x + r.w && r.y < o.y + o.h && o.y < r.y + r.h;
  for (const p of pending) {
    const lw = Math.min(220, w(p.label, 'small')),
      lh = timelineFont(look, 'small').size + 4;
    const boxOf = (t: { x: number; y: number; anchor: 'start' | 'end' }) => ({
      x: t.anchor === 'start' ? t.x - 2 : t.x - lw - 2,
      y: t.y - lh / 2,
      w: lw + 4,
      h: lh,
    });
    const free = (t: { x: number; y: number; anchor: 'start' | 'end' }) => boxOf(t).x >= chartX - 4;
    const pick =
      p.tries.find(t => {
        if (!free(t)) return false;
        const r = boxOf(t);
        return !segments.some(o => hits(r, o)) && !placed.some(o => hits(r, o));
      }) ?? p.tries[0];
    // With no clear spot, a label still never covers the row titles: it starts at the chart.
    if (!free(pick)) {
      pick.x = chartX;
      pick.anchor = 'start';
    }
    placed.push(boxOf(pick));
    right = Math.max(right, boxOf(pick).x + boxOf(pick).w);
    text(pick.x, pick.y, p.label, ink, 'small', pick.anchor, 220, true);
  }

  // The legend: one entry for each kind of mark the drawing uses.
  // The legend follows what was drawn: a span drawn as an event counts as an event.
  const used = (test: (d: TimelineWhen) => boolean) =>
    rows.some(r => test(drawnAsEvent.has(r.o.id) ? { steps: [], at: r.when.from } : r.when));
  const legend: Array<[string, (x: number, y: number) => TimelineMark[]]> = [];
  const sample: TimelineInk = 'muted';
  if (used(d => d.from !== undefined && !d.fromUnknown))
    legend.push([
      'Start',
      (x, y) => [
        { k: 'dot', x: x + 8, y, r: 5, ink: sample },
        { k: 'dot', x: x + 8, y, r: 2.5, ink: 'canvas' },
      ],
    ]);
  if (used(d => !!d.fromUnknown))
    legend.push([
      'Start unknown',
      (x, y) => [
        {
          k: 'line',
          x1: x + 2,
          y1: y,
          x2: x + 22,
          y2: y,
          ink: sample,
          w: 1.6,
          dash: '2 4',
          round: true,
        },
        { k: 'path', d: chevron(x, y), ink: sample, stroke: 1.6 },
      ],
    ]);
  if (used(d => d.steps.length > 0))
    legend.push([
      'Partial step',
      (x, y) => [
        { k: 'dot', x: x + 8, y, r: 4.8, ink: sample },
        { k: 'dot', x: x + 8, y, r: 2.6, ink: 'canvas' },
      ],
    ]);
  if (used(d => typeof d.to === 'number'))
    legend.push([
      'Ended',
      (x, y) => [
        { k: 'line', x1: x, y1: y, x2: x + 16, y2: y, ink: sample, w: BAR, round: true },
        { k: 'dot', x: x + 18, y, r: 5.6, ink: sample },
      ],
    ]);
  if (used(d => d.to === 'open'))
    legend.push([
      'Still open',
      (x, y) => [
        { k: 'line', x1: x, y1: y, x2: x + 14, y2: y, ink: sample, w: BAR, round: true },
        { k: 'path', d: arrowHead(x + 24, y), ink: sample },
      ],
    ]);
  if (used(d => d.progress !== undefined))
    legend.push([
      'Progress',
      (x, y) => [
        { k: 'line', x1: x, y1: y, x2: x + 22, y2: y, ink: 'grid', w: BAR, round: true },
        { k: 'line', x1: x, y1: y, x2: x + 12, y2: y, ink: sample, w: BAR, round: true },
      ],
    ]);
  if (used(d => d.at !== undefined))
    legend.push([
      'Event',
      (x, y) => [
        { k: 'dot', x: x + 8, y, r: 6, ink: sample },
        { k: 'dot', x: x + 8, y, r: 2.2, ink: 'canvas' },
      ],
    ]);
  if (milestones.some(o => o.when!.at === undefined))
    legend.push([
      'Period',
      (x, y) => [
        {
          k: 'rect',
          x: x + 1,
          y: y - 7,
          w: 20,
          h: 14,
          r: 2,
          ink: { family: PERIOD, tone: 'tint' },
        },
      ],
    ]);
  if (milestones.some(o => o.when!.at !== undefined))
    legend.push([
      'Milestone',
      (x, y) => [
        { k: 'line', x1: x + 8, y1: y - 4, x2: x + 8, y2: y + 9, ink: 'rule', w: 1, dash: '3 3' },
        { k: 'path', d: `M${x + 4},${y - 9}L${x + 12},${y - 9}L${x + 8},${y - 3}Z`, ink: 'rule' },
      ],
    ]);
  if (today !== undefined)
    legend.push([
      'Today',
      (x, y) => [{ k: 'line', x1: x + 8, y1: y - 8, x2: x + 8, y2: y + 8, ink: 'text', w: 1.4 }],
    ]);
  if (legend.length) {
    y += 22;
    under.push({ k: 'line', x1: 0, y1: y, x2: chartR, y2: y, ink: 'grid', w: 1 });
    y += 20;
    let x = 0;
    for (const [label, draw] of legend) {
      const glyph = 30;
      if (x + glyph + w(label, 'small') > right) {
        x = 0;
        y += 22;
      }
      over.push(...draw(x, y));
      text(x + glyph, y, label, 'muted', 'small');
      x += glyph + w(label, 'small') + 26;
    }
    y += 10;
  }

  // Every row and band reaches the right edge, so a line to something outside the timeline
  // leaves past every bar and label.
  for (const id of [...rows.map(r => r.o.id), ...bands.flatMap(b => (b.g ? [b.g.id] : []))]) {
    const r = rects.get(id);
    if (r) r.w = Math.ceil(right + 4) - r.x;
  }
  return {
    plan: {
      bounds: { x: 0, y: 0, w: Math.ceil(right + 4), h: Math.ceil(y + 4) },
      under,
      over,
      titles,
    },
    rects,
    drawn,
  };
}

const hHead = (x: number, y: number, dir: number) =>
  `M${x - dir * 7},${y - 4}L${x},${y}L${x - dir * 7},${y + 4}Z`;
const vHead = (x: number, y: number, dir: number) =>
  `M${x - 4},${y - dir * 7}L${x},${y}L${x + 4},${y - dir * 7}Z`;
const chevron = (x: number, y: number) => `M${x + 5},${y - 4.5}L${x},${y}L${x + 5},${y + 4.5}`;
const arrowHead = (x: number, y: number) => `M${x - 11},${y - 7}L${x + 1},${y}L${x - 11},${y + 7}Z`;

/** A length of time in the largest unit that keeps it a whole, readable number. */
export function durationText(days: number) {
  const n = (v: number, unit: string) => `${v} ${unit}${v === 1 ? '' : 's'}`;
  if (days < 14) return n(Math.round(days), 'day');
  if (days < 61) return n(Math.round(days / 7), 'week');
  // From about eleven months a span reads in years, so a year is "1 year", not "12 months".
  if (days < 335) return n(Math.round(days / 30.44), 'month');
  return n(Math.max(1, Math.round(days / 365.25)), 'year');
}

function formatTimes(n: number) {
  return `${n >= 10 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')}×`;
}
