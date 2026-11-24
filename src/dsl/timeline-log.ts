import { typeProfile, wrapLines, truncateText, type FontRole } from '../model/fonts';
import type { TimelineRow, TimelineOptions } from './timeline';
import type { TimelineMark, TimelinePlan } from './timeline-plan';

type EventKind = 'point' | 'start' | 'end' | 'step';
type LogEvent = {
  date: string;
  row: TimelineRow;
  kind: EventKind;
  uncertain?: boolean;
};
type DateGroup = { date: string; events: LogEvent[]; today?: boolean };

const WIDTH = 760;
const LEFT = 18;
const RAIL = 112;
const CONTENT = 135;
const RIGHT = WIDTH - 18;
const CARD_GAP = 10;
const CARD_W = (RIGHT - CONTENT - CARD_GAP) / 2;
const DAY = 86_400_000;

function day(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...options }).format(new Date(day(date)));
}

function gapDays(from: string, to: string) {
  return Math.round((day(to) - day(from)) / DAY);
}

function groupRows(rows: TimelineRow[]): DateGroup[] {
  const byDate = new Map<string, LogEvent[]>();
  const add = (event: LogEvent) => {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  };
  for (const row of rows) {
    if (row.at) add({ date: row.at, row, kind: 'point' });
    if (row.from) {
      const uncertain = row.from.startsWith('?');
      add({
        date: uncertain ? row.from.slice(1) : row.from,
        row,
        kind: 'start',
        uncertain,
      });
    }
    if (row.to && row.to !== 'open') add({ date: row.to, row, kind: 'end' });
    for (const date of row.steps) add({ date, row, kind: 'step' });
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => day(a) - day(b))
    .map(([date, events]) => ({ date, events }));
}

function snapshotStatus(
  row: TimelineRow,
  today: string,
): 'Active' | 'Start unclear' | 'Ends today' | undefined {
  const unknownStart = row.from?.startsWith('?') ?? false;
  const start = row.from?.replace(/^\?/, '');
  const end = row.to && row.to !== 'open' ? row.to : undefined;
  if (!start && !end) return;
  if (end && end < today) return;
  if (start && start > today) return unknownStart ? 'Start unclear' : undefined;
  // A date has no intra-day order. Treat a span that ends today as a distinct state.
  if (end === today) return 'Ends today';
  return 'Active';
}

function kindLabel(event: LogEvent) {
  if (event.kind === 'point') return event.row.milestone ? 'Milestone' : 'Event';
  if (event.kind === 'start') return event.uncertain ? 'Started before' : 'Starts';
  if (event.kind === 'end') return 'Ends';
  return 'Step';
}

function kindTone(event: LogEvent): TimelineMark['tone'] {
  if (event.kind === 'point') return event.row.milestone ? 'release' : 'accent';
  if (event.kind === 'start') return event.uncertain ? 'muted' : 'accent';
  if (event.kind === 'end') return 'release';
  return 'muted';
}

function addBox(
  boxes: TimelinePlan['boxes'],
  id: string,
  box: { x: number; y: number; w: number; h: number },
) {
  // Each occurrence carries its own item ID. One box anchors keyboard focus and reveal.
  if (!Object.hasOwn(boxes, id)) boxes[id] = box;
}

function text(
  marks: TimelineMark[],
  textValue: string,
  x: number,
  y: number,
  options: Partial<Extract<TimelineMark, { kind: 'text' }>> = {},
) {
  marks.push({ kind: 'text', text: textValue, x, y, ...options });
}

