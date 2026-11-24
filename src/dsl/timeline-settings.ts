import { bare, quoted, type SourceDoc, type Statement } from './syntax';
import { declaration, setAttr, statement, statements } from './source-edits';

export type TimelineDraft = {
  kind: string;
  start: string;
  end: string;
  unknown: boolean;
  open: boolean;
  steps: string;
  label: string;
};

export type TimelineDraftIssue = {
  id: string;
  field: 'label' | 'start' | 'end' | 'steps' | 'snapshot';
  message: string;
};

function validDate(value: string) {
  const ms = Date.parse(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(ms) &&
    new Date(ms).toISOString().slice(0, 10) === value
  );
}

export function validateTimelineDraft(
  id: string,
  draft: TimelineDraft,
  today: string | undefined,
): TimelineDraftIssue | undefined {
  const issue = (field: TimelineDraftIssue['field'], message: string): TimelineDraftIssue => ({
    id,
    field,
    message,
  });
  if (id === ':new' && !draft.label.trim()) return;
  if (id === ':new' && !draft.start)
    return issue('start', 'Add a date for the new item, or discard it.');
  if (draft.kind === 'undated') return;
  if (!draft.start) return issue('start', 'Add a date before applying this item.');
  if (!validDate(draft.start)) return issue('start', 'Enter a valid date.');
  if (draft.kind !== 'span') return;

  const steps = draft.steps.trim() ? draft.steps.split(',').map(step => step.trim()) : [];
  if (steps.some(step => !step || !validDate(step)))
    return issue('steps', 'Enter each step as a valid YYYY-MM-DD date.');
  let previous = draft.start;
  for (const step of steps) {
    if (step <= previous) return issue('steps', 'Steps must follow the start date in order.');
    previous = step;
  }

  let end = draft.end;
  if (draft.open) {
    if (!today) return issue('snapshot', 'Set a snapshot date for an open span.');
    if (!validDate(today)) return issue('snapshot', 'Enter a valid snapshot date.');
    end = today;
  } else {
    if (!end) return issue('end', 'Add an end date or mark this span open.');
    if (!validDate(end)) return issue('end', 'Enter a valid end date.');
  }
  if (end <= previous)
    return issue(
      draft.open ? 'snapshot' : 'end',
      'The end date must follow the start and all steps.',
    );
}

/** Change the root recipe while retaining its direction, gap and sizing attributes. */
export function timelineLayout(doc: SourceDoc) {
  const root =
    statements(doc)
      .filter(line => line.command === 'layout' && line.args[0]?.value === 'root')
      .at(-1) ?? statement('layout', [bare('root'), bare('timeline')]);
  if (!doc.lines.includes(root)) doc.lines.push(root);
  if (root.args[1]?.value !== 'timeline') root.args = [bare('root'), bare('timeline')];
  const supported = new Set([
    'direction',
    'gap',
    'min-width',
    'min-height',
    'fit',
    'today',
    'zoom',
  ]);
  root.attrs = root.attrs.filter(([key]) => supported.has(key));
  return root;
}

/** Apply each item draft together so changing the selected item does not discard prior edits. */
export function writeTimelineDrafts(doc: SourceDoc, drafts: Map<string, TimelineDraft>) {
  const root = statements(doc)
    .filter(line => line.command === 'layout' && line.args[0]?.value === 'root')
    .at(-1);
  const today = root?.attrs.find(([key]) => key === 'today')?.[1].value;
  for (const [id, draft] of drafts) {
    const invalid = validateTimelineDraft(id, draft, today);
    if (invalid) return invalid;
  }
  for (const [id, draft] of drafts) {
    if (id === ':new') {
      if (!draft.label.trim()) continue;
      const ids = new Set(
        statements(doc)
          .filter(line => ['node', 'group', 'edge', 'action'].includes(line.command))
          .map(line => line.args[0]?.value),
      );
      let number = 1;
      while (ids.has(`event${number}`)) number++;
      const created = statement('node', [bare(`event${number}`), quoted(draft.label.trim())]);
      writeTimelineDraft(created, draft);
      doc.lines.push(created);
      continue;
    }
    const target = declaration(doc, id);
    if (target) writeTimelineDraft(target, draft);
  }
  return undefined;
}

export function writeTimelineDraft(target: Statement, draft: TimelineDraft) {
  for (const key of ['at', 'from', 'to', 'milestone', 'steps']) setAttr(target, key, undefined);
  if (draft.kind === 'undated') {
    for (const key of ['key', 'introduced-by', 'fixed-by', 'platforms'])
      setAttr(target, key, undefined);
  } else if (draft.kind === 'span') {
    setAttr(target, 'from', bare((draft.unknown ? '?' : '') + draft.start));
    setAttr(target, 'to', bare(draft.open ? 'open' : draft.end));
    if (draft.steps.trim())
      setAttr(
        target,
        'steps',
        bare(
          draft.steps
            .split(',')
            .map(date => date.trim())
            .join(','),
        ),
      );
  } else {
    setAttr(target, 'at', bare(draft.start));
    if (draft.kind === 'milestone') setAttr(target, 'milestone', bare('on'));
  }
}
