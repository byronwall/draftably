import { createSignal, For, Show } from 'solid-js';
import type { PdfPage } from '../cli/pdf';
import { exportPdf, pdfFiles } from '../state/files';
import { workspace } from '../state/launch';
import { closeDialog } from '../state/ui';
import { IconButton } from './controls';
import { Modal } from './Dialogs';
import { baseName, folderOf } from './workspace-files';
import './export.css';

const PAGES: [PdfPage, string, string][] = [
  ['fit', 'Fit', 'Each page the size of its diagram'],
  ['letter', 'Letter', 'US Letter, turned to each diagram'],
  ['a4', 'A4', 'A4, turned to each diagram'],
  ['slide', 'Slide', '16:9 landscape'],
];

/**
 * One PDF of a set of diagrams, as `draftably pdf` makes it. Every diagram in the folder is listed;
 * the checked ones print in list order, which the arrows and the sort buttons change.
 */
export function PdfDialog() {
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
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const picked = () => rows().filter(r => r.on);

  const toggle = (path: string, on: boolean) =>
    setRows(rows().map(r => (r.path === path ? { ...r, on } : r)));
  const setAll = (on: boolean) => setRows(rows().map(r => ({ ...r, on })));
  const move = (i: number, by: number) => {
    const next = [...rows()],
      j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };
  /** Checked diagrams first, sorted; the rest keep their order below. */
  const sort = (key: 'path' | 'title') =>
    setRows([
      ...picked().sort((a, b) => a[key].localeCompare(b[key])),
      ...rows().filter(r => !r.on),
    ]);

  const run = async () => {
    setError('');
    setBusy(true);
    try {
      await exportPdf(
        picked().map(r => r.path),
        { page: page(), title: title().trim() || undefined, states: states(), source: source() },
      );
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Export PDF"
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
            disabled={busy() || !picked().length}
            onClick={run}
          >
            {busy() ? 'Exporting…' : `Export ${picked().length} as PDF`}
          </button>
        </>
      }
    >
      <div class="pdf-files">
        <div class="pdf-files-head">
          <span>
            Diagrams{' '}
            <span class="count">
              {picked().length} of {rows().length}
            </span>
          </span>
          <span class="pdf-files-actions">
            <button type="button" class="link-button" onClick={() => setAll(true)}>
              All
            </button>
            <button type="button" class="link-button" onClick={() => setAll(false)}>
              None
            </button>
            <span class="pdf-sort">Sort</span>
            <button type="button" class="link-button" onClick={() => sort('path')}>
              Name
            </button>
            <button type="button" class="link-button" onClick={() => sort('title')}>
              Title
            </button>
          </span>
        </div>
        <ol class="pdf-list">
          <For each={rows()}>
            {(row, i) => (
              <li classList={{ off: !row.on }}>
                <label>
                  <input
                    type="checkbox"
                    checked={row.on}
                    onChange={e => toggle(row.path, e.currentTarget.checked)}
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
                  onClick={() => move(i(), -1)}
                />
                <IconButton
                  icon="up"
                  class="down"
                  label="Move down"
                  disabled={i() === rows().length - 1}
                  onClick={() => move(i(), 1)}
                />
              </li>
            )}
          </For>
        </ol>
      </div>
      <div class="export-options">
        <span class="export-label">Page</span>
        <div class="segmented" role="group" aria-label="Page size">
          <For each={PAGES}>
            {([id, label, hint]) => (
              <button
                type="button"
                title={hint}
                aria-pressed={page() === id}
                onClick={() => setPage(id)}
              >
                {label}
              </button>
            )}
          </For>
        </div>
        <label class="export-label" for="pdf-title">
          Cover
        </label>
        <input
          id="pdf-title"
          placeholder="Title for a cover page with contents (optional)"
          value={title()}
          onInput={e => setTitle(e.currentTarget.value)}
        />
        <span />
        <div class="export-checks">
          <label>
            <input
              type="checkbox"
              checked={states()}
              onChange={e => setStates(e.currentTarget.checked)}
            />
            A page per emphasis state
          </label>
          <label>
            <input
              type="checkbox"
              checked={source()}
              onChange={e => setSource(e.currentTarget.checked)}
            />
            Attach .draft source
          </label>
        </div>
      </div>
    </Modal>
  );
}
