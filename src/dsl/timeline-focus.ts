import type { TimelineMark, TimelinePlan, Tone } from './timeline-plan';
import type { TimelineOptions, TimelineRow } from './timeline';
import { measureText, type TypeProfile } from '../model/fonts';

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
const clipText = (value: string, max: number) => {
  const chars = Array.from(value);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : value;
};
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
  const startYear = first.getUTCFullYear(),
    startMonth = first.getUTCMonth();
  const last = new Date(window.end);
  const monthCount = (last.getUTCFullYear() - startYear) * 12 + last.getUTCMonth() - startMonth + 1;
  const monthStep = Math.max(1, Math.ceil(monthCount / 8));
  let n = Date.UTC(startYear, startMonth + 1, 1);
  const values: number[] = [];
  while (n < window.end) {
    const date = new Date(n);
    const index = (date.getUTCFullYear() - startYear) * 12 + date.getUTCMonth() - startMonth;
    if (index % monthStep === 0) values.push(n);
    n = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return values;
}

function tickLabel(date: number, window: Window) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    month: 'short',
    ...(window.end - window.start > 180 * DAY ? { year: '2-digit' } : { day: 'numeric' }),
  }).format(date);
}
const stepLabel = (date: number) =>
  new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(date);
const tickAnchor = (x: number, left: number, right: number): 'start' | 'middle' | 'end' =>
  x <= left + 14 ? 'start' : x >= right - 14 ? 'end' : 'middle';

