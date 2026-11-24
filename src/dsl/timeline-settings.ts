import { bare, type SourceDoc, type Statement } from './syntax';
import { declaration, setAttr, statement, statements } from './source-edits';

export type TimelineDraft = {
  kind: string;
  start: string;
  end: string;
  unknown: boolean;
  open: boolean;
  steps: string;
};

/** Change the root recipe while retaining its direction, gap and sizing attributes. */
export function timelineLayout(doc: SourceDoc) {
  const root =
    statements(doc)
      .filter(line => line.command === 'layout' && line.args[0]?.value === 'root')
      .at(-1) ?? statement('layout', [bare('root'), bare('timeline')]);
  if (!doc.lines.includes(root)) doc.lines.push(root);
  if (root.args[1]?.value !== 'timeline') root.args = [bare('root'), bare('timeline')];
  return root;
}

/** Apply each item draft together so changing the selected item does not discard prior edits. */
export function writeTimelineDrafts(doc: SourceDoc, drafts: Map<string, TimelineDraft>) {
  for (const [id, draft] of drafts) {
    if (id === ':new') continue;
    const target = declaration(doc, id);
    if (target) writeTimelineDraft(target, draft);
  }
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
