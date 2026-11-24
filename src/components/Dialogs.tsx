import {
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  type JSX,
} from 'solid-js';
import { findGroup, findNode } from '../model/graph';
import type { BuildMode } from '../model/edits';
import { canPickFile, commandEnabled, pickForeignFile, runCommand } from '../state/commands';
import { importForeignText } from '../state/files';
import { detectSource } from '../import/detect';
import { siteUrl } from '../state/launch';
import {
  closeDialog,
  confirmRequest,
  dialog,
  errorMessage,
  quickBuildText,
  showError,
} from '../state/ui';
import { IconButton } from './controls';
import { TimelineSettings } from './timeline/TimelineSettings';
import { ExportDialog } from './ExportDialog';
import { Icon } from './Icon';
import { Palette } from './Palette';
import './dialogs.css';
import { useDiagramSession } from './session-context';

/** The single modal dialog that is open, if any. */
export function Dialogs() {
  return (
    <Switch>
      <Match when={dialog() === 'palette'}>
        <Palette />
      </Match>
      <Match when={dialog() === 'help'}>
        <HelpDialog />
      </Match>
      <Match when={dialog() === 'quick-build'}>
        <QuickBuildDialog />
      </Match>
      <Match when={dialog() === 'import-text'}>
        <ImportTextDialog />
      </Match>
      <Match when={dialog() === 'calendar'}>
        <TimelineSettings />
      </Match>
      <Match when={dialog() === 'export'}>
        <ExportDialog />
      </Match>
      <Match when={dialog() === 'confirm' && confirmRequest()}>
        {request => (
          <Modal
            title={request().title}
            footer={
              <>
                <button type="button" class="button" onClick={closeDialog}>
                  Cancel
                </button>
                <button
                  type="button"
                  class="button primary"
                  onClick={() => {
                    const { onConfirm } = request();
                    closeDialog();
                    onConfirm();
                  }}
                >
                  {request().confirmLabel}
                </button>
              </>
            }
          >
            <p class="confirm-message">{request().message}</p>
          </Modal>
        )}
      </Match>
      <Match when={dialog() === 'error'}>
        <Modal title="Could not open file">
          <p class="error-text">{errorMessage()}</p>
          <p class="hint">The current diagram has not been replaced.</p>
        </Modal>
      </Match>
    </Switch>
  );
}