function visibleTickLabels(
  values: number[],
  window: Window,
  left: number,
  right: number,
  face: TypeProfile['face'],
) {
  const candidates = values.map((date, index) => {
    const x = left + pct(date, window) * (right - left);
    const label = tickLabel(date, window);
    const anchor = tickAnchor(x, left, right);
    const width = measureText(label, { face, size: 9 });
    return {
      x,
      label,
      anchor,
      index,
      left: x - (anchor === 'end' ? width : anchor === 'middle' ? width / 2 : 0),
      right: x + (anchor === 'start' ? width : anchor === 'middle' ? width / 2 : 0),
    };
  });
  const visible: typeof candidates = [];
  for (const candidate of candidates) {
    if (candidate.index === candidates.length - 1) {
      while (visible.length > 1 && visible[visible.length - 1].right + 3 > candidate.left)
        visible.pop();
      visible.push(candidate);
    } else if (
      visible.length === 0 ||
      (visible[visible.length - 1].right + 3 <= candidate.left &&
        candidate.right + 3 <= candidates[candidates.length - 1].left)
    ) {
      visible.push(candidate);
    }
  }
  return visible;
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
export function focusPlan(
  rows: TimelineRow[],
  options: TimelineOptions = {},
  annotationFace: TypeProfile['face'] = 'sans-500',
): TimelinePlan {
  const marks: TimelineMark[] = [],
    boxes: TimelinePlan['boxes'] = Object.create(null);
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
  const magnification = (history.end - history.start) / Math.max(1, focus.end - focus.start);
  text(
    marks,
    24,
    176,
    options.zoom ? `MAGNIFIED DETAIL · ${magnification.toFixed(1)}×` : 'FULL HISTORY',
    10,
    'muted',
    {
      weight: 700,
    },
  );
  text(marks, width - 26, 176, `${dateLabel(focus.start)} — ${dateLabel(focus.end)}`, 11, 'muted', {
    anchor: 'end',
  });

  // The overview carries every item as a quiet compressed mark and outlines the detail window.
  line(marks, chartX, overviewY, chartX + chartW, overviewY, 'grid', {
    strokeWidth: 1,
  });
  const zoomX = chartX + pct(focus.start, history) * chartW;
  const zoomRight = chartX + pct(focus.end, history) * chartW;
  rect(marks, zoomX, 62, Math.max(2, zoomRight - zoomX), 66, 'shade', {
    radius: 4,
    title: 'Detailed date window',
  });
  const historyTicks = ticks(history);
  const historyLabels = visibleTickLabels(
    historyTicks,
    history,
    chartX,
    chartX + chartW,
    annotationFace,
  );
  for (const t of historyTicks) {
    const x = chartX + pct(t, history) * chartW;
    line(marks, x, overviewY - 8, x, overviewEndY, 'grid', { strokeWidth: 1 });
  }
  for (const { x, label, anchor } of historyLabels) {
    text(marks, x, 135, label, 9, 'muted', { anchor });
  }
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
  if (options.today && snapshot >= history.start && snapshot <= history.end) {
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
      dot(marks, x, overviewY, 2.5, 'muted', {
        id: row.id,
        title: `${row.label}: ${row.at}`,
      });
    else if (mark.kind === 'span') {
      const end = mark.to ?? snapshot;
      const left = mark.from === undefined ? chartX : x;
      const right = chartX + pct(end, history) * chartW;
      if (mark.unknownStart && mark.from !== undefined) {
        const boundary = chartX + pct(mark.from, history) * chartW;
        if (boundary > chartX)
          line(marks, chartX, overviewY, boundary, overviewY, 'muted', {
            dash: true,
            strokeWidth: 3,
            id: row.id,
            title: `Before ${dateLabel(mark.from)}`,
          });
        if (right > boundary)
          line(marks, boundary, overviewY, right, overviewY, 'accent', {
            strokeWidth: 3,
            id: row.id,
            title: `Known duration after ${dateLabel(mark.from)}`,
          });
      } else {
        line(marks, left, overviewY, right, overviewY, 'accent', {
          strokeWidth: 3,
          id: row.id,
          title: `${row.label}: ${dateLabel(mark.from!)} to ${row.to === 'open' ? 'snapshot' : dateLabel(end)}`,
        });
      }
    }
  }

  // Detail is a readable list even when a row has no visible date inside the selected window.
  line(marks, 20, detailTop, width - 20, detailTop, 'grid');
  rows.forEach((row, index) => {
    const y = rowsY + index * rowH;
    boxes[row.id] = { x: 18, y: y - 4, w: width - 36, h: rowH };
    rect(marks, 18, y - 4, width - 36, rowH, 'paper', {
      radius: 3,
      id: row.id,
      title: `Reveal ${row.label}`,
    });
    line(marks, 18, y + rowH - 4, width - 18, y + rowH - 4, 'grid', {
      id: row.id,
    });
  });
  const windowLeft = chartX,
    windowRight = chartX + chartW;
  const focusTicks = ticks(focus);
  const focusLabels = visibleTickLabels(focusTicks, focus, windowLeft, windowRight, annotationFace);
  for (const t of focusTicks) {
    const x = chartX + pct(t, focus) * chartW;
    line(marks, x, axisY - 9, x, rowsY + rows.length * rowH, 'grid', {
      strokeWidth: 1,
    });
  }
  for (const { x, label, anchor } of focusLabels) {
    text(marks, x, axisY, label, 9, 'muted', { anchor });
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
  if (options.today && snapshot >= focus.start && snapshot <= focus.end) {
    const x = chartX + pct(snapshot, focus) * chartW;
    line(marks, x, detailTop + 7, x, rowsY + rows.length * rowH, 'accent', {
      strokeWidth: 2,
      title: 'Snapshot date',
    });
  }

  rows.forEach((row, index) => {
    const y = rowsY + index * rowH;
    text(marks, 28, y + 11, row.band.toUpperCase(), 8, 'muted', {
      weight: 700,
      id: row.id,
    });
    text(marks, 28, y + 27, clipText(row.label, 39), 12, 'ink', {
      weight: 600,
      id: row.id,
      title: row.label,
    });
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
      const overlaps =
        end >= focus.start &&
        (mark.unknownStart || mark.from === undefined || mark.from <= focus.end);
      if (overlaps) {
        const left =
          mark.unknownStart || mark.from === undefined
            ? windowLeft
            : chartX + pct(Math.max(mark.from, focus.start), focus) * chartW;
        const right = chartX + pct(Math.min(end, focus.end), focus) * chartW;
        if (mark.unknownStart && mark.from !== undefined) {
          const boundary =
            chartX + pct(Math.max(focus.start, Math.min(mark.from, focus.end)), focus) * chartW;
          if (boundary > left)
            line(marks, left, cy, boundary, cy, 'muted', {
              dash: true,
              strokeWidth: 5,
              id: row.id,
              title: `Before ${dateLabel(mark.from)}`,
            });
          if (right > boundary)
            line(marks, boundary, cy, right, cy, 'accent', {
              strokeWidth: 5,
              id: row.id,
              title: `Known duration after ${dateLabel(mark.from)} to ${row.to === 'open' ? (options.today ?? 'snapshot') : row.to}`,
            });
        } else {
          line(marks, left, cy, right, cy, 'accent', {
            strokeWidth: 5,
            id: row.id,
            title: `${row.label}: ${row.from!.replace(/^\?/, '')} to ${row.to === 'open' ? (options.today ?? 'snapshot') : row.to}`,
          });
        }
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
        } else if (mark.from !== undefined && mark.from < focus.start) {
          text(
            marks,
            left + 5,
            y + 10,
            `← ${mark.unknownStart ? 'before ' : ''}${dateLabel(mark.from)}`,
            8,
            'muted',
            {
              id: row.id,
              title: `${mark.unknownStart ? 'Known-from bound' : 'Actual start'} ${dateLabel(mark.from)} is before this detail window`,
            },
          );
        }
        if (
          mark.unknownStart &&
          mark.from !== undefined &&
          mark.from >= focus.start &&
          mark.from <= focus.end
        )
          text(
            marks,
            chartX + pct(mark.from, focus) * chartW,
            y + 10,
            `before ${dateLabel(mark.from)}`,
            8,
            'muted',
            {
              anchor: 'middle',
              id: row.id,
              title: `Unknown duration before ${dateLabel(mark.from)}`,
            },
          );
        if (mark.to !== undefined && mark.to >= focus.start && mark.to <= focus.end) {
          dot(marks, right, cy, 3, 'accent', {
            id: row.id,
            title: `End ${row.to}`,
          });
          text(marks, right, y + 40, dateLabel(mark.to), 8, 'muted', {
            anchor: 'middle',
            id: row.id,
          });
        } else if (mark.to !== undefined && mark.to > focus.end) {
          text(marks, right - 5, y + 40, `→ ${dateLabel(mark.to)}`, 8, 'muted', {
            anchor: 'end',
            id: row.id,
            title: `Actual end ${dateLabel(mark.to)} is after this detail window`,
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
        } else if (row.to === 'open' && snapshot > focus.end) {
          text(marks, chartX + chartW - 5, y + 40, `→ ${dateLabel(snapshot)} open`, 8, 'muted', {
            anchor: 'end',
            id: row.id,
            title: `Open end at snapshot ${dateLabel(snapshot)}`,
          });
        }
      }
      for (const [stepIndex, step] of (row.steps ?? []).entries()) {
        const d = isoDay(step)!;
        if (d < focus.start || d > focus.end) continue;
        const x = chartX + pct(d, focus) * chartW;
        dot(marks, x, cy, 2.5, 'paper', { id: row.id, title: `Step ${step}` });
        line(marks, x, cy - 6, x, cy + 6, 'ink', {
          id: row.id,
          title: `Step ${step}`,
        });
        const label = stepLabel(d);
        const labelWidth = measureText(label, { face: annotationFace, size: 8 });
        const left = x - labelWidth / 2,
          right = x + labelWidth / 2;
        const lanes = [y + 10, y + 40];
        const overlaps = (baseline: number) =>
          marks.some(mark => {
            if (mark.kind !== 'text' || mark.id !== row.id || mark.y !== baseline) return false;
            const width = measureText(mark.text, { face: annotationFace, size: mark.size ?? 14 });
            const markLeft =
              mark.x - (mark.anchor === 'end' ? width : mark.anchor === 'middle' ? width / 2 : 0);
            const markRight =
              mark.x + (mark.anchor === 'start' ? width : mark.anchor === 'middle' ? width / 2 : 0);
            return markRight + 3 > left && right + 3 > markLeft;
          });
        const preferred = stepIndex % 2 ? 1 : 0;
        const lane = [preferred, 1 - preferred].find(index => !overlaps(lanes[index])) ?? preferred;
        text(marks, x, lanes[lane], label, 8, 'muted', {
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
