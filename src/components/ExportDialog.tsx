import { createMemo, createSignal, For, onCleanup, Show, untrack } from 'solid-js';
import type { PdfPage } from '../cli/pdf';
import { selection } from '../state/document';
import { fileMode } from '../state/file-session';
import {
  copyImage,
  exportDocument,
  exportKind,
  exportLook,
  exportPdf,
  exportSvg,
  pdfFiles,
  setExportKind,
  setExportLook,
  type ExportKind,
} from '../state/files';
import { workspace } from '../state/launch';
import { closeDialog } from '../state/ui';
import { IconButton, tip } from './controls';
import { Modal } from './Dialogs';
import { baseName, folderOf } from './workspace-files';
import './export.css';

const KINDS: [ExportKind, string][] = [
  ['png', 'PNG'],
  ['svg', 'SVG'],
  ['pdf', 'PDF'],
  ['copy', 'Copy'],
];

const PAGES: [PdfPage, string, string][] = [
  ['fit', 'Fit', 'Each page the size of its diagram'],
  ['letter', 'Letter', 'US Letter, turned to each diagram'],
  ['a4', 'A4', 'A4, turned to each diagram'],
  ['slide', 'Slide', '16:9 landscape'],
];

/** A row of mutually exclusive choices. */
function Choice<T extends string | number>(props: {
  label: string;
  value: T;
  options: [T, string, string?][];
  onChange: (value: T) => void;
}) {
  return (
    <div class="segmented" role="group" aria-label={props.label}>
      <For each={props.options}>
        {([id, text, hint]) => (
          <button
            type="button"
            {...(hint ? tip(text, undefined, hint) : {})}
            aria-pressed={props.value === id}
            onClick={() => props.onChange(id)}
          >
            {text}
          </button>
        )}
      </For>
    </div>
  );
}

/**
 * One dialog for every export: PNG, SVG and Copy share the look options (remembered in this
 * browser) and show a preview of exactly what they produce; PDF prints a set of the folder's
 * diagrams as `draftably pdf` does.
 */
export function ExportDialog() {
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const picked = selection().size;
  const [onlySelection, setOnlySelection] = createSignal(picked > 0);
  const pdf = pdfState();

  /** The SVG the chosen look produces, for the preview and its size. */
  const svg = createMemo(() => {
    if (exportKind() === 'pdf') return '';
    const look = exportLook(),
      only = onlySelection();
    return untrack(() => {
      try {
        return exportSvg(look, only);
      } catch {
        return '';
      }
    });
  });
  const preview = createMemo(() => {
    const url = svg() ? URL.createObjectURL(new Blob([svg()], { type: 'image/svg+xml' })) : '';
    onCleanup(() => url && URL.revokeObjectURL(url));
    return url;
  });
  const size = () => {
    const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg()) ?? [];
    if (!w) return '';
    const k = exportKind() === 'svg' ? 1 : exportLook().scale;
    return `${Math.round(+w * k)} × ${Math.round(+h * k)} px`;
  };

  const action = () =>
    exportKind() === 'pdf'
      ? `Export ${pdf.picked().length} as PDF`
      : exportKind() === 'copy'
        ? 'Copy image'
        : `Export ${exportKind().toUpperCase()}`;

  const run = async () => {
    setError('');
    setBusy(true);
    try {
      const kind = exportKind();
      if (kind === 'pdf') await pdf.run();
      else if (kind === 'copy') await copyImage('image', exportLook(), onlySelection());
      else await exportDocument(kind, exportLook(), onlySelection());
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Export"
      class="wide export-dialog"
      footer={
        <>
          <button type="button" class="button" onClick={closeDialog}>
            Cancel
          </button>
          <p class="export-error" role="alert" title={error()}>
            {error()}
          </p>
          <button
            type="button"
            class="button primary"
            disabled={busy() || (exportKind() === 'pdf' && !pdf.picked().length)}
            onClick={run}
          >
            {busy() ? 'Working…' : action()}
          </button>
        </>
      }
    >
      <Choice
        label="Format"
        value={exportKind()}
        options={KINDS.filter(([k]) => k !== 'pdf' || !!workspace())}
        onChange={kind => {
          setError('');
          setExportKind(kind);
        }}
      />
      <Show when={exportKind() !== 'pdf'} fallback={<PdfPanel state={pdf} />}>
        <div class="export-image">
          <div class="export-preview" classList={{ transparent: exportLook().transparent }}>
            <Show when={preview()} fallback={<p class="hint">The canvas is not ready.</p>}>
              <img src={preview()} alt="Preview of the export" />
            </Show>
          </div>
          <div class="export-options">
            <Show when={exportKind() !== 'svg'}>
              <span class="export-label">Scale</span>
              <Choice
                label="Scale"
                value={exportLook().scale}
                options={[
                  [1, '1×'],
                  [2, '2×'],
                  [3, '3×'],
                ]}
                onChange={scale => setExportLook({ scale })}
              />
            </Show>
            <span class="export-label">Background</span>
            <Choice
              label="Background"
              value={exportLook().transparent ? 'none' : 'canvas'}
              options={[
                ['canvas', 'Canvas', 'The theme’s canvas color'],
                ['none', 'Transparent'],
              ]}
              onChange={v => setExportLook({ transparent: v === 'none' })}
            />
            <div class="export-checks">
              <label>
                <input
                  type="checkbox"
                  checked={exportLook().heading}
                  disabled={onlySelection()}
                  onChange={e => setExportLook({ heading: e.currentTarget.checked })}
                />
                Title, subtitle and key
              </label>
              <label classList={{ disabled: !picked }}>
                <input
                  type="checkbox"
                  checked={onlySelection()}
                  disabled={!picked}
                  onChange={e => setOnlySelection(e.currentTarget.checked)}
                />
                {picked
                  ? `Only the selection (${picked} ${picked === 1 ? 'object' : 'objects'})`
                  : 'Only the selection (nothing selected)'}
              </label>
              <Show when={fileMode()}>
                <label>
                  <input
                    type="checkbox"
                    checked={exportLook().source}
                    onChange={e => setExportLook({ source: e.currentTarget.checked })}
                  />
                  Include .draft source
                </label>
              </Show>
            </div>
            <p class="export-size">
              {size()}
              <Show when={exportKind() === 'copy'}>
                <br />
                PNG, SVG, HTML and SVG text in one copy
              </Show>
            </p>
          </div>
        </div>
      </Show>
    </Modal>
  );
}

