import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { renderSvg } from '../cli/svg';
import { compile } from '../dsl/compile';
import { projectScene } from '../dsl/project';
import { EXAMPLES, type ExampleInfo } from '../model/examples';
import { newDocument } from '../state/actions';
import {
  createDiagramFile,
  exampleUrl,
  fileNameFor,
  fileUrl,
  launchNotice,
  newDiagramSource,
  refreshWorkspace,
  setStartOpen,
  workspace,
} from '../state/launch';
import { IconButton } from './controls';
import { Icon } from './Icon';
import './start.css';

/**
 * Where a session starts: make a new diagram, open one from the served folder, or try an example.
 * As a page it is the whole screen of `draftably open` without a file; as a dialog it sits over the
 * editor and can be closed.
 */
export function StartScreen(props: { variant: 'page' | 'dialog' }) {
  onMount(() => void refreshWorkspace());
  return (
    <div
      class="start"
      classList={{ 'start-dialog': props.variant === 'dialog' }}
      role={props.variant === 'dialog' ? 'dialog' : undefined}
      aria-modal={props.variant === 'dialog' ? 'true' : undefined}
      aria-label="Start"
    >
      <div class="start-frame">
        <header class="start-header">
          <h1>Diagram Studio</h1>
          <Show
            when={workspace()}
            fallback={<span class="start-where">Browser copy · saved on this device</span>}
          >
            {info => (
              <span class="start-where" title={info().root}>
                <Icon name="folder" />
                {info().root}
              </span>
            )}
          </Show>
          <span class="grow" />
          <Show when={props.variant === 'dialog'}>
            <IconButton icon="close" label="Close" onClick={() => setStartOpen(false)} />
          </Show>
        </header>
        <Show when={launchNotice()}>
          <p class="start-notice">{launchNotice()}</p>
        </Show>
        <div class="start-body">
          <div class="start-side">
            <NewDiagram />
            <FolderFiles />
          </div>
          <Examples />
        </div>
      </div>
    </div>
  );
}

function NewDiagram() {
  const [title, setTitle] = createSignal('');
  const [path, setPath] = createSignal('');
  const [pathEdited, setPathEdited] = createSignal(false);
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const shownPath = () => (pathEdited() ? path() : fileNameFor(title()));

  const create = async (e: Event) => {
    e.preventDefault();
    setError('');
    if (!workspace()) {
      newDocument();
      setStartOpen(false);
      return;
    }
    setBusy(true);
    try {
      const created = await createDiagramFile(shownPath().trim(), newDiagramSource(title().trim()));
      location.assign(fileUrl(created));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <section class="start-section">
      <h2>New diagram</h2>
      <Show
        when={workspace()}
        fallback={
          <form class="start-new" onSubmit={create}>
            <p class="start-hint">Replaces the diagram kept in this browser. Undo restores it.</p>
            <button type="submit" class="button primary">
              <Icon name="plus" />
              Blank diagram
            </button>
          </form>
        }
      >
        <form class="start-new" onSubmit={create}>
          <label class="start-field">
            <span>Title</span>
            <input
              value={title()}
              placeholder="Untitled diagram"
              onInput={e => setTitle(e.currentTarget.value)}
            />
          </label>
          <label class="start-field">
            <span>File</span>
            <input
              class="mono"
              value={shownPath()}
              spellcheck={false}
              onInput={e => {
                setPathEdited(true);
                setPath(e.currentTarget.value);
              }}
            />
          </label>
          <div class="start-row">
            <button type="submit" class="button primary" disabled={busy() || !shownPath().trim()}>
              <Icon name="plus" />
              Create file
            </button>
            <span class="start-error" role="alert">
              {error()}
            </span>
          </div>
        </form>
      </Show>
    </section>
  );
}

const ago = (ms: number) => {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function FolderFiles() {
  const [filter, setFilter] = createSignal('');
  const files = () => {
    const query = filter().trim().toLowerCase();
    const all = workspace()?.files ?? [];
    return query ? all.filter(f => (f.path + ' ' + f.title).toLowerCase().includes(query)) : all;
  };
  return (
    <section class="start-section start-files">
      <div class="start-section-head">
        <h2>In this folder</h2>
        <Show when={(workspace()?.files.length ?? 0) > 8}>
          <input
            class="start-filter"
            placeholder="Filter"
            aria-label="Filter diagrams"
            value={filter()}
            onInput={e => setFilter(e.currentTarget.value)}
          />
        </Show>
      </div>
      <Show
        when={workspace()}
        fallback={
          <p class="start-hint">
            Run <code>pnpm draftably open</code> in a folder to list and edit its{' '}
            <code>.draft</code> files here.
          </p>
        }
      >
        <Show
          when={files().length}
          fallback={
            <p class="start-hint">No .draft files here yet. Create one or save an example.</p>
          }
        >
          <ul class="start-list">
            <For each={files()}>
              {file => (
                <li>
                  <a class="start-file" href={fileUrl(file.path)}>
                    <Icon name="file" />
                    <span class="start-file-text">
                      <span class="start-file-title">{file.title || file.path}</span>
                      <span class="start-file-path">{file.path}</span>
                    </span>
                    <span class="start-file-time">{ago(file.modified)}</span>
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </section>
  );
}

function Examples() {
  return (
    <section class="start-section start-examples">
      <div class="start-section-head">
        <h2>Examples</h2>
        <span class="start-hint">
          Opens a scratch copy. Nothing is written to disk unless you save it as a file.
        </span>
      </div>
      <ul class="start-gallery">
        <For each={EXAMPLES}>{example => <ExampleCard example={example} />}</For>
      </ul>
    </section>
  );
}

const nesting = (depth: number) =>
  depth === 0 ? 'Flat' : `${depth} level${depth === 1 ? '' : 's'} deep`;

function ExampleCard(props: { example: ExampleInfo }) {
  const thumbnail = createMemo(() => {
    try {
      const svg = renderSvg(projectScene(compile(props.example.source)));
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      return '';
    }
  });
  return (
    <li>
      <a class="start-example" href={exampleUrl(props.example.id)}>
        <span class="start-thumb">
          <Show when={thumbnail()}>
            <img src={thumbnail()} alt="" loading="lazy" />
          </Show>
        </span>
        <span class="start-example-title">{props.example.title}</span>
        <span class="start-example-summary">{props.example.summary}</span>
        <span class="start-example-meta">
          {nesting(props.example.depth)} · {props.example.groups} containers · {props.example.nodes}{' '}
          shapes
        </span>
      </a>
    </li>
  );
}