/** Native modal dialog: traps focus, closes on Escape, and restores focus when it closes. */
export function Modal(props: {
  title: string;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
}) {
  const s = useDiagramSession();
  let el!: HTMLDialogElement;
  const previousFocus = document.activeElement as HTMLElement | null;
  onMount(() => {
    el.tabIndex = -1;
    el.showModal();
    // A dialog opens at rest: Close gets focus only when Tab reaches it. A text field keeps it.
    if (document.activeElement?.matches('.modal-head .button')) el.focus();
  });
  onCleanup(() => {
    if (el.open) el.close();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });
  return (
    <dialog
      ref={el}
      class={`modal ${props.class ?? ''}`}
      aria-label={props.title}
      onCancel={e => {
        e.preventDefault();
        closeDialog();
        queueMicrotask(() => s.setTool('select'));
      }}
    >
      <header class="modal-head">
        <h2>{props.title}</h2>
        <IconButton icon="close" label="Close dialog" onClick={closeDialog} />
      </header>
      <div class="modal-body">{props.children}</div>
      <Show when={props.footer}>
        <footer class="modal-foot">{props.footer}</footer>
      </Show>
    </dialog>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Add box', 'N / double-click'],
  ['Draw box / ellipse / diamond', 'R / O / D'],
  ['Draw text / container', 'T / G'],
  ['Edit / navigate', 'V / H'],
  ['Zoom', 'Wheel / pinch / Cmd drag'],
  ['Pan', 'Drag background / Shift + wheel'],
  ['Pan temporarily', 'Space + drag'],
  ['Marquee / multi-select', 'Shift drag / Shift click'],
  ['Connect (stays active)', 'C'],
  ['Edit label', 'Enter / double-click'],
  ['Next / sibling while typing', 'Tab / Shift Tab'],
  ['Add in a direction', 'Alt + arrow'],
  ['Build from a list', 'B'],
  ['Reroute without moving shapes', 'Alt R'],
  ['Automatic ports on selection', 'Alt Shift R'],
  ['Lock a connection side', 'Alt + port drag'],
  ['Insert step on selected connection', 'Tab'],
  ['Sequence: insert a message after / before', 'Tab / Shift Tab'],
  ['Sequence: move a message up / down', 'Alt ↑ / Alt ↓'],
  ['Add connected box', 'Shift Enter'],
  ['Tidy', 'L'],
  ['Layout timeline', 'Alt T'],
  ['Local layout brush', 'W'],
  ['Brush size (in brush mode)', '[ / ]'],
  ['Restore while brushing', 'Alt + drag'],
  ['One brush dab', 'L in brush mode'],
  ['Lay out again', 'Shift L'],
  ['Layout settings', 'Alt L'],
  ['Compare alternatives', 'Alt E'],
  ['Return to Edit', 'Escape'],
  ['Pin / unpin', 'P'],
  ['Nudge / nudge by 10', 'Arrows / Shift arrows'],
  ['Wrap / ungroup', 'Ctrl/⌘ G / Shift G'],
  ['Duplicate', 'Ctrl/⌘ D'],
  ['Copy / paste', 'Ctrl/⌘ C / V'],
  ['Undo / redo', 'Ctrl/⌘ Z / Shift Z'],
  ['Delete / with children', 'Delete / Shift Delete'],
  ['Fit / 100%', '1 / 0'],
  ['Diagrams in this folder', 'F'],
  ['Find any command', 'Ctrl/⌘ K'],
  ['Go to diagram', 'Ctrl/⌘ P'],
  ['Objects / inspector', '[ / ]'],
  ['Hide / restore panels', '\\'],
  ['Keep container while dragging', 'Alt + drag'],
  ['Save / open diagram', 'Ctrl/⌘ S / O'],
];

function HelpDialog() {
  return (
    <Modal title="Keyboard shortcuts" class="wide">
      <div class="help-links">
        <a class="button small" href={siteUrl('docs')} target="_blank" rel="noopener">
          <Icon name="globe" />
          Docs
        </a>
        <button
          type="button"
          class="button small"
          disabled={!commandEnabled('open-playground')}
          onClick={() => runCommand('open-playground')}
        >
          <Icon name="code" />
          Open in Playground
        </button>
      </div>
      <div class="shortcuts">
        <For each={SHORTCUTS}>
          {([action, keys]) => (
            <div class="shortcut">
              <span>{action}</span>
              <kbd>{keys}</kbd>
            </div>
          )}
        </For>
      </div>
      <div class="help-notes">
        <p>
          <strong>Containers:</strong> resize any edge or corner without moving the contents. Drag
          their header or empty interior to move everything together.
        </p>
        <p>
          <strong>Connections:</strong> C stays active. Click a source, then a target; an empty
          target creates a connected box. Keyboard: select a source, press C, Tab to the target,
          then Enter. Escape returns to Edit.
        </p>
        <p>
          <strong>Layout:</strong> a Manual badge records a hand move; only a pin protects it by
          default. One selected container arranges its contents. Multiple selected siblings arrange
          together. Otherwise L improves everything. Each pass has a movement cap and keeps the
          camera. Rebuild is explicit and previewed.
        </p>
      </div>
    </Modal>
  );
}

const FORMAT_NAMES: Record<string, string> = {
  mermaid: 'Mermaid',
  dot: 'Graphviz DOT',
  d2: 'D2',
};

/** One click fills an empty dialog, so a first visit can see what an import does. */
const IMPORT_SAMPLES: [string, string][] = [
  [
    'Mermaid flowchart',
    'flowchart LR\n  web[Web app] -->|HTTPS| api[API]\n  api --> auth[Auth]\n  api --> cache{Cached?}\n  cache -->|no| db[(Orders DB)]\n  subgraph backend [Backend]\n    api\n    auth\n    cache\n    db\n  end',
  ],
  [
    'Mermaid sequence',
    'sequenceDiagram\n  participant B as Browser\n  participant A as API\n  B->>A: POST /orders\n  A-->>B: 201 Created',
  ],
  ['Graphviz DOT', 'digraph G {\n  rankdir=LR\n  cart -> api [label="submit"]\n  api -> db\n}'],
];

interface ImportPreview {
  svg: string;
  notes: string[];
  error: string;
}

/** The import and its drawing, without opening anything. */
async function previewImport(text: string, name: string): Promise<ImportPreview> {
  try {
    const { importBrowser } = await import('../import/browser');
    const result = await importBrowser(text, name);
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    const notes = result.diagnostics.filter(d => d.severity === 'warning').map(d => d.message);
    if (!result.nativeSource || errors.length)
      return { svg: '', notes, error: errors[0]?.message ?? 'This text did not import.' };
    const { renderWithScene } = await import('../runtime/render');
    const { result: drawn } = await renderWithScene(result.nativeSource);
    return { svg: drawn.ok ? drawn.value.svg : '', notes, error: '' };
  } catch (error) {
    return { svg: '', notes: [], error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Paste Mermaid, DOT or D2 text, or pick a file, and open it as a new diagram. The drawing and
 * what the import changes show beside the text as you paste, so opening needs no second review.
 */
function ImportTextDialog() {
  const [text, setText] = createSignal('');
  // D2 has no signature, so plain text is read as D2 only when the importer is asked to.
  const format = () => {
    const found = detectSource(text().trim());
    if (found.status === 'choose-fence') return { error: 'Paste one diagram at a time.' };
    if (found.status !== 'detected') return { name: 'D2', format: 'd2' };
    if (found.format === 'native') return { error: 'This is draftably source. Open it instead.' };
    const name = FORMAT_NAMES[found.format];
    return name
      ? { name, format: found.format }
      : { error: `${found.format} import is not supported yet.` };
  };
  const fileName = () => (format().format === 'd2' ? 'pasted.d2' : '');
  const [preview, setPreview] = createSignal<ImportPreview | null>(null);
  const [busy, setBusy] = createSignal(false);
  let run = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const source = text().trim();
    const f = format();
    clearTimeout(timer);
    const mine = ++run;
    if (!source || f.error) {
      setPreview(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    timer = setTimeout(async () => {
      const out = await previewImport(source, fileName());
      if (mine !== run) return;
      setPreview(out);
      setBusy(false);
    }, 250);
  });
  onCleanup(() => clearTimeout(timer));

  const status = () => {
    if (!text().trim()) return 'Paste Mermaid, DOT or D2 text, or try a sample.';
    const f = format();
    if (f.error) return f.error;
    const p = preview();
    if (busy() && !p) return `Reading as ${f.name}…`;
    if (p?.error) return p.error;
    return `Reads as ${f.name}.`;
  };
  const ready = () => !!text().trim() && !format().error && !!preview()?.svg && !busy();
  const run_ = () => {
    if (!ready()) return;
    const source = text().trim();
    closeDialog();
    void importForeignText(source, fileName(), { reviewed: true }).catch(error =>
      showError(error instanceof Error ? error.message : String(error)),
    );
  };
  return (
    <Modal
      title="Import text diagram"
      class="wide import-dialog"
      footer={
        <>
          <Show when={canPickFile()}>
            <button
              type="button"
              class="button import-file"
              onClick={() => {
                closeDialog();
                pickForeignFile();
              }}
            >
              Choose a file…
            </button>
          </Show>
          <button type="button" class="button" onClick={closeDialog}>
            Cancel
          </button>
          <button type="button" class="button primary" disabled={!ready()} onClick={run_}>
            Open as new draft
          </button>
        </>
      }
    >
      <div
        class="import-grid"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            run_();
          }
        }}
      >
        <label class="field import-source">
          <span class="field-label">Diagram text</span>
          <textarea
            autofocus
            class="import-text"
            spellcheck={false}
            value={text()}
            onInput={e => setText(e.currentTarget.value)}
            placeholder={'flowchart LR\n  A[Cart] -->|submit| B[API]\n  B --> C[Database]'}
          />
          <span class="import-samples">
            <span>Try</span>
            <For each={IMPORT_SAMPLES}>
              {([label, sample]) => (
                <button type="button" class="link-button" onClick={() => setText(sample)}>
                  {label}
                </button>
              )}
            </For>
          </span>
        </label>
        <div class="import-result">
          <span class="field-label">Draftably draws</span>
          <div class="import-preview" classList={{ 'is-busy': busy() }}>
            <Show
              when={preview()?.svg}
              fallback={
                <p
                  class="hint"
                  classList={{ 'error-text': !!format().error || !!preview()?.error }}
                >
                  {status()}
                </p>
              }
            >
              {/* eslint-disable-next-line solid/no-innerhtml -- our own renderer's SVG */}
              {svg => <div class="import-svg" innerHTML={svg()} />}
            </Show>
          </div>
          <div class="import-notes">
            <Show
              when={preview()?.svg}
              fallback={<p class="hint">It opens as a new draft. This diagram stays as it is.</p>}
            >
              <Show
                when={preview()!.notes.length}
                fallback={<p class="hint">{status()} The import keeps every detail.</p>}
              >
                <p class="hint">
                  {status()} The import changes {preview()!.notes.length}{' '}
                  {preview()!.notes.length === 1 ? 'detail' : 'details'}:
                </p>
                <ul>
                  <For each={preview()!.notes}>{n => <li>{n}</li>}</For>
                </ul>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function QuickBuildDialog() {
  const s = useDiagramSession();
  const source = s.selectedIds().find(id => findNode(s.doc, id));
  const container = s.selectedIds().find(id => findGroup(s.doc, id));
  const [text, setText] = createSignal(quickBuildText());
  const [mode, setMode] = createSignal<BuildMode>('chain');
  const [title, setTitle] = createSignal('');
  const [continueFrom, setContinueFrom] = createSignal(true);
  const [error, setError] = createSignal('');

  const build = () => {
    const lines = text()
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!lines.length || lines.length > 60) {
      setError('Enter between 1 and 60 nonempty titles.');
      return;
    }
    closeDialog();
    s.buildFromList(lines, {
      mode: mode(),
      title: title().trim(),
      source: continueFrom() ? source : null,
      parentId: container,
    });
  };

  return (
    <Modal
      title="Build from a list"
      footer={
        <>
          <button type="button" class="button" onClick={closeDialog}>
            Cancel
          </button>
          <button type="button" class="button primary" onClick={build}>
            Build diagram
          </button>
        </>
      }
    >
      <div
        class="stack"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            build();
          }
        }}
      >
        <p class="hint">
          One title per line. Add a connected flow or several branches in one action.
        </p>
        <label class="field">
          <span class="field-label">Shape titles</span>
          <textarea
            autofocus
            class="quick-lines"
            rows={9}
            value={text()}
            onInput={e => setText(e.currentTarget.value)}
            placeholder={'Receive request\nCheck details\nApprove\nPublish'}
          />
        </label>
        <div class="fields-2">
          <label class="field">
            <span class="field-label">Connections</span>
            <select value={mode()} onChange={e => setMode(e.currentTarget.value as BuildMode)}>
              <option value="chain">Sequential flow</option>
              <option value="branches">Branches from first shape</option>
              <option value="none">Unconnected shapes</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Container title (optional)</span>
            <input
              value={title()}
              onInput={e => setTitle(e.currentTarget.value)}
              placeholder="e.g. Review"
            />
          </label>
        </div>
        <Show when={source}>
          {id => (
            <label class="checkbox">
              <input
                type="checkbox"
                checked={continueFrom()}
                onChange={e => setContinueFrom(e.currentTarget.checked)}
              />
              <span>Continue from {findNode(s.doc, id())?.title}</span>
            </label>
          )}
        </Show>
        <Show when={!source && container}>
          {id => <p class="hint">New shapes go inside {findGroup(s.doc, id())?.title}.</p>}
        </Show>
        <p class="hint" classList={{ 'error-text': !!error() }}>
          {error() ||
            'Up to 60 titles. Ctrl / Cmd + Enter builds the diagram. One undo restores the starting point.'}
        </p>
      </div>
    </Modal>
  );
}
