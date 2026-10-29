import {
  autocompletion,
  closeBrackets,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { lintGutter, setDiagnostics, type Diagnostic as LintDiagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { createEffect, on, onCleanup, onMount } from 'solid-js';
import { COLORS, DSL_SHAPES } from '../../src/dsl/syntax';
import type { Diagnostic } from '../../src/dsl/compile';
import { THEME_IDS } from '../../src/model/appearance';
import { COMMANDS, tokenizeLine, type TokenKind } from '../highlight';

/** What the page can do to the editor. */
export interface EditorApi {
  /** Replace the whole text as one undoable step. */
  replace(text: string): void;
  /** Put the cursor at the start of a line and scroll it into view. */
  goto(line: number): void;
  focus(): void;
}

const marks = new Map<TokenKind, Decoration>();
const markFor = (kind: TokenKind) => {
  let m = marks.get(kind);
  if (!m) marks.set(kind, (m = Decoration.mark({ class: `tok-${kind}` })));
  return m;
};

/** Colors the visible lines with the same tokens the rest of the site uses. */
const tokens = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }
    build(view: EditorView) {
      const out = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to;) {
          const line = view.state.doc.lineAt(pos);
          let at = line.from;
          for (const t of tokenizeLine(line.text)) {
            if (t.kind !== 'space') out.add(at, at + t.text.length, markFor(t.kind));
            at += t.text.length;
          }
          pos = line.to + 1;
        }
      }
      return out.finish();
    }
  },
  { decorations: v => v.decorations },
);

/** Lines whose object is hovered or picked in the drawing. */
const setLinked = StateEffect.define<number[]>();
const linkedLine = Decoration.line({ class: 'cm-linked' });
const linked = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const e of tr.effects) {
      if (!e.is(setLinked)) continue;
      const lines = [...new Set(e.value)]
        .filter(n => n >= 1 && n <= tr.state.doc.lines)
        .sort((a, b) => a - b);
      return Decoration.set(lines.map(n => linkedLine.range(tr.state.doc.line(n).from)));
    }
    return tr.docChanged ? value.map(tr.changes) : value;
  },
  provide: f => EditorView.decorations.from(f),
});

const EDGE_KINDS = ['sync', 'async', 'data'];

/** The nodes and groups the text declares, read from the text so a new one counts at once. */
function declared(text: string) {
  const out: { id: string; label: string; group: boolean }[] = [];
  for (const line of text.split('\n')) {
    const [command, id, label] = tokenizeLine(line).filter(
      t => t.kind !== 'space' && t.kind !== 'mark',
    );
    if (command?.kind !== 'command' || (command.text !== 'node' && command.text !== 'group'))
      continue;
    if (id?.kind !== 'id') continue;
    out.push({
      id: id.text,
      label: label?.kind === 'string' ? label.text.slice(1, -1) : '',
      group: command.text === 'group',
    });
  }
  return out;
}

