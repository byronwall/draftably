import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { focusCanvas } from '../state/editor';
import { fileSession } from '../state/file-session';
import {
  createDiagramFile,
  fileNameFor,
  fileUrl,
  go,
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
  type FileOrder,
  folderOf,
  changedSinceOpen,
  hasFolders,
  matchFiles,
  setFileOrder,
  shownOrder,
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
  const all = () => workspace()?.files ?? [];
  const files = createMemo(() => sortFiles(matchFiles(all(), query()), shownOrder(all())));
  const byFolder = () => shownOrder(all()) === 'folder';
  /** In the folder view, a heading opens each folder's run of files. */
  const opensFolder = (i: number) =>
    byFolder() && (i === 0 || folderOf(files()[i - 1].path) !== folderOf(files()[i].path));
  let list!: HTMLDivElement;

  onMount(() => {
    onCleanup(watchWorkspace());
    list.querySelector('.file-row.current')?.scrollIntoView({ block: 'center' });
  });

  const open = (path: string) => void go(fileUrl(path));
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
      if (file && query().trim()) open(file.path);
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
        <FileOrderSwitch class="files-order" />
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
            <>
              <Show when={opensFolder(i())}>
                <FolderHeading folder={folderOf(file.path)} />
              </Show>
              <a
                class="file-row"
                classList={{
                  current: file.path === current(),
                  active: !!query().trim() && i() === active(),
                }}
                href={fileUrl(file.path)}
                aria-current={file.path === current() ? 'page' : undefined}
                title={file.path}
                style={
                  byFolder()
                    ? { '--depth': folderOf(file.path) ? folderOf(file.path).split('/').length : 0 }
                    : undefined
                }
              >
                <span class="file-row-title">{file.title || baseName(file.path)}</span>
                <span class="file-row-meta">
                  <span class="file-row-path">
                    <Show when={!byFolder() && folderOf(file.path)}>
                      <span class="file-row-folder">{folderOf(file.path)}/</span>
                    </Show>
                    {baseName(file.path)}
                  </span>
                  <FileTime modified={file.modified} />
                </span>
              </a>
            </>
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

/** Recent, A–Z, and Folders when any diagram sits in a sub-folder. */
export function FileOrderSwitch(props: { class?: string }) {
  const option = (order: FileOrder, label: string, title: string) => (
    <button
      type="button"
      title={title}
      aria-pressed={shownOrder(workspace()?.files ?? []) === order}
      onClick={() => setFileOrder(order)}
    >
      {label}
    </button>
  );
  return (
    <div class={`segmented ${props.class ?? ''}`} role="group" aria-label="Order">
      {option('recent', 'Recent', 'Newest first')}
      {option('name', 'A–Z', 'By path')}
      <Show when={hasFolders(workspace()?.files ?? [])}>
        {option('folder', 'Folders', 'Grouped by folder')}
      </Show>
    </div>
  );
}

/** A folder's name over its files, indented by its depth. */
export function FolderHeading(props: { folder: string }) {
  const depth = () => (props.folder ? props.folder.split('/').length : 0);
  return (
    <div class="folder-heading" style={{ '--depth': depth() }} role="presentation">
      <Icon name="folder" />
      <span class="folder-heading-name">
        <Show when={depth() > 1}>
          <span class="folder-heading-parent">{folderOf(props.folder)}/</span>
        </Show>
        {props.folder ? baseName(props.folder) : 'Top level'}
      </span>
    </div>
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
      await go(fileUrl(await createDiagramFile(path(), newDiagramSource(title()))));
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
