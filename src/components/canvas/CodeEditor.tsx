import { batch, createMemo, createSignal, For, Index, onCleanup, onMount, Show } from 'solid-js';
import { resolveAppearance } from '../../model/appearance';
import { CODE_TAB, CODE_TYPE, codeLines } from '../../model/code';
import { detailInk, drawnSwatch } from '../../model/colors';
import { clamp } from '../../model/geometry';
import { findNode, objectRect } from '../../model/graph';
import {
  alignOf,
  pastedTable,
  readTable,
  tableWidth,
  tsvRows,
  writeTable,
  type Align,
} from '../../model/code-table';
import * as edit from '../../model/code-table-edit';
import { toast } from '../../state/toast';
import { Icon } from '../Icon';
import { useDiagramSession } from '../session-context';

/**
 * The body of a code node, edited on the canvas: a grid of cells for `table=on`, a text box for
 * other code. It opens on double-click or Enter, sits over the node in the node's own colors and
 * mono type, and saves the body, caption and table setting as one undo step.
 */
export function CodeEditor() {
  const s = useDiagramSession();
  // Keyed: another node's editor is a new editor, never this one's draft under a new id.
  return (
    <Show when={s.codeEditId()} keyed>
      {id => <Editor id={id} />}
    </Show>
  );
}

/** Spreadsheet cells, or the rows of a Markdown or psql table, from pasted text. */
const pastedCells = (text: string) => pastedTable(text)?.rows ?? tsvRows(text);

