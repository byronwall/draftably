/**
 * Canvas text that is not a shape, container or connection: the title and subtitle, notes, legend
 * rows and sequence phase labels. Each has a text id (`@title`, `@note:0`, `@legend:1`,
 * `@phase:review`) that the canvas, the Inspector and the inline editor share. The id is never a
 * valid object id, so it never enters the object selection.
 */
import { createRoot, createSignal } from 'solid-js';
import type { Diagram } from '../model/types';

export type TextKind = 'title' | 'subtitle' | 'note' | 'footnote' | 'legend' | 'phase';

export const textId = (kind: TextKind, key: string | number = '') =>
  key === '' ? `@${kind}` : `@${kind}:${key}`;

/** The kind and key of a text id; undefined for an object id. */
export function parseTextId(id: string | null | undefined) {
  const m = id?.match(/^@(title|subtitle|note|footnote|legend|phase)(?::(.+))?$/);
  return m ? { kind: m[1] as TextKind, key: m[2] ?? '' } : undefined;
}

/** What the Inspector, undo steps and the editor call each kind. */
export const TEXT_NAMES: Record<TextKind, string> = {
  title: 'title',
  subtitle: 'subtitle',
  note: 'note',
  footnote: 'footnote',
  legend: 'legend row',
  phase: 'phase label',
};

/** The text's current words, or undefined when the id names nothing in `d`. */
export function textValue(d: Diagram, id: string): string | undefined {
  const t = parseTextId(id);
  if (!t) return;
  if (t.kind === 'title' || t.kind === 'subtitle') return d.appearance.heading?.[t.kind] ?? '';
  if (t.kind === 'note') return d.appearance.notes?.[Number(t.key)]?.text;
  if (t.kind === 'footnote') return d.appearance.footnotes?.[Number(t.key)]?.text;
  if (t.kind === 'legend') return d.appearance.legend?.[Number(t.key)]?.label;
  return d.layout.sequence?.phases.find(p => p.id === t.key)?.label;
}

/**
 * Write `value` to the text `id` names. An empty note or legend row is removed; a phase keeps its
 * old label, since a phase needs one.
 */
export function setTextValue(d: Diagram, id: string, value: string) {
  const t = parseTextId(id);
  if (!t) return;
  if (t.kind === 'title' || t.kind === 'subtitle') {
    const heading = (d.appearance.heading ??= {});
    if (value) heading[t.kind] = value;
    else delete heading[t.kind];
    if (t.kind === 'title') d.title = value;
  } else if (t.kind !== 'phase') {
    const list =
        t.kind === 'note'
          ? d.appearance.notes
          : t.kind === 'footnote'
            ? d.appearance.footnotes
            : d.appearance.legend,
      i = Number(t.key);
    if (!list?.[i]) return;
    if (!value) list.splice(i, 1);
    else if (t.kind === 'legend') d.appearance.legend![i].label = value;
    else (list[i] as { text: string }).text = value;
  } else if (value) {
    const phase = d.layout.sequence?.phases.find(p => p.id === t.key);
    if (phase) phase.label = value;
  }
}

/** Remove the text: a note, footnote or legend row goes, a title or subtitle empties; a phase stays. */
export function removeText(d: Diagram, id: string) {
  if (parseTextId(id)?.kind !== 'phase') setTextValue(d, id, '');
}

const [selectedText, setSelectedText] = createRoot(() => createSignal<string | null>(null));

/** The selected canvas text, when text rather than objects is selected. */
export { selectedText, setSelectedText };
