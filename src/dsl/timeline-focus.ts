import type { TimelineMark, TimelinePlan, Tone } from './timeline-plan';
import type { TimelineOptions, TimelineRow } from './timeline';

type Window = { start: number; end: number };
type SpanShape =
  | { kind: 'point'; at: number }
  | { kind: 'span'; from?: number; to?: number; unknownStart: boolean }
  | { kind: 'unknown' };
const DAY = 86_400_000;
const isoDay = (value: string) => {
  const n = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(n) ? n : undefined;
};
const dateLabel = (n: number) => new Date(n).toISOString().slice(0, 10);
const pct = (n: number, w: Window) =>
  Math.max(0, Math.min(1, (n - w.start) / Math.max(1, w.end - w.start)));

function shape(row: TimelineRow): SpanShape {
  if (row.at) return { kind: 'point', at: isoDay(row.at)! };
  if (!row.from || !row.to) return { kind: 'unknown' };
  return {
    kind: 'span',
    from: isoDay(row.from.replace(/^\?/, '')),
    to: row.to === 'open' ? undefined : isoDay(row.to),
    unknownStart: row.from.startsWith('?'),
  };
}

function dateRange(rows: TimelineRow[], snapshot: number): Window {
  const dates = [snapshot];
  for (const row of rows) {
    const mark = shape(row);
    if (mark.kind === 'point') dates.push(mark.at);
    if (mark.kind === 'span') {
      if (mark.from !== undefined) dates.push(mark.from);
      if (mark.to !== undefined) dates.push(mark.to);
    }
  }
  const low = Math.min(...dates),
    high = Math.max(...dates);
  const pad = Math.max(14, Math.ceil(((high - low) / DAY) * 0.04));
  return { start: low - pad * DAY, end: high + pad * DAY };
}

function ticks(window: Window) {
  const range = window.end - window.start;
  if (range <= 70 * DAY) {
    const step = range <= 35 * DAY ? 7 : 14;
    const values = [window.start];
    for (let d = window.start + step * DAY; d < window.end; d += step * DAY) values.push(d);
    values.push(window.end);
    return values;
  }
  const first = new Date(window.start);
  let n = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1);
  const values: number[] = [window.start];
  while (n < window.end) {
    values.push(n);
    first.setTime(n);
    n = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1);
  }
  values.push(window.end);
  return values;
}

function tickLabel(date: number, window: Window) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    month: 'short',
    ...(window.end - window.start > 180 * DAY ? { year: '2-digit' } : { day: 'numeric' }),
  }).format(date);
}

function text(
  marks: TimelineMark[],
  x: number,
  y: number,
  value: string,
  size: number,
  tone: Tone,
  opts: Partial<Extract<TimelineMark, { kind: 'text' }>> = {},
) {
  marks.push({ kind: 'text', x, y, text: value, size, tone, ...opts });
}
function line(
  marks: TimelineMark[],
  x: number,
  y: number,
  x2: number,
  y2: number,
  tone: Tone,
  opts: Partial<Extract<TimelineMark, { kind: 'line' }>> = {},
) {
  marks.push({ kind: 'line', x, y, x2, y2, tone, ...opts });
}
function rect(
  marks: TimelineMark[],
  x: number,
  y: number,
  w: number,
  h: number,
  tone: Tone,
  opts: Partial<Extract<TimelineMark, { kind: 'rect' }>> = {},
) {
  marks.push({ kind: 'rect', x, y, w, h, tone, ...opts });
}
function dot(
  marks: TimelineMark[],
  x: number,
  y: number,
  r: number,
  tone: Tone,
  opts: Partial<Extract<TimelineMark, { kind: 'dot' }>> = {},
) {
  marks.push({ kind: 'dot', x, y, r, tone, ...opts });
}