function Editor(props: { id: string }) {
  const s = useDiagramSession();
  // The editor opens on one node and closes before another opens: it reads its id once.
  // eslint-disable-next-line solid/reactivity
  const id = props.id;
  const node = findNode(s.doc, id)!,
    code = node.code!,
    look = resolveAppearance(s.drawnAppearance()),
    swatch = drawnSwatch(s.doc, look, id, 'node'),
    muted = detailInk(look, swatch),
    tab = code.tab ?? CODE_TAB,
    // The body as the file holds it: the text box edits it as it is, tabs and all.
    raw = code.body ?? code.lines;

  /** Text as a table, read as the file would read it: spreadsheet cells, or tabs expanded. */
  const asTable = (lines: string[]) =>
    pastedTable(lines.join('\n')) ?? readTable(codeLines(lines, tab));

  const [table, setTable] = createSignal(!!code.table),
    // The compiler read the table once; the grid edits that read.
    [grid, setGrid] = createSignal(edit.openGrid(code.cells ?? asTable(raw))),
    [text, setText] = createSignal(raw.join('\n')),
    [title, setTitle] = createSignal(node.title),
    [focus, setFocus] = createSignal({ r: 0, c: 0 }),
    [dirty, setDirty] = createSignal(false);
  let box!: HTMLDivElement, area: HTMLTextAreaElement | undefined;

  const rows = () => grid().table.rows,
    width = () => tableWidth(grid().table),
    /** How each column draws now: its chosen alignment, or the one its cells give. */
    align = createMemo(() => alignOf(grid().table)),
    footer = () => edit.gridTable(grid()).footer;
  /** Each column's width in characters: its widest cell, and at least three. */
  const colChars = createMemo(() => {
    const all = rows();
    return Array.from({ length: width() }, (_, c) =>
      Math.max(3, ...all.map(r => (r[c] ?? '').length)),
    );
  });

  /** Apply one grid edit. */
  const change = (fn: (g: edit.Grid) => edit.Grid) =>
    batch(() => {
      setGrid(fn);
      setDirty(true);
    });
  const setCell = (r: number, c: number, value: string) =>
    change(g => edit.setCell(g, r, c, value));

  const inputAt = (r: number, c: number) =>
    box.querySelector<HTMLInputElement>(`input[data-cell="${r}:${c}"]`);
  /** Move to a cell after the grid redraws, with its text selected or the caret at an end. */
  const go = (r: number, c: number, caret: 'all' | 'start' | 'end' = 'all') => {
    setFocus({ r, c });
    queueMicrotask(() => {
      const input = inputAt(r, c);
      if (!input) return;
      input.focus();
      if (caret === 'all') input.select();
      else
        input.setSelectionRange(
          caret === 'end' ? input.value.length : 0,
          caret === 'end' ? input.value.length : 0,
        );
    });
  };

  const addRow = (at = rows().length) => (change(g => edit.addRow(g, at)), at);
  const addColumn = (at = width()) => (change(g => edit.addColumn(g, at)), at);
  const removeRow = () => {
    const { r, c } = focus();
    change(g => edit.removeRow(g, r));
    go(Math.min(r, rows().length - 1), c);
  };
  const removeColumn = () => {
    const { r, c } = focus();
    change(g => edit.removeColumn(g, c));
    go(r, Math.min(c, width() - 1));
  };
  const alignColumn = (a: Align) => {
    const { c } = focus();
    change(g => edit.setAlign(g, c, a));
  };

  /** The grid as body text. */
  const tableBody = () => writeTable(edit.gridTable(grid()));

  /** Switch between the cell grid and plain text, carrying the body across. */
  const toggleTable = () => {
    batch(() => {
      if (table()) setText(tableBody().join('\n'));
      else setGrid(edit.openGrid(asTable(text().split('\n'))));
      setTable(!table());
      setDirty(true);
    });
    // A focus move after the grid or text box draws, not a reactive read.
    // eslint-disable-next-line solid/reactivity
    queueMicrotask(() => (table() ? go(0, 0) : area?.focus()));
  };

  let closed = false;
  /** Close the editor. `refocus`: give the canvas the keyboard; a focus-out save leaves it be. */
  const close = (save: boolean, refocus = true) => {
    if (closed) return;
    // Only a changed body is written; a caption edit leaves the file's body as it is.
    const body = dirty() ? (table() ? tableBody() : text().split('\n')) : undefined;
    closed = true;
    const changed = dirty() || title().trim() !== node.title;
    s.finishCodeEdit(
      id,
      save && changed ? { body, table: table(), title: title().trim() } : undefined,
    );
    if (refocus) s.focusCanvas();
  };

  onMount(() => {
    // A save the session asks for, as from an event handler.
    // eslint-disable-next-line solid/reactivity
    s.onCodeSave(() => close(true));
    if (table()) go(rows().length > 1 ? 1 : 0, 0);
    else {
      area?.focus();
      fitArea();
    }
  });

  const onCellKey = (e: KeyboardEvent, r: number, c: number) => {
    e.stopPropagation();
    if (e.isComposing) return;
    const input = e.currentTarget as HTMLInputElement,
      last = rows().length - 1;
    if (e.key === 'Escape') return (e.preventDefault(), close(false));
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) return (e.preventDefault(), close(true));
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (c > 0) go(r, c - 1);
        else if (r > 0) go(r - 1, width() - 1);
      } else if (c < width() - 1) go(r, c + 1);
      else go(r < last ? r + 1 : addRow(), 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) go(Math.max(0, r - 1), c);
      else go(r < last ? r + 1 : addRow(), c);
    } else if (e.key === 'ArrowUp' && r > 0) {
      e.preventDefault();
      go(r - 1, c, 'end');
    } else if (e.key === 'ArrowDown' && r < last) {
      e.preventDefault();
      go(r + 1, c, 'end');
    } else if (
      e.key === 'ArrowLeft' &&
      c > 0 &&
      input.selectionStart === 0 &&
      input.selectionEnd === 0
    ) {
      e.preventDefault();
      go(r, c - 1, 'end');
    } else if (
      e.key === 'ArrowRight' &&
      c < width() - 1 &&
      input.selectionStart === input.value.length
    ) {
      e.preventDefault();
      go(r, c + 1, 'start');
    } else if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      removeRow();
    }
  };

  /** Pasted cells fill the grid from the cell under the caret, adding rows and columns. */
  const onCellPaste = (e: ClipboardEvent, r: number, c: number) => {
    const pasted = e.clipboardData?.getData('text/plain') ?? '';
    if (!/[\t\n]/.test(pasted.replace(/\n+$/, ''))) return;
    e.preventDefault();
    const cells = pastedCells(pasted);
    change(g => edit.pasteCells(g, r, c, cells));
    toast(`Pasted ${cells.length} row${cells.length === 1 ? '' : 's'}`);
  };

  const fitArea = () => {
    if (!area) return;
    area.style.height = '0px';
    area.style.height = `${area.scrollHeight}px`;
  };

  const onAreaKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.isComposing) return;
    if (e.key === 'Escape') return (e.preventDefault(), close(false));
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) return (e.preventDefault(), close(true));
    if (e.key === 'Tab') {
      // Tab indents, as in a code editor.
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  };

  /** The editor sits on the node at the canvas zoom, but never below the code's own size. */
  const frame = createMemo(() => {
    const k = s.doc.camera.k,
      r = objectRect(s.doc, s.geometry, id),
      { width: sw, height: sh } = s.stageSize(),
      scale = Math.max(k, 1),
      left = r.x * k + s.doc.camera.x,
      top = r.y * k + s.doc.camera.y;
    return {
      left: clamp(left, 8, Math.max(8, sw - 280)),
      top: clamp(top, 52, Math.max(52, sh - 120)),
      minW: r.w * scale,
      scale,
    };
  });

  onCleanup(() => {
    if (!closed) s.onCodeSave(undefined);
  });

  // Keep focus moves inside the editor; leaving it saves, like a title edit.
  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && box.contains(next)) return;
    // eslint-disable-next-line solid/reactivity
    queueMicrotask(() => {
      if (!box.contains((box.getRootNode() as Document | ShadowRoot).activeElement))
        close(true, false);
    });
  };
  const keep = (e: MouseEvent) => e.preventDefault();

  const font = () => ({
    'font-family': CODE_TYPE.family,
    'font-size': `${CODE_TYPE.size * frame().scale}px`,
    'line-height': `${CODE_TYPE.lineHeight * frame().scale}px`,
  });

  return (
    <div
      ref={box}
      class="code-edit"
      role="dialog"
      aria-label={table() ? 'Edit table' : 'Edit code'}
      style={{
        left: `${frame().left}px`,
        top: `${frame().top}px`,
        'min-width': `${frame().minW}px`,
        '--code-fill': swatch.fill,
        '--code-ink': swatch.ink,
        '--code-muted': muted,
        '--code-stroke': swatch.stroke,
      }}
      onFocusOut={onFocusOut}
      onPointerDown={e => e.stopPropagation()}
      onDblClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      <div class="code-edit-bar" onMouseDown={keep}>
        <button
          type="button"
          class="code-edit-chip"
          aria-pressed={table()}
          title="Draw the body as a table: line 1 is the header"
          onClick={toggleTable}
        >
          <Icon name="layers" size={13} /> Table
        </button>
        <Show when={table()}>
          <span class="code-edit-rule" />
          <button
            type="button"
            class="code-edit-chip"
            onClick={() => go(addRow(focus().r + 1), focus().c)}
          >
            <Icon name="plus" size={12} /> Row
          </button>
          <button
            type="button"
            class="code-edit-chip"
            onClick={() => go(focus().r, addColumn(focus().c + 1))}
          >
            <Icon name="plus" size={12} /> Column
          </button>
          <span class="code-edit-rule" />
          <div class="code-edit-seg" role="group" aria-label="Column alignment">
            <For each={['left', 'center', 'right'] as Align[]}>
              {a => (
                <button
                  type="button"
                  aria-pressed={width() > 1 && align()[focus().c] === a}
                  disabled={width() < 2}
                  aria-label={`Align column ${a}`}
                  title={`Align column ${a}`}
                  onClick={() => alignColumn(a)}
                >
                  <AlignGlyph align={a} />
                </button>
              )}
            </For>
          </div>
          <span class="code-edit-rule" />
          <button
            type="button"
            class="code-edit-chip"
            disabled={focus().r === 0 || rows().length < 2}
            title="Delete this row (⌘⇧⌫)"
            onClick={removeRow}
          >
            <Icon name="minus" size={12} /> Row
          </button>
          <button
            type="button"
            class="code-edit-chip"
            disabled={width() < 2}
            title="Delete this column"
            onClick={removeColumn}
          >
            <Icon name="minus" size={12} /> Column
          </button>
        </Show>
        <span class="code-edit-grow" />
        <button type="button" class="code-edit-chip" onClick={() => close(false)}>
          Cancel
        </button>
        <button type="button" class="code-edit-chip primary" onClick={() => close(true)}>
          Done
        </button>
      </div>

      <div class="code-edit-face">
        <input
          class="code-edit-caption"
          aria-label="Caption"
          placeholder="Caption"
          value={title()}
          onInput={e => setTitle(e.currentTarget.value)}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape') return (e.preventDefault(), close(false));
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.metaKey || e.ctrlKey) close(true);
              else if (table()) go(0, 0);
              else area?.focus();
            }
          }}
        />
        <Show
          when={table()}
          fallback={
            <textarea
              ref={area}
              class="code-edit-text"
              aria-label="Code"
              spellcheck={false}
              wrap="off"
              value={text()}
              style={font()}
              onInput={e => {
                setText(e.currentTarget.value);
                setDirty(true);
                fitArea();
              }}
              onKeyDown={onAreaKey}
            />
          }
        >
          <table class="code-edit-grid" style={font()}>
            <tbody>
              <Index each={rows()}>
                {(row, r) => (
                  <tr classList={{ head: r === 0 }}>
                    <Show when={code.numbers}>
                      <td class="num">{code.start + r}</td>
                    </Show>
                    <Index each={Array.from({ length: width() })}>
                      {(_, c) => (
                        <td>
                          <input
                            data-cell={`${r}:${c}`}
                            aria-label={
                              r === 0 ? `Header, column ${c + 1}` : `Row ${r}, column ${c + 1}`
                            }
                            spellcheck={false}
                            value={row()[c] ?? ''}
                            classList={{ on: focus().r === r && focus().c === c }}
                            style={{
                              width: `${colChars()[c] + 1}ch`,
                              'text-align': align()[c] ?? 'left',
                            }}
                            onFocus={() => setFocus({ r, c })}
                            onInput={e => setCell(r, c, e.currentTarget.value)}
                            onKeyDown={e => onCellKey(e, r, c)}
                            onPaste={e => onCellPaste(e, r, c)}
                          />
                        </td>
                      )}
                    </Index>
                  </tr>
                )}
              </Index>
            </tbody>
          </table>
          <Show when={footer()}>
            <div class="code-edit-footer" style={font()}>
              {footer()}
            </div>
          </Show>
        </Show>
      </div>

      <div class="code-edit-hint">
        <Show
          when={table()}
          fallback={
            <>
              <kbd>⌘↵</kbd> done · <kbd>Esc</kbd> cancel · turn on <b>Table</b> to edit cells
            </>
          }
        >
          <kbd>Tab</kbd> next cell · <kbd>↵</kbd> next row · paste cells from a spreadsheet ·{' '}
          <kbd>⌘↵</kbd> done · <kbd>Esc</kbd> cancel
        </Show>
      </div>
    </div>
  );
}

/** Three lines aligned left, centred or right: a column's text alignment. */
function AlignGlyph(props: { align: Align }) {
  const x = (w: number) =>
    props.align === 'left' ? 2 : props.align === 'right' ? 14 - w : 8 - w / 2;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d={`M${x(12)} 4h12M${x(7)} 8h7M${x(10)} 12h10`} />
    </svg>
  );
}