/**
 * The PDF choices: every diagram in the folder, the checked ones printed in list order, which the
 * arrows and the sort buttons change.
 */
function pdfState() {
  const all = workspace()?.files ?? [],
    chosen = pdfFiles();
  const first = chosen.flatMap(p => all.filter(f => f.path === p));
  const [rows, setRows] = createSignal(
    [...first, ...all.filter(f => !chosen.includes(f.path))].map(f => ({
      path: f.path,
      title: f.title || baseName(f.path),
      on: chosen.includes(f.path),
    })),
  );
  const [page, setPage] = createSignal<PdfPage>('fit');
  const [title, setTitle] = createSignal('');
  const [states, setStates] = createSignal(false);
  const [source, setSource] = createSignal(true);
  const picked = () => rows().filter(r => r.on);
  return {
    rows,
    picked,
    page,
    setPage,
    title,
    setTitle,
    states,
    setStates,
    source,
    setSource,
    toggle: (path: string, on: boolean) =>
      setRows(rows().map(r => (r.path === path ? { ...r, on } : r))),
    setAll: (on: boolean) => setRows(rows().map(r => ({ ...r, on }))),
    move: (i: number, by: number) => {
      const next = [...rows()],
        j = i + by;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j], next[i]];
      setRows(next);
    },
    /** Checked diagrams first, sorted; the rest keep their order below. */
    sort: (key: 'path' | 'title') =>
      setRows([
        ...picked().sort((a, b) => a[key].localeCompare(b[key])),
        ...rows().filter(r => !r.on),
      ]),
    run: () =>
      exportPdf(
        picked().map(r => r.path),
        { page: page(), title: title().trim() || undefined, states: states(), source: source() },
      ),
  };
}

function PdfPanel(props: { state: ReturnType<typeof pdfState> }) {
  // The state object never changes; its signals are what the panel tracks.
  // eslint-disable-next-line solid/reactivity
  const s = props.state;
  return (
    <>
      <div class="pdf-files">
        <div class="pdf-files-head">
          <span>
            Diagrams{' '}
            <span class="count">
              {s.picked().length} of {s.rows().length}
            </span>
          </span>
          <span class="pdf-files-actions">
            <button type="button" class="link-button" onClick={() => s.setAll(true)}>
              All
            </button>
            <button type="button" class="link-button" onClick={() => s.setAll(false)}>
              None
            </button>
            <span class="pdf-sort">Sort</span>
            <button type="button" class="link-button" onClick={() => s.sort('path')}>
              Name
            </button>
            <button type="button" class="link-button" onClick={() => s.sort('title')}>
              Title
            </button>
          </span>
        </div>
        <ol class="pdf-list">
          <For each={s.rows()}>
            {(row, i) => (
              <li classList={{ off: !row.on }}>
                <label>
                  <input
                    type="checkbox"
                    checked={row.on}
                    onChange={e => s.toggle(row.path, e.currentTarget.checked)}
                  />
                  <span class="pdf-row-title">{row.title}</span>
                  <span class="pdf-row-path">
                    <Show when={folderOf(row.path)}>{folderOf(row.path)}/</Show>
                    {baseName(row.path)}
                  </span>
                </label>
                <IconButton
                  icon="up"
                  label="Move up"
                  disabled={i() === 0}
                  onClick={() => s.move(i(), -1)}
                />
                <IconButton
                  icon="up"
                  class="down"
                  label="Move down"
                  disabled={i() === s.rows().length - 1}
                  onClick={() => s.move(i(), 1)}
                />
              </li>
            )}
          </For>
        </ol>
      </div>
      <div class="export-options pdf-options">
        <span class="export-label">Page</span>
        <Choice label="Page size" value={s.page()} options={PAGES} onChange={s.setPage} />
        <label class="export-label" for="pdf-title">
          Cover
        </label>
        <input
          id="pdf-title"
          placeholder="Title for a cover page with contents (optional)"
          value={s.title()}
          onInput={e => s.setTitle(e.currentTarget.value)}
        />
        <span />
        <div class="export-checks row">
          <label>
            <input
              type="checkbox"
              checked={s.states()}
              onChange={e => s.setStates(e.currentTarget.checked)}
            />
            A page per emphasis state
          </label>
          <label>
            <input
              type="checkbox"
              checked={s.source()}
              onChange={e => s.setSource(e.currentTarget.checked)}
            />
            Attach .draft source
          </label>
        </div>
      </div>
    </>
  );
}
