import { createSignal, For, Show } from 'solid-js';
import { ancestors, childrenOf, isGroup, styleOf } from '../model/graph';
import { doc, selectItems, selection } from '../state/document';
import { centerSelection } from '../state/editor';
import { setObjectsOpen } from '../state/ui';
import { IconButton } from './controls';
import { Icon } from './Icon';

interface Row {
  id: string;
  title: string;
  depth: number;
  container: boolean;
}

/** Searchable tree of shapes and containers. */
export function ObjectsPanel() {
  const [query, setQuery] = createSignal('');
  const [closed, setClosed] = createSignal<ReadonlySet<string>>(new Set());

  const rows = () => {
    const q = query().trim().toLowerCase(),
      out: Row[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const n of childrenOf(doc, parent)) {
        const container = isGroup(doc, n.id),
          hidden = ancestors(doc, n.id).some(id => closed().has(id));
        if (hidden && !q) continue;
        if (!q || n.title.toLowerCase().includes(q))
          out.push({ id: n.id, title: n.title, depth, container });
        if (container) walk(n.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  };

  const toggle = (id: string) =>
    setClosed(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside class="panel objects-panel" aria-label="Objects">
      <header class="panel-header">
        <h2>
          Objects <span class="count">{doc.graph.nodes.length + doc.graph.groups.length}</span>
        </h2>
        <IconButton
          icon="close"
          label="Close objects"
          keys="["
          onClick={() => setObjectsOpen(false)}
        />
      </header>
      <div class="panel-search">
        <input
          type="search"
          aria-label="Find an object"
          placeholder="Find an object…"
          value={query()}
          onInput={e => setQuery(e.currentTarget.value)}
        />
      </div>
      <div class="panel-scroll object-tree" role="tree">
        <For each={rows()} fallback={<p class="hint empty">No matching objects.</p>}>
          {row => (
            <div
              class="tree-row"
              classList={{ active: selection().has(row.id) }}
              style={{ 'padding-left': `${row.depth * 14}px` }}
              role="treeitem"
              aria-selected={selection().has(row.id)}
            >
              <Show when={row.container} fallback={<span class="tree-spacer" />}>
                <button
                  type="button"
                  class="tree-toggle"
                  aria-label={`${closed().has(row.id) ? 'Expand' : 'Collapse'} list for ${row.title}`}
                  onClick={() => toggle(row.id)}
                >
                  <Icon name={closed().has(row.id) ? 'chevron-right' : 'chevron'} />
                </button>
              </Show>
              <button
                type="button"
                class="tree-label"
                title={row.title}
                onClick={e => selectItems([row.id], { add: e.shiftKey, toggle: e.shiftKey })}
                onDblClick={centerSelection}
              >
                <Icon name={row.container ? 'group' : styleOf(doc, row.id).shape} />
                <span>{row.title}</span>
                <Show when={doc.layout.nodes[row.id]?.pinned}>
                  <Icon name="pin" class="icon pin-mark" />
                </Show>
              </button>
            </div>
          )}
        </For>
      </div>
    </aside>
  );
}
