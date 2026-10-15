import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { focusCanvas } from '../state/editor';
import { fileSession } from '../state/file-session';
import {
  createDiagramFile,
  fileNameFor,
  fileUrl,
  newDiagramSource,
  startUrl,
  watchWorkspace,
  workspace,
} from '../state/launch';
import { setFilesOpen } from '../state/ui';
import { IconButton } from './controls';
import { Icon } from './Icon';
import {
  ago,
  baseName,
  fileOrder,
  folderOf,
  changedSinceOpen,
  matchFiles,
  setFileOrder,
  sortFiles,
} from './workspace-files';

/**
 * The served folder's diagrams beside the canvas, so moving between files never goes through the
 * start page. Type to filter, arrow keys to move, Enter to open. The list follows the folder.
 */
export function FilesPanel() {
  const [query, setQuery] = createSignal('');
  const [active, setActive] = createSignal(0);
  const [creating, setCreating] = createSignal(false);
  const current = () => fileSession()?.file;
  const files = createMemo(() =>
    sortFiles(matchFiles(workspace()?.files ?? [], query()), fileOrder()),
  );
  let list!: HTMLDivElement;

  onMount(() => {
    onCleanup(watchWorkspace());
    list.querySelector('.file-row.current')?.scrollIntoView({ block: 'center' });
  });

  const go = (path: string) => location.assign(fileUrl(path));
  const move = (by: number) => {
    const count = files().length;
    if (!count) return;
    const next = (active() + by + count) % count;
    setActive(next);
    list.querySelectorAll('.file-row')[next]?.scrollIntoView({ block: 'nearest' });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      const file = files()[active()];
      if (file && query().trim()) go(file.path);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (query()) setQuery('');
      else focusCanvas();
    }
  };

  return (
    <aside class="panel files-panel" aria-label="Diagrams in this folder">
      <header class="panel-header">
        <h2>
          Diagrams <span class="count">{workspace()?.files.length ?? 0}</span>
        </h2>
        <span class="files-header-actions">
          <IconButton icon="plus" label="New diagram" onClick={() => setCreating(true)} />
          <IconButton
            icon="close"
            label="Close diagrams"
            keys="F"
            onClick={() => setFilesOpen(false)}
          />
        </span>
      </header>
      <Show when={creating()}>
        <NewFileRow onDone={() => setCreating(false)} />
      </Show>
      <div class="panel-search files-search">
        <input
          type="search"
          aria-label="Go to diagram"
          placeholder="Go to diagram"
          title="Go to diagram (⌘P)"
          value={query()}
          onInput={e => {
            setQuery(e.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div class="segmented files-order" role="group" aria-label="Order">
          <button
            type="button"
            title="Newest first"
            aria-pressed={fileOrder() === 'recent'}
            onClick={() => setFileOrder('recent')}
          >
            Recent
          </button>
          <button
            type="button"
            title="By path"
            aria-pressed={fileOrder() === 'name'}
            onClick={() => setFileOrder('name')}
          >
            A–Z
          </button>
        </div>
      </div>
      <div class="panel-scroll files-list" ref={list}>
        <For
          each={files()}
          fallback={
            <p class="hint empty">
              {query() ? 'No diagram matches.' : 'No .draft files in this folder yet.'}
            </p>
          }
        >
          {(file, i) => (
            <a
              class="file-row"
              classList={{
                current: file.path === current(),
                active: !!query().trim() && i() === active(),
              }}
              href={fileUrl(file.path)}
              aria-current={file.path === current() ? 'page' : undefined}
              title={file.path}
            >
              <span class="file-row-title">{file.title || baseName(file.path)}</span>
              <span class="file-row-meta">
                <span class="file-row-path">
                  <Show when={folderOf(file.path)}>
                    <span class="file-row-folder">{folderOf(file.path)}/</span>
                  </Show>
                  {baseName(file.path)}
                </span>
                <FileTime modified={file.modified} />
              </span>
            </a>
          )}
        </For>
      </div>
      <a class="panel-footer files-footer" href={startUrl()} title={workspace()?.root}>
        <Icon name="folder" />
        <span class="files-footer-name">All diagrams in {workspace()?.name}</span>
      </a>
    </aside>
  );
}

/**
 * When a file last changed. A change made since this page opened, typically by an agent or the
 * command line, is called out in words rather than only by color.
 */
export function FileTime(props: { modified: number }) {
  return (
    <span class="file-time" classList={{ changed: changedSinceOpen(props.modified) }}>
      {changedSinceOpen(props.modified) ? `Updated ${ago(props.modified)}` : ago(props.modified)}
    </span>
  );
}

/** Name a new diagram and open it. The title comes from the name. */
function NewFileRow(props: { onDone: () => void }) {
  const [name, setName] = createSignal('');
  const [error, setError] = createSignal('');
  const path = () => {
    const typed = name().trim();
    return typed.endsWith('.draft') ? typed : fileNameFor(typed);
  };
  const title = () => {
    const typed = name()
      .trim()
      .replace(/\.draft$/, '');
    return baseName(typed)
      .replace(/[-_]+/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
  };
  const create = async (e: Event) => {
    e.preventDefault();
    setError('');
    try {
      location.assign(fileUrl(await createDiagramFile(path(), newDiagramSource(title()))));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  return (
    <form class="files-new" onSubmit={create}>
      <input
        aria-label="New diagram name"
        placeholder="Name, e.g. Billing flow"
        value={name()}
        ref={el => requestAnimationFrame(() => el.focus())}
        onInput={e => setName(e.currentTarget.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            props.onDone();
          }
        }}
      />
      <span class="files-new-path" classList={{ error: !!error() }} role="alert">
        {error() || (name().trim() ? `Creates ${path()}` : 'Enter to create · Esc to cancel')}
      </span>
    </form>
  );
}