function drawCard(
  marks: TimelineMark[],
  boxes: TimelinePlan['boxes'],
  event: LogEvent,
  role: FontRole,
  x: number,
  y: number,
) {
  const titleLines = wrapLines(event.row.label, CARD_W - 22, typeProfile(role, true, 12, 14));
  const details = [
    event.uncertain && event.kind === 'start' ? 'Exact start unknown · began before this date' : '',
    event.row.band,
    event.row.key,
    event.row.platforms ?? '',
    event.row.introducedBy ? `Introduced by ${event.row.introducedBy}` : '',
    event.row.fixedBy ? `Fixed by ${event.row.fixedBy}` : '',
  ].filter(Boolean);
  const detailLines = details.flatMap(value =>
    wrapLines(value, CARD_W - 22, typeProfile(role, false, 9, 12)),
  );
  const height = 30 + titleLines.length * 14 + detailLines.length * 12;
  const id = event.row.id;
  const box = { x, y, w: CARD_W, h: height };
  marks.push({
    kind: 'rect',
    x,
    y,
    w: CARD_W,
    h: height,
    radius: 6,
    tone: event.row.milestone ? 'shade' : 'paper',
    id,
    title: event.row.label,
  });
  marks.push({
    kind: 'dot',
    x: x + 12,
    y: y + 13,
    r: 3.4,
    hollow: event.kind === 'start' && event.uncertain,
    tone: kindTone(event),
    id,
    title: kindLabel(event),
  });
  text(marks, kindLabel(event), x + 22, y + 16, {
    size: 9,
    weight: 700,
    tone: 'ink',
    id,
    title: kindLabel(event),
  });
  let lineY = y + 33;
  for (const line of titleLines) {
    text(marks, line, x + 11, lineY, {
      size: 12,
      weight: 600,
      tone: 'ink',
      id,
      title: event.row.label,
    });
    lineY += 14;
  }
  for (const line of detailLines) {
    text(marks, line, x + 11, lineY, {
      size: 9,
      tone: 'muted',
      id,
      title: event.row.label,
    });
    lineY += 12;
  }
  addBox(boxes, id, box);
  return height;
}

