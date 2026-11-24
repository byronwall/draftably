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
import type { ModelObject, Word } from './syntax';

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
}

export interface TimelineOptions {
  today?: number;
  zoom?: [number, number];
  /** Width of the date axis. */
  width: number;
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

export function readTimelineOptions(attrs: Map<string, Word>, fail: Fail): TimelineOptions {
  const today = attrs.get('today')?.value,
    zoom = attrs.get('zoom')?.value,
    width = attrs.get('width')?.value;
  const out: TimelineOptions = { width: 880 };
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
    if (at === undefined || from !== undefined || to !== undefined)
      fail('A milestone takes one date: at=YYYY-MM-DD.');
  } else if (at !== undefined ? from !== undefined || to !== undefined : !from || !to)
    fail('Give a point as at=DATE, or a span as from=DATE to=DATE (to=open runs to today).');
  const when: TimelineWhen = { steps: [] };
  if (milestone) when.milestone = true;
  if (at !== undefined) when.at = dayOf(at, fail);
  if (from !== undefined) {
    when.fromUnknown = from.startsWith('?');
    when.from = dayOf(from.replace(/^\?/, ''), fail);
  }
  if (to !== undefined) when.to = to === 'open' ? 'open' : dayOf(to, fail);
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
  RAIL = 17,
  LEAD = 34,
  GUTTER_GAP = 28,
  NAME_MAX = 300,
  TAG_MAX = 170,
  PANEL_GAP = 40,
  BAR = 5,
  /** Families a band with color=auto takes, in band order. */
  AUTO_FAMILIES = ['blue', 'teal', 'amber', 'violet', 'rose', 'green', 'orange', 'sky'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthDay = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const yearShort = (d: Date) => `'${String(d.getUTCFullYear()).slice(2)}`;
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

/** Ticks for a domain: the finest step whose labels stand apart at this width. */
function axisTicks(d0: number, d1: number, width: number, look: ResolvedAppearance): Tick[] {
  const px = width / (d1 - d0),
    font = timelineFont(look, 'small');
  const steps: Array<{ unit: 'day' | 'month' | 'year'; n: number }> = [
    { unit: 'day', n: 1 },
    { unit: 'day', n: 2 },
    { unit: 'day', n: 7 },
    { unit: 'month', n: 1 },
    { unit: 'month', n: 2 },
    { unit: 'month', n: 3 },
    { unit: 'month', n: 6 },
    { unit: 'year', n: 1 },
    { unit: 'year', n: 2 },
    { unit: 'year', n: 5 },
    { unit: 'year', n: 10 },
  ];
  for (const step of steps) {
    const ticks: Tick[] = [];
    const start = dateOf(Math.ceil(d0));
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
      const y = start.getUTCFullYear();
      let m = step.unit === 'year' ? 0 : start.getUTCMonth();
      let year = step.unit === 'year' ? Math.ceil(y / step.n) * step.n : y;
      if (step.unit === 'month') m = Math.ceil(m / step.n) * step.n;
      for (let i = 0; i < 400; i++) {
        const day = Math.round(Date.UTC(year, m, 1) / DAY);
        if (day > d1) break;
        if (day >= d0) {
          const d = dateOf(day);
          const text =
            step.unit === 'year'
              ? String(year)
              : m === 0 || !ticks.length
                ? `${MONTHS[m]} ${yearShort(d)}`
                : MONTHS[m];
          ticks.push({ day, text, major: m === 0 });
        }
        if (step.unit === 'year') year += step.n;
        else {
          m += step.n;
          if (m >= 12) {
            m -= 12;
            year++;
          }
        }
      }
    }
    const widest = Math.max(0, ...ticks.map(t => measureText(t.text, font)));
    const gap =
      step.unit === 'day'
        ? step.n * px
        : step.unit === 'month'
          ? step.n * 28 * px
          : step.n * 365 * px;
    if (gap >= widest + 12 && ticks.length) return ticks;
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
): { plan: TimelinePlan; rects: Map<string, Rect> } {
  const under: TimelineMark[] = [],
    over: TimelineMark[] = [],
    rects = new Map<string, Rect>();
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
      ...(cut !== value ? { full: value } : {}),
    });
  };

  // Bands in the order given, rows in the order given within each. A row's band is the first
  // frameless group it sits in (`soft`), or its parent when the model still has it.
  const bandOf = (o: ModelObject) =>
    bandGroups.find(g => o.soft?.[0] === g.id || o.parent === g.id)?.id;
  const groups = bandGroups.filter(g => members.some(o => bandOf(o) === g.id));
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
        members.filter(o => bandOf(o) === g.id && !o.when?.milestone),
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
    ...milestones.map(o => o.when!.at!),
    ...(today !== undefined ? [today] : []),
  ];
  if (!allDays.length) return { plan: { bounds: { x: 0, y: 0, w: 0, h: 0 }, under, over }, rects };

  // With zoom=, a band whose every date falls in the window is drawn in a detail panel; the
  // rest stay in the overview, where the window is shaded.
  const zoom = options.zoom;
  const inWindow = (b: Band) =>
    zoom !== undefined && b.rows.every(r => daysOf(r).every(d => d >= zoom[0] && d <= zoom[1]));
  const panels: Array<{ bands: Band[]; d0: number; d1: number; detail: boolean }> = [];
  const lo = Math.min(...allDays),
    hi = Math.max(...allDays);
  const pad = (a: number, b: number) => Math.max(0.6, (b - a) * 0.015);
  const overview = bands.filter(b => !inWindow(b)),
    detail = bands.filter(inWindow);
  if (overview.length || !detail.length) {
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
    Math.max(0, ...rows.map(r => (r.when.tag ? w(r.when.tag, 'small') : 0))),
  );
  const tagX = keyCol + nameW + 20;
  const gutter = tagX + (tagW ? tagW + 20 : 0);
  const chartX = gutter + (rows.some(r => r.when.fromUnknown) ? LEAD + 10 : GUTTER_GAP),
    chartW = options.width,
    chartR = chartX + chartW;
  let right = chartR;
  const bandHeads = bands.some(b => b.g);

  let y = 2;
  panels.forEach((panel, pi) => {
    const { d0, d1 } = panel;
    const X = (day: number) => chartX + ((day - d0) / (d1 - d0)) * chartW;
    const inPanel = (day: number) => day >= d0 && day <= d1;

    // Panel heading: what range this panel shows and at what scale.
    if (zoomed) {
      const caption = panel.detail
        ? `${rangeText(zoom![0], zoom![1])} · enlarged ${formatTimes((hi - lo) / (zoom![1] - zoom![0]))} per day`
        : `${rangeText(lo, hi)} · full history`;
      text(chartR, y + 8, caption, 'muted', 'caps', 'end');
      y += 22;
    }

    // Milestone tags on rails above the axis; a tag that would touch the one before it moves up
    // a rail. Milestones inside the zoom window are drawn in the detail panel only.
    const shown = milestones.filter(
      o =>
        inPanel(o.when!.at!) &&
        !(zoomed && !panel.detail && o.when!.at! >= zoom![0] && o.when!.at! <= zoom![1]),
    );
    const tags = shown
      .map(o => ({ o, x: X(o.when!.at!), w: w(o.label, 'caps') }))
      .sort((a, b) => a.x - b.x);
    const rails: number[] = [];
    const tagRail = tags.map(t => {
      let level = 0;
      while ((rails[level] ?? -Infinity) > t.x - t.w / 2 - 8) level++;
      rails[level] = t.x + t.w / 2;
      return level;
    });
    const railRows = rails.length;
    const todayShown =
      today !== undefined &&
      inPanel(today) &&
      (!zoomed || panel.detail || !zoom || today < zoom[0] || pi === panels.length - 1);
    y += railRows * RAIL;

    // The axis: tick labels, then a baseline.
    const ticks = axisTicks(d0, d1, chartW, look);
    const axisY = y + AXIS_ROW;
    const todayX = todayShown ? X(today!) : undefined;
    const todayW = w('Today', 'caps');
    for (const t of ticks) {
      const x = X(t.day),
        half = w(t.text, 'small') / 2;
      if (todayX !== undefined && Math.abs(x - todayX) < half + todayW / 2 + 8) continue;
      if (x - half < chartX - 6 || x + half > chartR + 30) continue;
      text(x, y + 8, t.text, t.major ? 'text' : 'muted', 'small', 'middle');
    }
    if (todayX !== undefined) text(todayX, y + 8, 'Today', 'text', 'caps', 'middle');
    tags.forEach((t, i) => {
      const ty = axisY - AXIS_ROW - (tagRail[i] + 1) * RAIL + 9;
      text(t.x, ty, t.o.label, 'text', 'caps', 'middle');
    });
    under.push({ k: 'line', x1: chartX, y1: axisY, x2: chartR, y2: axisY, ink: 'rule', w: 1 });
    y = axisY + 10;

    // Bands and rows.
    const top = axisY;
    const rowsTop = y;
    panel.bands.forEach((band, bi) => {
      let bandY = y;
      // The panel's first band names itself on the axis row; later ones take a heading row.
      if (band.g && bi === 0) {
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
        if (d.detail) text(keyCol, mid + 9, d.detail, 'muted', 'detail', 'start', nameW);
        if (d.tag) text(tagX, nameY, d.tag, 'muted', 'small', 'start', tagW);

        // The mark on the chart.
        if (d.at !== undefined) {
          const x = X(d.at);
          over.push({ k: 'dot', x, y: mid, r: 6, ink: strong });
          over.push({ k: 'dot', x, y: mid, r: 2.2, ink: 'canvas' });
          if (d.startLabel)
            text(x, mid - 14, d.startLabel, ink, 'small', 'middle', undefined, true);
          if (d.endLabel) {
            text(x + 12, mid, d.endLabel, 'text', 'label', 'start', undefined, true);
            right = Math.max(right, x + 12 + w(d.endLabel, 'label'));
          }
        } else {
          const open = d.to === 'open';
          const xs = X(d.from!),
            xe = X(open ? today! : (d.to as number));
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
          over.push({
            k: 'line',
            x1: xs,
            y1: mid,
            x2: xe - (open ? 6 : 0),
            y2: mid,
            ink: strong,
            w: BAR,
            round: !d.fromUnknown,
          });
          if (!d.fromUnknown) {
            over.push({ k: 'dot', x: xs, y: mid, r: 4.6, ink: strong });
            over.push({ k: 'dot', x: xs, y: mid, r: 2.3, ink: 'canvas' });
          }
          for (const s of d.steps) {
            over.push({ k: 'dot', x: X(s), y: mid, r: 4.4, ink: strong });
            over.push({ k: 'dot', x: X(s), y: mid, r: 2.4, ink: 'canvas' });
          }
          if (open) over.push({ k: 'path', d: arrowHead(xe + 4, mid), ink: strong });
          else over.push({ k: 'dot', x: xe, y: mid, r: 5.2, ink: strong });
          if (d.startLabel)
            text(
              xs + (d.fromUnknown ? 0 : -3),
              mid - 13,
              d.startLabel,
              ink,
              'small',
              'start',
              undefined,
              true,
            );
          if (d.endLabel) {
            const lx = xe + (open ? 14 : 11);
            text(lx, mid, d.endLabel, 'text', 'label', 'start', undefined, true);
            right = Math.max(right, lx + w(d.endLabel, 'label'));
          }
        }
        y += r.h;
      }
      if (band.g) rects.set(band.g.id, { x: 0, y: bandY, w: chartR, h: y - bandY });
      y += BAND_GAP;
    });
    y -= BAND_GAP;
    const bottom = y + 6;

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
      const a = X(zoom![0]),
        b = Math.min(chartR, X(zoom![1]));
      under.unshift({
        k: 'rect',
        x: a,
        y: top - 4,
        w: Math.max(2, b - a),
        h: bottom - top + 4,
        ink: 'shade',
      });
      text(
        b,
        bottom + 12,
        `${rangeText(zoom![0], zoom![1])} enlarged below`,
        'muted',
        'small',
        'end',
      );
      y += 14;
    }
    for (const t of tags) {
      // A milestone has no row; its box is a point on the axis, so nothing overlaps it.
      rects.set(t.o.id, { x: t.x, y: top - 1, w: 1, h: 1 });
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

  // The legend: one entry for each kind of mark the drawing uses.
  const used = (test: (d: TimelineWhen) => boolean) => rows.some(r => test(r.when));
  const legend: Array<[string, (x: number, y: number) => TimelineMark[]]> = [];
  const sample: TimelineInk = 'muted';
  if (used(d => d.from !== undefined && !d.fromUnknown))
    legend.push([
      'Start',
      (x, y) => [
        { k: 'dot', x: x + 8, y, r: 4.6, ink: sample },
        { k: 'dot', x: x + 8, y, r: 2.3, ink: 'canvas' },
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
        { k: 'dot', x: x + 8, y, r: 4.4, ink: sample },
        { k: 'dot', x: x + 8, y, r: 2.4, ink: 'canvas' },
      ],
    ]);
  if (used(d => typeof d.to === 'number'))
    legend.push([
      'Ended',
      (x, y) => [
        { k: 'line', x1: x, y1: y, x2: x + 16, y2: y, ink: sample, w: BAR, round: true },
        { k: 'dot', x: x + 18, y, r: 5.2, ink: sample },
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
  if (used(d => d.at !== undefined))
    legend.push([
      'Event',
      (x, y) => [
        { k: 'dot', x: x + 8, y, r: 6, ink: sample },
        { k: 'dot', x: x + 8, y, r: 2.2, ink: 'canvas' },
      ],
    ]);
  if (milestones.length)
    legend.push([
      'Milestone',
      (x, y) => [
        { k: 'line', x1: x + 8, y1: y - 8, x2: x + 8, y2: y + 8, ink: 'rule', w: 1, dash: '4 4' },
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
  for (const r of rects.values()) if (r.w > 1) r.w = Math.ceil(right + 4) - r.x;
  return {
    plan: { bounds: { x: 0, y: 0, w: Math.ceil(right + 4), h: Math.ceil(y + 4) }, under, over },
    rects,
  };
}

const chevron = (x: number, y: number) => `M${x + 5},${y - 4.5}L${x},${y}L${x + 5},${y + 4.5}`;
const arrowHead = (x: number, y: number) => `M${x - 11},${y - 7}L${x + 1},${y}L${x - 11},${y + 7}Z`;

function formatTimes(n: number) {
  return `${n >= 10 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')}×`;
}
