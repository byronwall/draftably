import { bare, quoted, type SourceDoc, type Statement, type Word } from './syntax';
import { declaration, setAttr, statement, statements } from './source-edits';
import { readTimelineDates, readTimelineOptions, validateSpan } from './timeline';

export type TimelineDraft = {
  kind: string;
  start: string;
  end: string;
  unknown: boolean;
  open: boolean;
  steps: string;
  label: string;
  startBadInput?: boolean;
};

export type TimelineDraftIssue = {
  id: string;
  field: 'label' | 'start' | 'end' | 'steps' | 'snapshot';
  message: string;
};

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
  const untouchedNew =
    id === ':new' &&
    draft.kind === 'point' &&
    !draft.label.trim() &&
    !draft.start &&
    !draft.end &&
    !draft.unknown &&
    !draft.open &&
    !draft.steps.trim() &&
    !draft.startBadInput;
  if (untouchedNew) return;
  if (id === ':new' && !draft.label.trim() && draft.kind !== 'undated' && draft.startBadInput)
    return issue('start', 'Finish entering the date, or discard this new item.');
  if (id === ':new' && !draft.label.trim())
    return issue('label', 'Add a name for the new item, or discard it.');
  if (draft.kind === 'undated') return;
  if (draft.startBadInput)
    return issue('start', 'Finish entering the date, or discard this new item.');
  if (!draft.start) return issue('start', 'Add a date before applying this item.');
  if (draft.kind === 'span' && !draft.open && !draft.end)
    return issue('end', 'Add an end date or mark this span open.');

  const fail = (message: string): never => {
    throw new Error(message);
  };
  let options;
  try {
    options = readTimelineOptions(
      new Map<string, Word>(today ? [['today', bare(today)]] : []),
      fail,
    );
  } catch {
    return issue('snapshot', 'Enter a valid snapshot date.');
  }

  const attrs = new Map<string, Word>();
  if (draft.kind === 'span') {
    attrs.set('from', bare((draft.unknown ? '?' : '') + draft.start));
    if (draft.open) attrs.set('to', bare('open'));
    else attrs.set('to', bare(draft.end));
    if (draft.steps.trim())
      attrs.set(
        'steps',
        bare(
          draft.steps
            .split(',')
            .map(date => date.trim())
            .join(','),
        ),
      );
  } else attrs.set('at', bare(draft.start));

  let dates;
  try {
    dates = readTimelineDates(attrs, fail);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const invalidDate = message.match(/got (.*)\.$/)?.[1];
    const stepValues = draft.steps.split(',').map(date => date.trim());
    const field =
      draft.kind === 'span' && invalidDate !== undefined && stepValues.includes(invalidDate)
        ? 'steps'
        : invalidDate === draft.start
          ? 'start'
          : 'end';
    return issue(
      field,
      field === 'steps' ? 'Enter valid dates for each step.' : 'Enter a valid date.',
    );
  }
  if (!dates) return;
  try {
    validateSpan(dates, options.today, fail);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('open span needs'))
      return issue('snapshot', 'Set a snapshot date for an open span.');
    if (message.includes('Steps must'))
      return issue('steps', 'Steps must increase inside the span.');
    return issue(draft.open ? 'snapshot' : 'end', 'The span ends before it starts.');
  }
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