function drawSnapshot(
  marks: TimelineMark[],
  boxes: TimelinePlan['boxes'],
  rows: TimelineRow[],
  today: string,
  role: FontRole,
  top: number,
) {
  const current = rows.flatMap(row => {
    const status = snapshotStatus(row, today);
    return status ? [{ row, status }] : [];
  });
  const possible = current.filter(r => r.status === 'Start unclear').length;
  const confirmed = current.length - possible;
  const columns = 2;
  const lines = Math.ceil(current.length / columns);
  const height = Math.max(48, 35 + lines * 17);
  const x = LEFT;
  const width = RIGHT - LEFT;
  marks.push({
    kind: 'rect',
    x,
    y: top,
    w: width,
    h: height,
    radius: 7,
    tone: 'shade',
    title: `Status snapshot for ${today}`,
  });
  text(
    marks,
    `TODAY · ${formatDate(today, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    x + 12,
    top + 17,
    { size: 10, weight: 750, tone: 'ink' },
  );
  text(
    marks,
    possible
      ? `${confirmed} confirmed · ${possible} possible`
      : `${confirmed} ${confirmed === 1 ? 'span overlaps' : 'spans overlap'} this date`,
    x + 12,
    top + 31,
    { size: 9, tone: 'muted' },
  );
  current.forEach(({ row, status }, i) => {
    const col = i % columns;
    const line = Math.floor(i / columns);
    const itemX = x + 256 + col * 232;
    const itemY = top + 17 + line * 17;
    const profile = typeProfile(role, true, 10, 12);
    const label = truncateText(row.label, 142, profile);
    text(marks, label, itemX, itemY, {
      size: 10,
      weight: 600,
      tone: 'ink',
      id: row.id,
      title: row.label,
    });
    text(marks, status, itemX + 150, itemY, {
      size: 9,
      tone: 'ink',
      id: row.id,
      title: `${row.label}: ${status}`,
    });
    addBox(boxes, row.id, { x: itemX - 4, y: itemY - 11, w: 218, h: 15 });
  });
  return height;
}

export function logPlan(
  rows: TimelineRow[],
  options: TimelineOptions,
  role: FontRole = 'sans',
): TimelinePlan {
  const marks: TimelineMark[] = [];
  const boxes: TimelinePlan['boxes'] = Object.create(null);
  text(marks, 'EVENT LOG', LEFT, 19, { size: 9, weight: 750, tone: 'muted' });
  text(marks, 'Events by date', LEFT, 39, {
    size: 16,
    weight: 700,
    tone: 'ink',
  });
  text(marks, 'Same-day events share a date; their order is unknown.', LEFT, 54, {
    size: 9,
    tone: 'muted',
  });

  const snapshotTop = 66;
  const snapshotHeight = options.today
    ? drawSnapshot(marks, boxes, rows, options.today, role, snapshotTop)
    : 0;
  const groups = groupRows(rows);
  if (options.today) {
    const todayGroup = groups.find(group => group.date === options.today);
    if (todayGroup) todayGroup.today = true;
    else groups.push({ date: options.today, events: [], today: true });
  }
  groups.sort((a, b) => day(a.date) - day(b.date));

  const streamTop = snapshotHeight ? snapshotTop + snapshotHeight + 18 : 72;
  const axisLine: Extract<TimelineMark, { kind: 'line' }> = {
    kind: 'line',
    x: RAIL,
    y: streamTop - 5,
    x2: RAIL,
    y2: streamTop + 20,
    strokeWidth: 1,
    tone: 'grid',
  };
  marks.push(axisLine);
  let cursor = streamTop;
  let priorDate: string | undefined;
  for (const group of groups) {
    if (priorDate) {
      const gap = gapDays(priorDate, group.date);
      if (gap > 0) {
        const gapY = cursor + 5;
        marks.push({
          kind: 'line',
          x: RAIL - 4,
          y: gapY,
          x2: RAIL + 4,
          y2: gapY,
          dash: true,
          tone: 'grid',
        });
        text(marks, `${gap} ${gap === 1 ? 'day' : 'days'} later`, CONTENT, gapY + 3, {
          size: 9,
          tone: 'muted',
        });
        cursor += 23;
      }
    }

    const dateY = cursor + 15;
    const dateTone = group.today ? 'ink' : 'muted';
    text(marks, formatDate(group.date, { weekday: 'short' }).toUpperCase(), LEFT, dateY - 1, {
      size: 8,
      weight: 700,
      tone: dateTone,
    });
    text(
      marks,
      formatDate(group.date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      LEFT,
      dateY + 12,
      { size: 10, weight: 650, tone: group.today ? 'accent' : 'ink' },
    );
    marks.push({
      kind: 'dot',
      x: RAIL,
      y: dateY + 2,
      r: group.today ? 4.2 : 3.2,
      hollow: !group.today,
      tone: group.today ? 'accent' : 'muted',
      title: group.today ? 'Today' : group.date,
    });
    if (group.today)
      text(marks, 'TODAY', CONTENT, dateY - 1, {
        size: 8,
        weight: 750,
        tone: 'ink',
      });

    if (group.events.length) {
      let groupHeight = 0;
      for (let i = 0; i < group.events.length; i += 2) {
        const pair = group.events.slice(i, i + 2);
        const rowY = dateY + 20 + groupHeight;
        const heights = pair.map((event, col) =>
          drawCard(marks, boxes, event, role, CONTENT + col * (CARD_W + CARD_GAP), rowY),
        );
        groupHeight += Math.max(...heights) + 8;
      }
      cursor = dateY + 20 + groupHeight;
    } else if (group.today) {
      cursor = dateY + 18;
    } else {
      text(marks, 'No event recorded on this date.', CONTENT, dateY + 13, {
        size: 9,
        tone: 'muted',
      });
      cursor = dateY + 26;
    }
    priorDate = group.date;
    cursor += 8;
  }
  axisLine.y2 = cursor - 4;

  if (groups.length === 0)
    text(marks, 'No dated events.', CONTENT, streamTop + 16, {
      size: 10,
      tone: 'muted',
    });
  return {
    width: WIDTH,
    height: Math.max(cursor + 8, snapshotTop + snapshotHeight + 24),
    marks,
    boxes,
  };
}

export { groupRows, snapshotStatus };
