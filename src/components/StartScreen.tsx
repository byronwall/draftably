import { createMemo, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
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
  go,
  launchNotice,
  newDiagramSource,
  refreshWorkspace,
  setStartOpen,
  thumbnailUrl,
  watchWorkspace,
  workspace,
} from '../state/launch';
import type { WorkspaceFile } from '../server/workspace';
import { IconButton } from './controls';
import { FileOrderSwitch, FileTime, FolderHeading } from './FilesPanel';
import { Icon } from './Icon';
import './start.css';
import {
  ago,
  baseName,
  folderOf,
  groupByFolder,
  matchFiles,
  shownOrder,
  sortFiles,
} from './workspace-files';

/**
 * Where a session starts. A served folder with diagrams shows those diagrams and little else; an
 * empty folder or the static site offers a new diagram and the examples. As a page it is the whole
 * screen of `draftably open` without a file; as a dialog it sits over the editor and can be closed.
 */
export function StartScreen(props: { variant: 'page' | 'dialog' }) {
  onMount(() => {
    void refreshWorkspace();
    onCleanup(watchWorkspace());
  });
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
          <h1>Draftably</h1>
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
        <Show
          when={workspace()?.files.length}
          fallback={
            <div class="start-body">
              <div class="start-side">
                <NewDiagram />
                <FolderFiles />
              </div>
              <Examples />
            </div>
          }
        >
          <FolderHome />
        </Show>
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
      await go(fileUrl(created));
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

/**
 * The served folder's diagrams, newest first, as large thumbnails. Typing filters; Enter opens the
 * first match. Examples stay out of the way behind a closed section at the end.
 */
function FolderHome() {
  const [query, setQuery] = createSignal('');
  const [creating, setCreating] = createSignal(false);
  const all = () => workspace()?.files ?? [];
  const files = createMemo(() => sortFiles(matchFiles(all(), query()), shownOrder(all())));
  const byFolder = () => shownOrder(all()) === 'folder';
  return (
    <div class="start-home">
      <div class="start-toolbar">
        <h2>
          Diagrams <span class="count">{workspace()?.files.length}</span>
        </h2>
        <input
          class="start-search"
          type="search"
          placeholder="Find a diagram…"
          aria-label="Find a diagram"
          value={query()}
          ref={el => requestAnimationFrame(() => el.focus())}
          onInput={e => setQuery(e.currentTarget.value)}
          onKeyDown={e => {
            const first = files()[0];
            if (e.key === 'Enter' && first) void go(fileUrl(first.path));
            if (e.key === 'Escape') setQuery('');
          }}
        />
        <FileOrderSwitch />
        <span class="grow" />
        <button
          type="button"
          class="button primary"
          aria-expanded={creating()}
          onClick={() => setCreating(!creating())}
        >
          <Icon name="plus" />
          New diagram
        </button>
      </div>
      <Show when={creating()}>
        <div class="start-new-panel">
          <NewDiagram />
        </div>
      </Show>
      <Show
        when={files().length}
        fallback={<p class="start-hint start-none">No diagram matches “{query()}”.</p>}
      >
        <Show
          when={byFolder()}
          fallback={
            <ul class="start-gallery start-file-grid">
              <For each={files()}>{file => <FileCard file={file} />}</For>
            </ul>
          }
        >
          <For each={groupByFolder(files())}>
            {group => (
              <section class="start-folder">
                <FolderHeading folder={group.folder} />
                <ul class="start-gallery start-file-grid">
                  <For each={group.files}>{file => <FileCard file={file} />}</For>
                </ul>
              </section>
            )}
          </For>
        </Show>
      </Show>
      <details class="start-more-examples">
        <summary>
          Examples <span class="start-hint">Scratch copies for learning the language</span>
        </summary>
        <ExampleGallery />
      </details>
    </div>
  );
}

function FileCard(props: { file: WorkspaceFile }) {
  const [failed, setFailed] = createSignal(false);
  return (
    <li>
      <a class="start-example start-file-card" href={fileUrl(props.file.path)}>
        <span class="start-thumb">
          <Show
            when={!failed()}
            fallback={<span class="start-thumb-note">Not drawn: the file has an error</span>}
          >
            <img
              src={thumbnailUrl(props.file)}
              alt=""
              loading="lazy"
              onError={() => setFailed(true)}
            />
          </Show>
        </span>
        <span class="start-example-title">{props.file.title || baseName(props.file.path)}</span>
        <span class="start-example-meta start-file-meta">
          <span class="start-file-path">
            <Show when={folderOf(props.file.path)}>{folderOf(props.file.path)}/</Show>
            {baseName(props.file.path)}
          </span>
          <FileTime modified={props.file.modified} />
        </span>
      </a>
    </li>
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
      <ExampleGallery />
    </section>
  );
}

const ExampleGallery = () => (
  <ul class="start-gallery">
    <For each={EXAMPLES}>{example => <ExampleCard example={example} />}</For>
  </ul>
);

const nesting = (depth: number) =>
  depth === 0 ? 'Flat' : `${depth} level${depth === 1 ? '' : 's'} deep`;

function ExampleCard(props: { example: ExampleInfo }) {
  // Compiling is async: a file can name a layout engine.
  const [thumbnail] = createResource(
    () => props.example.source,
    async source => {
      try {
        const svg = renderSvg(projectScene(await compile(source)));
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      } catch {
        return '';
      }
    },
  );
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