/** Commands at the start of a line, ids where a statement names objects, and attribute values. */
function completions() {
  return (ctx: CompletionContext) => {
    const word = ctx.matchBefore(/[\w.-]*/);
    if (!word) return null;
    const line = ctx.state.doc.lineAt(ctx.pos);
    const head = line.text.slice(0, word.from - line.from);
    const attr = /([\w-]+)=$/.exec(head)?.[1];
    if (word.from === word.to && !ctx.explicit && !attr) return null;

    const objects = declared(ctx.state.doc.toString()).filter(o => o.id !== word.text);
    const ids = (list: typeof objects): Completion[] =>
      list.map(o => ({ label: o.id, detail: o.label, type: o.group ? 'class' : 'variable' }));
    const words = (list: readonly string[], type: string): Completion[] =>
      list.map(label => ({ label, type }));

    let options: Completion[];
    if (!head.trim() || /^\s*[+~.-]$/.test(head)) options = words(COMMANDS, 'keyword');
    else if (attr === 'in') options = ids(objects.filter(o => o.group));
    else if (attr === 'color') options = words(COLORS, 'constant');
    else if (attr === 'shape') options = words(DSL_SHAPES, 'constant');
    else if (attr === 'kind') options = words(EDGE_KINDS, 'constant');
    else if (attr) return null;
    else if (/^\s*theme\s+$/.test(head)) options = words(THEME_IDS, 'constant');
    else {
      const command = head
        .trim()
        .split(/\s+/)[0]
        .replace(/^[+~.-]/, '');
      // An edge's own id comes first; its ends are objects.
      const args = head.trim().split(/\s+/).length;
      if (command === 'edge' && args >= 2) options = ids(objects);
      else if (
        ['order', 'align', 'near', 'nudge', 'stay', 'pin', 'size', 'layout'].includes(command)
      )
        options = ids(objects);
      else return null;
    }
    return { from: word.from, options, validFor: /^[\w.-]*$/ };
  };
}

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--surface)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '20px', fontVariantLigatures: 'none' },
  '.cm-content': { padding: '10px 0' },
  '.cm-gutters': { backgroundColor: 'var(--surface)', border: 'none', color: '#a3a8b8' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 14px', minWidth: '40px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#f4f5f9' },
  '.cm-linked': { backgroundColor: 'var(--accent-soft)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: '#6650d92e !important',
  },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
  '.cm-tooltip': {
    border: '1px solid var(--line-strong)',
    borderRadius: '6px',
    backgroundColor: 'var(--surface)',
    boxShadow: '0 8px 24px #25213b1f',
    fontFamily: 'var(--font)',
  },
  '.cm-tooltip-autocomplete > ul > li': { padding: '2px 10px', fontFamily: 'var(--mono)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--accent-soft)',
    color: 'var(--text)',
  },
  '.cm-completionDetail': { color: 'var(--muted)', fontStyle: 'normal', marginLeft: '12px' },
  '.cm-diagnostic': { fontFamily: 'var(--font)', fontSize: '12.5px' },
  '.cm-lint-marker': { width: '0.9em', height: '0.9em' },
});

export function CodeEditor(props: {
  value: string;
  onChange: (text: string) => void;
  diagnostics: Diagnostic[];
  linkedLines: number[];
  onCursorLine: (line: number) => void;
  ref: (api: EditorApi) => void;
}) {
  let host!: HTMLDivElement;
  let view: EditorView | undefined;

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: props.value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          closeBrackets(),
          highlightSelectionMatches(),
          lintGutter(),
          autocompletion({ override: [completions()], icons: false }),
          keymap.of([
            ...completionKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          tokens,
          linked,
          theme,
          EditorView.contentAttributes.of({ 'aria-label': 'Diagram source', spellcheck: 'false' }),
          // CodeMirror calls this outside Solid; it reads the latest props each time.
          // eslint-disable-next-line solid/reactivity
          EditorView.updateListener.of(u => {
            if (u.docChanged) props.onChange(u.state.doc.toString());
            if (u.selectionSet || u.docChanged)
              props.onCursorLine(u.state.doc.lineAt(u.state.selection.main.head).number);
          }),
        ],
      }),
    });
    props.ref({
      replace(text) {
        if (!view || text === view.state.doc.toString()) return;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
      },
      goto(line) {
        if (!view) return;
        const at = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines)).from;
        view.dispatch({
          selection: { anchor: at },
          effects: EditorView.scrollIntoView(at, { y: 'center' }),
        });
        view.focus();
      },
      focus: () => view?.focus(),
    });
  });
  onCleanup(() => view?.destroy());

  // Compiler diagnostics become lint marks on their lines.
  createEffect(
    on(
      () => props.diagnostics,
      list => {
        if (!view) return;
        const doc = view.state.doc;
        const marks: LintDiagnostic[] = list
          .filter(d => d.line && d.line <= doc.lines && d.level !== 'info')
          .map(d => {
            const line = doc.line(d.line!);
            return {
              from: line.from,
              to: line.to,
              severity: d.level === 'error' ? 'error' : 'warning',
              message: d.message,
            };
          });
        view.dispatch(setDiagnostics(view.state, marks));
      },
    ),
  );

  createEffect(
    on(
      () => props.linkedLines,
      lines => view?.dispatch({ effects: setLinked.of(lines) }),
    ),
  );

  return <div class="code-editor" ref={host} />;
}
