import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import type { WorkspaceFile } from '../server/workspace';
import { focusCanvas } from '../state/editor';
import { openPdfExport } from '../state/files';
import { fileSession } from '../state/file-session';
import {
  createDiagramFile,
  fileNameFor,
  fileUrl,
  go,
  newDiagramSource,
  watchWorkspace,
  workspace,
} from '../state/launch';
import { creatingFile, setCreatingFile } from '../state/ui';
import { Highlight, tip } from './controls';
import { Icon } from './Icon';
import {
  ago,
  baseName,
  type FileOrder,
  folderClosed,
  folderOf,
  groupByFolder,
  changedSinceOpen,
  hasFolders,
  matchFiles,
  openFoldersOf,
  parentClosed,
  setFileOrder,
  shortAgo,
  shownOrder,
  sortFiles,
  toggleFolder,
} from './workspace-files';

type Entry = { file: WorkspaceFile } | { folder: string; count: number };

/**
 * The served folder's diagrams beside the canvas, so moving between files never goes through the
 * start page. Type to filter, arrow keys to move, Enter to open. The list follows the folder.
 */
export function FilesPanel() {
  const [query, setQuery] = createSignal('');
  const [active, setActive] = createSignal(0);
  const current = () => fileSession()?.file;
  const all = () => workspace()?.files ?? [];
  const files = createMemo(() => sortFiles(matchFiles(all(), query()), shownOrder(all())));
  const byFolder = () => shownOrder(all()) === 'folder';
  /** What the list draws: in the folder view, a heading over each open folder's files. */
  const entries = createMemo<Entry[]>(() => {
    if (!byFolder()) return files().map(file => ({ file }));
    const searching = !!query().trim();
    return groupByFolder(files()).flatMap(({ folder, files: inFolder }) => {
      if (!searching && parentClosed(folder)) return [];
      const open = searching || !folderClosed(folder);
      return [
        { folder, count: inFolder.length },
        ...(open ? inFolder.map(file => ({ file })) : []),
      ];
    });
  });
  const shown = () => entries().flatMap(entry => ('file' in entry ? [entry.file] : []));
  let list!: HTMLDivElement;

  onMount(() => {
    onCleanup(watchWorkspace());
    if (current()) openFoldersOf(current()!);
    list.querySelector('.file-row.current')?.scrollIntoView({ block: 'center' });
  });

  const open = (path: string) => void go(fileUrl(path));
  const move = (by: number) => {
    const count = shown().length;
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
      const file = shown()[active()];
      if (file && query().trim()) open(file.path);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (query()) setQuery('');
      else focusCanvas();
    }
  };

  return (
    <div class="sidebar-body files-panel" role="tabpanel" aria-label="Diagrams in this folder">
      <Show when={creatingFile()}>
        <NewFileRow onDone={() => setCreatingFile(false)} />
      </Show>
      <div class="panel-search files-search">
        <input
          type="search"
          aria-label="Go to diagram"
          placeholder="Go to diagram"
          value={query()}
          onInput={e => {
            setQuery(e.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <FileOrderSwitch class="files-order" compact />
      </div>
      <div class="panel-scroll files-list" ref={list}>
        <For
          each={entries()}
          fallback={
            <p class="hint empty">
              {query() ? 'No diagram matches.' : 'No .draft files in this folder yet.'}
            </p>
          }
        >
          {entry =>
            'file' in entry ? (
              <a
                class="file-row"
                classList={{
                  current: entry.file.path === current(),
                  active: !!query().trim() && shown()[active()] === entry.file,
                }}
                href={fileUrl(entry.file.path)}
                aria-current={entry.file.path === current() ? 'page' : undefined}
                {...tip(entry.file.title || baseName(entry.file.path), undefined, entry.file.path)}
                style={
                  byFolder()
                    ? { '--depth': folderOf(entry.file.path).split('/').length }
                    : undefined
                }
              >
                <span class="file-row-title">
                  <Highlight text={entry.file.title || baseName(entry.file.path)} query={query()} />
                  <Show when={!byFolder() && folderOf(entry.file.path)}>
                    <small class="file-row-folder">{folderOf(entry.file.path)}</small>
                  </Show>
                </span>
                <FileTime modified={entry.file.modified} short />
              </a>
            ) : (
              <FolderHeading folder={entry.folder} count={entry.count} />
            )
          }
        </For>
        <Show when={query().trim() && files().length}>
          <button
            type="button"
            class="link-button files-export"
            onClick={() => openPdfExport(files().map(f => f.path))}
          >
            Export {files().length === 1 ? 'this diagram' : `these ${files().length} diagrams`} as
            one PDF
          </button>
        </Show>
      </div>
    </div>
  );
}

/** Recent, A–Z, and Folders when any diagram sits in a sub-folder. `compact` shows icons only. */
export function FileOrderSwitch(props: { class?: string; compact?: boolean }) {
  const option = (order: FileOrder, label: string, hint: string, icon: string) => (
    <button
      type="button"
      aria-label={label}
      {...tip(label, undefined, hint)}
      aria-pressed={shownOrder(workspace()?.files ?? []) === order}
      onClick={() => setFileOrder(order)}
    >
      <Show when={props.compact} fallback={label}>
        <Icon name={icon} />
      </Show>
    </button>
  );
  return (
    <div class={`segmented ${props.class ?? ''}`} role="group" aria-label="Order">
      {option('recent', 'Recent', 'Newest first', 'clock')}
      {option('name', 'A–Z', 'By path', 'sort')}
      <Show when={hasFolders(workspace()?.files ?? [])}>
        {option('folder', 'Folders', 'Grouped by folder', 'folder')}
      </Show>
    </div>
  );
}

/** A folder's name over its files, indented by its depth. With a count it folds its files away. */
export function FolderHeading(props: { folder: string; count?: number }) {
  const depth = () => (props.folder ? props.folder.split('/').length : 0);
  const name = (
    <span class="folder-heading-name">
      <Show when={depth() > 1 && props.count === undefined}>
        <span class="folder-heading-parent">{folderOf(props.folder)}/</span>
      </Show>
      {props.folder ? baseName(props.folder) : 'Top level'}
    </span>
  );
  return (
    <Show
      when={props.count !== undefined}
      fallback={
        <div class="folder-heading" style={{ '--depth': depth() }} role="presentation">
          <Icon name="folder" />
          {name}
        </div>
      }
    >
      <button
        type="button"
        class="folder-heading"
        style={{ '--depth': depth() }}
        aria-expanded={!folderClosed(props.folder)}
        onClick={() => toggleFolder(props.folder)}
      >
        <Icon name={folderClosed(props.folder) ? 'chevron-right' : 'chevron'} />
        {name}
        <span class="count">{props.count}</span>
      </button>
    </Show>
  );
}

/**
 * When a file last changed. A change made since this page opened, typically by an agent or the
 * command line, is called out in words rather than only by color.
 */
export function FileTime(props: { modified: number; short?: boolean }) {
  const when = () => (props.short ? shortAgo(props.modified) : ago(props.modified));
  return (
    <span class="file-time" classList={{ changed: changedSinceOpen(props.modified) }}>
      {changedSinceOpen(props.modified) ? `Updated ${when()}` : when()}
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
