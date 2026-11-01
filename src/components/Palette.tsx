import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { EXAMPLES } from '../model/examples';
import {
  commandEnabled,
  commands,
  runCommand,
  type Command,
  type CommandId,
} from '../state/commands';
import { exampleUrl, fileUrl, go, workspace } from '../state/launch';
import { closeDialog } from '../state/ui';
import { Highlight } from './controls';
import { Icon } from './Icon';
import { baseName, matchFiles } from './workspace-files';

/** Commands that only mean something from a selected object or an open preview. */
const HIDDEN = new Set<CommandId>([
  'insert-step',
  'delete-deep',
  'fit-container',
  'collapse-selected',
  'reverse-edge',
  'reset-route',
  'mark-start',
  'mark-end',
  'layout-accept',
  'layout-discard',
  'layout-preview',
  'layout-checkpoint',
  'layout-restore',
  'replace-image',
  'palette',
]);

interface Row {
  key: string;
  label: string;
  hint?: string;
  keys?: string;
  icon: string;
  run: () => void;
}

const words = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);

function commandRows(query: string): Row[] {
  const wanted = words(query);
  return (Object.entries(commands) as [CommandId, Command][])
    .filter(([id]) => !HIDDEN.has(id) && commandEnabled(id))
    .filter(([, c]) => {
      const text = `${c.label} ${c.hint ?? ''}`.toLowerCase();
      return wanted.every(word => text.includes(word));
    })
    .map(([id, c]) => ({
      key: id,
      label: c.label,
      hint: c.hint,
      keys: c.keys,
      icon: c.icon ?? 'cube',
      run: () => runCommand(id),
    }))
    .sort((a, b) => nameFirst(a.label, wanted) - nameFirst(b.label, wanted));
}

/** Rows that match by name sit above rows that match only in their description. */
const nameFirst = (label: string, wanted: string[]) =>
  wanted.every(word => label.toLowerCase().includes(word)) ? 0 : 1;

function fileRows(query: string): Row[] {
  if (!query.trim()) return [];
  return matchFiles(workspace()?.files ?? [], query).map(file => ({
    key: `file:${file.path}`,
    label: file.title || baseName(file.path),
    hint: file.path,
    icon: 'file',
    run: () => void go(fileUrl(file.path)),
  }));
}

function exampleRows(query: string): Row[] {
  const wanted = words(query);
  if (!wanted.length) return [];
  return EXAMPLES.filter(example =>
    wanted.every(word => `${example.title} example`.toLowerCase().includes(word)),
  ).map(example => ({
    key: `example:${example.id}`,
    label: example.title,
    hint: 'Example, opens a scratch copy',
    icon: 'spark',
    run: () => location.assign(exampleUrl(example.id)),
  }));
}

/** Search every command, the folder's diagrams and the examples, then run one with Enter. */
export function Palette() {
  const [query, setQuery] = createSignal('');
  const [active, setActive] = createSignal(0);
  const rows = createMemo(() => [
    ...fileRows(query()),
    ...commandRows(query()),
    ...exampleRows(query()),
  ]);
  let dialog!: HTMLDialogElement;
  let list!: HTMLDivElement;
  const previousFocus = document.activeElement as HTMLElement | null;

  onMount(() => dialog.showModal());

  const close = () => {
    dialog.close();
    closeDialog();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const run = (row: Row | undefined) => {
    if (!row) return;
    close();
    row.run();
  };
  const move = (by: number) => {
    const count = rows().length;
    if (!count) return;
    const next = (active() + by + count) % count;
    setActive(next);
    list.children[next]?.scrollIntoView({ block: 'nearest' });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(rows()[active()]);
    }
  };

  return (
    <dialog
      ref={dialog}
      class="palette"
      aria-label="Find a command or diagram"
      onCancel={e => {
        e.preventDefault();
        close();
      }}
    >
      <label class="palette-search">
        <Icon name="search" />
        <input
          aria-label="Find a command or diagram"
          placeholder={workspace() ? 'Find a command or diagram' : 'Find a command or example'}
          spellcheck={false}
          value={query()}
          onInput={e => {
            setQuery(e.currentTarget.value);
            setActive(0);
            list.scrollTop = 0;
          }}
          onKeyDown={onKeyDown}
        />
        <kbd>Esc</kbd>
      </label>
      <div ref={list} class="palette-list" role="listbox">
        <For each={rows()} fallback={<p class="hint empty">Nothing matches.</p>}>
          {(row, i) => (
            <button
              type="button"
              class="palette-row"
              classList={{ active: i() === active() }}
              role="option"
              aria-selected={i() === active()}
              onPointerMove={() => setActive(i())}
              onClick={() => run(row)}
            >
              <Icon name={row.icon} />
              <span class="palette-text">
                <span class="palette-label">
                  <Highlight text={row.label} query={query()} />
                </span>
                <Show when={row.hint}>
                  <small>{row.hint}</small>
                </Show>
              </span>
              <Show when={row.keys}>
                <kbd>{row.keys}</kbd>
              </Show>
            </button>
          )}
        </For>
      </div>
    </dialog>
  );
}
