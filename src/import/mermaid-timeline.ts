/**
 * Mermaid `gantt` and `timeline` -> a native timeline. Mermaid has already computed every gantt
 * date (`after`, durations, excluded days), so tasks keep its dates exactly: sections become
 * bands, tasks become rows, `after` becomes a drawn dependency, and `vert` a milestone rule. A
 * Mermaid timeline's periods become dates on an ordinal axis, one row per event.
 */
import { Ids, blankPlan, finish, type Diagnostic, type ImportResult } from './import-core';
import type { GanttSnapshot, TimelineSnapshot } from './mermaid-facade';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function mapMermaidGantt(
  snapshot: GanttSnapshot,
  _plainText: (value: string) => string,
  title: string,
  diagnostics: Diagnostic[],
): ImportResult {
  // Mermaid draws gantt text verbatim (`List<T>` stays), so labels keep it; quoting makes it safe.
  const plan = blankPlan(snapshot.title ?? title),
    ids = new Ids();
  const note = (code: string, message: string, severity: Diagnostic['severity'] = 'info') =>
    diagnostics.push({ code, severity, impact: 'semantics', message });
  plan.layouts.push({ scope: 'root', kind: 'timeline' });
  // A band is made once per section name, and only when it holds a row.
  const band = new Map<string, string>();
  const bandOf = (name: string | undefined) => {
    if (!name) return undefined;
    if (!band.has(name)) {
      const id = ids.get('section', name, 'section_' + (band.size + 1));
      band.set(name, id);
      plan.objects.push({ id, kind: 'group', label: name });
    }
    return band.get(name);
  };
  const byId = new Map(snapshot.tasks.map(t => [t.id, t]));
  const rows = new Map<string, string>();
  for (const t of snapshot.tasks) {
    const id = ids.get('task', t.id);
    const label = t.label || t.id;
    if (t.vert) {
      // A vertical marker crosses every section, as a milestone rule does.
      plan.objects.push({ id, kind: 'milestone', label, attrs: [['at', t.start]] });
      continue;
    }
    // Compared on Mermaid's timestamps, before a milestone is centered: a day hides an hour.
    if (t.endAt < t.startAt) {
      diagnostics.push({
        code: 'MERMAID_GANTT_REVERSED',
        severity: 'error',
        impact: 'semantics',
        message: `${t.id} (${label}) ends on ${t.end}, before it starts on ${t.start}.`,
      });
      continue;
    }
    rows.set(t.id, id);
    // Mermaid centers a milestone on its span; a bar ends where Mermaid draws it.
    const attrs: Array<[string, string]> = t.milestone
      ? [['at', t.mid]]
      : t.drawEnd <= t.start
        ? [['at', t.start]]
        : [
            ['from', t.start],
            ['to', t.drawEnd],
          ];
    if (t.done && attrs[0][0] === 'from') attrs.push(['progress', '100']);
    const parent = bandOf(t.section);
    plan.objects.push({
      id,
      kind: 'node',
      label,
      ...(parent ? { parent } : {}),
      ...(t.crit ? { color: 'red' } : {}),
      attrs,
    });
  }
  // `after` places a task in Mermaid and draws nothing; here it is also a drawn dependency, when
  // the start Mermaid computed is the latest end of the tasks it names.
  for (const t of snapshot.tasks) {
    if (!t.after.length || !rows.has(t.id)) continue;
    const named = t.after.map(a => byId.get(a));
    const latest = named.every(n => n && !n.vert)
      ? Math.max(...named.map(n => n!.endAt))
      : undefined;
    if (latest !== t.startAt || !t.after.every(a => rows.has(a))) {
      note(
        'MERMAID_GANTT_AFTER',
        `${t.id} starts after ${t.after.join(' ')}, but Mermaid placed it on ${t.start}; no dependency arrow is drawn.`,
        'warning',
      );
      continue;
    }
    for (const before of t.after)
      plan.edges.push({
        id: ids.get('edge', before + '>' + t.id, 'after_' + rows.get(t.id)),
        from: rows.get(before)!,
        to: rows.get(t.id)!,
        label: '',
        directed: true,
      });
  }
  if (snapshot.tasks.some(t => t.partialDay))
    note(
      'MERMAID_GANTT_TIMES',
      'Times of day are rounded to whole days; a native timeline places dates, not hours.',
      'warning',
    );
  if (snapshot.excludes.length)
    note(
      'MERMAID_GANTT_EXCLUDES',
      `Mermaid skipped ${snapshot.excludes.join(', ')} when it computed the dates; each bar ends where Mermaid draws it, and the axis shows calendar days.`,
    );
  if (snapshot.tasks.some(t => t.active))
    note(
      'MERMAID_GANTT_ACTIVE',
      'active has no native mark; done becomes progress=100 and crit becomes color=red.',
    );
  if (snapshot.axisFormat)
    note('MERMAID_GANTT_AXIS', 'axisFormat is not kept; the native axis picks its own ticks.');
  return finish('mermaid', 'gantt', plan, diagnostics, ids);
}

/** A Mermaid timeline period as a date: `2004`, `2004-06` or `2004-06-01`. */
function periodDate(period: string): string | undefined {
  if (/^\d{4}$/.test(period)) return `${period}-01-01`;
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  if (ISO.test(period)) return period;
  return undefined;
}

export function mapMermaidTimeline(
  snapshot: TimelineSnapshot,
  plainText: (value: string) => string,
  title: string,
  diagnostics: Diagnostic[],
): ImportResult {
  const plan = blankPlan(snapshot.title ?? title),
    ids = new Ids();
  void plainText;
  const undated = snapshot.periods.filter(p => !periodDate(p.period));
  if (undated.length) {
    diagnostics.push({
      code: 'MERMAID_TIMELINE_UNDATED',
      severity: 'error',
      impact: 'semantics',
      message: `A native timeline places periods by date; write each period as a year, YYYY-MM or YYYY-MM-DD. Not a date: ${undated
        .slice(0, 3)
        .map(p => JSON.stringify(p.period))
        .join(', ')}${undated.length > 3 ? ' …' : ''}.`,
    });
    return finish('mermaid', 'timeline', plan, diagnostics, ids);
  }
  // Periods are evenly spaced in Mermaid, so the native axis is ordinal: one step per date.
  plan.layouts.push({ scope: 'root', kind: 'timeline', options: [['scale', 'ordinal']] });
  const band = new Map<string, string>();
  const bandOf = (name: string | undefined) => {
    if (!name) return undefined;
    if (!band.has(name)) {
      const id = ids.get('section', name, 'section_' + (band.size + 1));
      band.set(name, id);
      plan.objects.push({ id, kind: 'group', label: name });
    }
    return band.get(name);
  };
  snapshot.periods.forEach((p, i) => {
    const parent = bandOf(p.section),
      at = periodDate(p.period)!;
    const events = p.events.length ? p.events : [p.period];
    events.forEach((event, j) =>
      plan.objects.push({
        id: ids.get(
          'event',
          `${i}:${j}`,
          `event_${i + 1}${events.length > 1 ? '_' + (j + 1) : ''}`,
        ),
        kind: 'node',
        // Mermaid breaks a line at <br>; a row name is one line, so the break becomes a space.
        label: event
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        ...(parent ? { parent } : {}),
        attrs: [['at', at]],
      }),
    );
  });
  return finish('mermaid', 'timeline', plan, diagnostics, ids);
}