/** Build a two-scale SVG plan: a full history rail and a row-by-row focus view. */
export function focusPlan(rows: TimelineRow[], options: TimelineOptions = {}): TimelinePlan {
  const marks: TimelineMark[] = [],
    boxes: TimelinePlan['boxes'] = {};
  const rowDates = rows.flatMap(row => {
    const mark = shape(row);
    return mark.kind === 'point'
      ? [mark.at]
      : mark.kind === 'span'
        ? [mark.from, mark.to].filter((n): n is number => n !== undefined)
        : [];
  });
  const snapshot =
    (options.today ? isoDay(options.today) : undefined) ??
    (rowDates.length ? Math.max(...rowDates) : Date.UTC(2000, 0, 1));
  const history = dateRange(rows, snapshot);
  const focus: Window = options.zoom
    ? { start: isoDay(options.zoom[0])!, end: isoDay(options.zoom[1])! }
    : history;
  const width = 980;
  const chartX = 310,
    chartW = width - chartX - 28;
  const overviewY = 88,
    overviewEndY = 118;
  const detailTop = 164,
    axisY = 202,
    rowsY = 224,
    rowH = 52;
  const contextTitle = `Full history  ${dateLabel(history.start)} — ${dateLabel(history.end)}`;
  text(marks, 24, 28, 'Timeline', 18, 'ink', { weight: 700 });
  text(marks, 24, 49, 'Focus + context', 11, 'muted');
  text(marks, width - 26, 28, contextTitle, 11, 'muted', { anchor: 'end' });
  text(marks, 24, 78, 'CONTEXT', 10, 'muted', { weight: 700 });
  text(marks, 24, 176, options.zoom ? 'MAGNIFIED DETAIL' : 'FULL HISTORY', 10, 'muted', {
    weight: 700,
  });
  text(marks, width - 26, 176, `${dateLabel(focus.start)} — ${dateLabel(focus.end)}`, 11, 'muted', {
    anchor: 'end',
  });

  // The overview carries every item as a quiet compressed mark and outlines the detail window.
  line(marks, chartX, overviewY, chartX + chartW, overviewY, 'grid', { strokeWidth: 1 });
  for (const t of ticks(history)) {
    const x = chartX + pct(t, history) * chartW;
    line(marks, x, overviewY - 8, x, overviewEndY, 'grid', { strokeWidth: 1 });
    text(marks, x, 135, tickLabel(t, history), 9, 'muted', {
      anchor: x === chartX ? 'start' : x >= chartX + chartW - 2 ? 'end' : 'middle',
    });
  }
  const zoomX = chartX + pct(focus.start, history) * chartW;
  const zoomRight = chartX + pct(focus.end, history) * chartW;
  rect(marks, zoomX, 62, Math.max(2, zoomRight - zoomX), 66, 'shade', {
    radius: 4,
    title: 'Detailed date window',
  });
  for (const release of rows.filter(r => r.milestone && r.at)) {
    const d = isoDay(release.at!)!;
    if (d < history.start || d > history.end) continue;
    const x = chartX + pct(d, history) * chartW;
    line(marks, x, overviewY - 18, x, overviewEndY, 'release', {
      dash: true,
      id: release.id,
      title: `${release.label} release`,
    });
  }
  if (snapshot >= history.start && snapshot <= history.end) {
    const x = chartX + pct(snapshot, history) * chartW;
    line(marks, x, overviewY - 18, x, overviewEndY, 'accent', {
      strokeWidth: 2,
      title: 'Snapshot date',
    });
  }
  for (const row of rows) {
    const mark = shape(row);
    const x =
      mark.kind === 'point'
        ? chartX + pct(mark.at, history) * chartW
        : mark.kind === 'span' && mark.from !== undefined
          ? chartX + pct(mark.from, history) * chartW
          : chartX;
    if (mark.kind === 'point')
      dot(marks, x, overviewY, 2.5, 'muted', { id: row.id, title: `${row.label}: ${row.at}` });
    else if (mark.kind === 'span') {
      const end = mark.to ?? snapshot;
      const left = mark.unknownStart || mark.from === undefined ? chartX : x;
      const right = chartX + pct(end, history) * chartW;
      line(marks, left, overviewY, right, overviewY, mark.unknownStart ? 'muted' : 'shade', {
        dash: mark.unknownStart,
        strokeWidth: 3,
        id: row.id,
        title: `${row.label}: ${mark.unknownStart ? 'unknown start' : dateLabel(mark.from!)} to ${row.to === 'open' ? 'snapshot' : dateLabel(end)}`,
      });
    }
  }

  // Detail is a readable list even when a row has no visible date inside the selected window.
  line(marks, 20, detailTop, width - 20, detailTop, 'grid');
  const windowLeft = chartX,
    windowRight = chartX + chartW;
  for (const t of ticks(focus)) {
    const x = chartX + pct(t, focus) * chartW;
    line(marks, x, axisY - 9, x, rowsY + rows.length * rowH, 'grid', { strokeWidth: 1 });
    text(marks, x, axisY, tickLabel(t, focus), 9, 'muted', {
      anchor: x === windowLeft ? 'start' : x >= windowRight - 2 ? 'end' : 'middle',
    });
  }
  for (const release of rows.filter(r => r.milestone && r.at)) {
    const d = isoDay(release.at!)!;
    if (d < focus.start || d > focus.end) continue;
    const x = chartX + pct(d, focus) * chartW;
    line(marks, x, detailTop + 7, x, rowsY + rows.length * rowH, 'release', {
      dash: true,
      id: release.id,
      title: `${release.label} release`,
    });
  }
  if (snapshot >= focus.start && snapshot <= focus.end) {
    const x = chartX + pct(snapshot, focus) * chartW;
    line(marks, x, detailTop + 7, x, rowsY + rows.length * rowH, 'accent', {
      strokeWidth: 2,
      title: 'Snapshot date',
    });
  }

  rows.forEach((row, index) => {
    const y = rowsY + index * rowH;
    boxes[row.id] = { x: 18, y: y - 4, w: width - 36, h: rowH };
    rect(marks, 18, y - 4, width - 36, rowH, 'paper', {
      radius: 3,
      id: row.id,
      title: `Reveal ${row.label}`,
    });
    line(marks, 18, y + rowH - 4, width - 18, y + rowH - 4, 'grid', { id: row.id });
    text(marks, 28, y + 11, row.band.toUpperCase(), 8, 'muted', { weight: 700, id: row.id });
    text(marks, 28, y + 27, row.label, 12, 'ink', { weight: 600, id: row.id, title: row.label });
    text(
      marks,
      28,
      y + 42,
      `${row.key}${row.introducedBy ? ` · added ${row.introducedBy}` : ''}${row.fixedBy ? ` · fixed ${row.fixedBy}` : ''}${row.platforms ? ` · ${row.platforms}` : ''}`,
      8,
      'muted',
      {
        id: row.id,
        title: [
          row.key,
          row.introducedBy && `added ${row.introducedBy}`,
          row.fixedBy && `fixed ${row.fixedBy}`,
          row.platforms,
        ]
          .filter(Boolean)
          .join(' · '),
      },
    );
    const mark = shape(row),
      cy = y + 24;
    if (mark.kind === 'point') {
      if (mark.at >= focus.start && mark.at <= focus.end) {
        const x = chartX + pct(mark.at, focus) * chartW;
        dot(marks, x, cy, row.milestone ? 5 : 4, row.milestone ? 'release' : 'accent', {
          hollow: !row.milestone,
          id: row.id,
          title: `${row.label} · ${row.at}`,
        });
        text(marks, x, y + 10, dateLabel(mark.at), 8, 'muted', {
          anchor: 'middle',
          id: row.id,
          title: row.at,
        });
      }
    } else if (mark.kind === 'span') {
      const end = mark.to ?? snapshot;
      const overlaps = (mark.from === undefined || mark.from <= focus.end) && end >= focus.start;
      if (overlaps) {
        const left =
          mark.unknownStart || mark.from === undefined
            ? windowLeft
            : chartX + pct(Math.max(mark.from, focus.start), focus) * chartW;
        const right = chartX + pct(Math.min(end, focus.end), focus) * chartW;
        line(marks, left, cy, right, cy, mark.unknownStart ? 'muted' : 'accent', {
          dash: mark.unknownStart,
          strokeWidth: 5,
          id: row.id,
          title: `${row.label}: ${mark.unknownStart ? 'unknown start' : row.from!.replace(/^\?/, '')} to ${row.to === 'open' ? (options.today ?? 'snapshot') : row.to}`,
        });
        if (
          !mark.unknownStart &&
          mark.from !== undefined &&
          mark.from >= focus.start &&
          mark.from <= focus.end
        ) {
          dot(marks, left, cy, 3, 'accent', {
            id: row.id,
            title: `Start ${row.from!.replace(/^\?/, '')}`,
          });
          text(marks, left, y + 10, dateLabel(mark.from), 8, 'muted', {
            anchor: 'middle',
            id: row.id,
          });
        }
        if (mark.to !== undefined && mark.to >= focus.start && mark.to <= focus.end) {
          dot(marks, right, cy, 3, 'accent', { id: row.id, title: `End ${row.to}` });
          text(marks, right, y + 40, dateLabel(mark.to), 8, 'muted', {
            anchor: 'middle',
            id: row.id,
          });
        }
        if (row.to === 'open' && snapshot >= focus.start && snapshot <= focus.end) {
          const x = chartX + pct(snapshot, focus) * chartW;
          line(marks, x, cy - 6, x, cy + 6, 'accent', {
            id: row.id,
            title: `Open end at snapshot ${options.today ?? dateLabel(snapshot)}`,
          });
          text(marks, x, y + 40, dateLabel(snapshot), 8, 'muted', {
            anchor: 'middle',
            id: row.id,
            title: `Open end at snapshot ${dateLabel(snapshot)}`,
          });
        }
        if (mark.unknownStart)
          text(marks, left, cy - 9, '? start', 8, 'muted', {
            id: row.id,
            title: 'Start date is unknown',
          });
      }
      for (const step of row.steps ?? []) {
        const d = isoDay(step)!;
        if (d < focus.start || d > focus.end || d > snapshot) continue;
        const x = chartX + pct(d, focus) * chartW;
        dot(marks, x, cy, 2.5, 'paper', { id: row.id, title: `Step ${step}` });
        line(marks, x, cy - 6, x, cy + 6, 'ink', { id: row.id, title: `Step ${step}` });
        text(marks, x, y + 10, dateLabel(d), 8, 'muted', {
          anchor: 'middle',
          id: row.id,
          title: `Step ${step}`,
        });
      }
    } else {
      text(marks, chartX + chartW / 2, cy + 3, '? date unknown', 9, 'muted', {
        anchor: 'middle',
        id: row.id,
      });
    }
  });

  return { width, height: rowsY + rows.length * rowH + 18, marks, boxes };
}
